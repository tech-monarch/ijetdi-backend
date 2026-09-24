import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/db.js";
import { badRequest, notFound } from "../../lib/envelope.js";
import type { issueCreateSchema, issueUpdateSchema } from "./issues.schemas.js";
import type { z } from "zod";

/**
 * Flat, unfiltered admin list across every publication/volume —
 * IssueList.jsx's admin screen needs this (calls issueService.list()
 * with no volume/publication filter). Added alongside the AI Research
 * Assistant work, discovered missing while wiring up the real frontend
 * against this backend.
 */
export function listIssuesAdmin() {
  return prisma.issue.findMany({
    include: { volume: { select: { number: true } } },
    orderBy: [{ publicationId: "asc" }, { publicationDate: "desc" }],
  });
}

export function getIssuesByVolumeId(volumeId: string) {
  return prisma.issue.findMany({
    where: { volumeId },
    include: { volume: { select: { number: true } } },
    orderBy: { number: "desc" },
  });
}

export function getIssuesByPublicationId(publicationId: string) {
  return prisma.issue.findMany({
    where: { publicationId },
    include: { volume: { select: { number: true } } },
    orderBy: { publicationDate: "desc" },
  });
}

export function getCurrentIssue(publicationId: string) {
  return prisma.issue.findFirst({ where: { publicationId, status: "current" } });
}

export async function getIssueById(id: string) {
  const issue = await prisma.issue.findUnique({ where: { id } });
  if (!issue) throw notFound("ISSUE_NOT_FOUND", `Not found: ${id}`);
  return issue;
}

/**
 * docs/DATABASE_SCHEMA.md: "at most one Issue per publication_id may have
 * status = 'current'". Enforced two ways here: this application-level
 * demotion (matching the frontend mock's demoteOtherCurrentIssues()
 * behavior exactly — setting a new current issue silently demotes
 * whichever one previously held that status) AND a partial unique index
 * added by hand in the migration SQL as a hard backstop against races.
 *
 * Two requirements this helper must satisfy, both found by calling the real
 * endpoints against a real database (both createIssue and updateIssue
 * returned 409 DUPLICATE whenever another issue was already current — i.e.
 * every time an editor tried to publish a new "current issue"):
 *  1. It takes the transaction client and runs through it. It used to write
 *     via the global `prisma`, i.e. a different connection, so the demotion
 *     committed independently of the surrounding transaction (not atomic —
 *     a later failure would roll back the issue write but leave the old
 *     current issue already demoted).
 *  2. It must run BEFORE the row that becomes `current` is written. The
 *     unique index is not deferrable, so writing the new current row first
 *     violates it immediately, before any demotion could run.
 */
async function demoteOtherCurrentIssues(
  db: Prisma.TransactionClient,
  publicationId: string,
  excludeIssueId?: string,
) {
  await db.issue.updateMany({
    where: {
      publicationId,
      status: "current",
      ...(excludeIssueId ? { id: { not: excludeIssueId } } : {}),
    },
    data: { status: "published" },
  });
}

async function assertVolumePublicationConsistency(volumeId: string, publicationId: string) {
  const volume = await prisma.volume.findUnique({ where: { id: volumeId } });
  if (!volume) throw badRequest("VALIDATION_ERROR", `Unknown volumeId: ${volumeId}`);
  if (volume.publicationId !== publicationId) {
    throw badRequest(
      "VALIDATION_ERROR",
      "volumeId and publicationId disagree — an Issue's publication_id must match its Volume's publication_id.",
    );
  }
}

export async function createIssue(data: z.infer<typeof issueCreateSchema>) {
  await assertVolumePublicationConsistency(data.volumeId, data.publicationId);

  // See the matching comment in articles.service.ts's createArticle: widened
  // past Prisma's 5s/2s interactive-transaction defaults for the same reason
  // (a remote database, not the local one this was first tested against).
  return prisma.$transaction(
    async (tx) => {
      if (data.status === "current") {
        await demoteOtherCurrentIssues(tx, data.publicationId);
      }
      return tx.issue.create({ data });
    },
    { timeout: 15000, maxWait: 10000 },
  );
}

export async function updateIssue(id: string, data: z.infer<typeof issueUpdateSchema>) {
  const existing = await prisma.issue.findUnique({ where: { id } });
  if (!existing) throw notFound("ISSUE_NOT_FOUND", `Not found: ${id}`);

  const nextVolumeId = data.volumeId ?? existing.volumeId;
  const nextPublicationId = data.publicationId ?? existing.publicationId;
  if (data.volumeId || data.publicationId) {
    await assertVolumePublicationConsistency(nextVolumeId, nextPublicationId);
  }

  return prisma.$transaction(
    async (tx) => {
      // Demote first (see demoteOtherCurrentIssues). Also covers moving an
      // already-current issue to a different publication that has its own current one.
      if ((data.status ?? existing.status) === "current") {
        await demoteOtherCurrentIssues(tx, nextPublicationId, id);
      }
      return tx.issue.update({ where: { id }, data });
    },
    { timeout: 15000, maxWait: 10000 },
  );
}
