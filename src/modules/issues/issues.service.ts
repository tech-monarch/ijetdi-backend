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
 */
async function demoteOtherCurrentIssues(publicationId: string, excludeIssueId?: string) {
  await prisma.issue.updateMany({
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

  return prisma.$transaction(async (tx) => {
    const issue = await tx.issue.create({ data });
    if (issue.status === "current") {
      await tx.issue.updateMany({
        where: { publicationId: issue.publicationId, status: "current", id: { not: issue.id } },
        data: { status: "published" },
      });
    }
    return issue;
  });
}

export async function updateIssue(id: string, data: z.infer<typeof issueUpdateSchema>) {
  const existing = await prisma.issue.findUnique({ where: { id } });
  if (!existing) throw notFound("ISSUE_NOT_FOUND", `Not found: ${id}`);

  const nextVolumeId = data.volumeId ?? existing.volumeId;
  const nextPublicationId = data.publicationId ?? existing.publicationId;
  if (data.volumeId || data.publicationId) {
    await assertVolumePublicationConsistency(nextVolumeId, nextPublicationId);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.issue.update({ where: { id }, data });
    if (data.status === "current") {
      await demoteOtherCurrentIssues(updated.publicationId, updated.id);
    }
    return updated;
  });
}
