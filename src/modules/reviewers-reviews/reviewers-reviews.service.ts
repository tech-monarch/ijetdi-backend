import { prisma } from "../../config/db.js";
import { notFound } from "../../lib/envelope.js";
import type { reviewerCreateSchema, reviewerUpdateSchema } from "./reviewers-reviews.schemas.js";
import type { z } from "zod";

// ── Reviewers ───────────────────────────────────────────────────────────

export function listReviewers() {
  return prisma.reviewer.findMany({ orderBy: { name: "asc" } });
}

/** Single reviewer detail — Admin ReviewerDetail.jsx's pre-populate fetch. */
export async function getReviewerById(id: string) {
  const reviewer = await prisma.reviewer.findUnique({ where: { id } });
  if (!reviewer) throw notFound("REVIEWER_NOT_FOUND", `Not found: ${id}`);
  return reviewer;
}

export function createReviewer(data: z.infer<typeof reviewerCreateSchema>) {
  return prisma.reviewer.create({ data });
}

export async function updateReviewer(id: string, data: z.infer<typeof reviewerUpdateSchema>) {
  const existing = await prisma.reviewer.findUnique({ where: { id } });
  if (!existing) throw notFound("REVIEWER_NOT_FOUND", `Not found: ${id}`);
  return prisma.reviewer.update({ where: { id }, data });
}

// ── Reviews ─────────────────────────────────────────────────────────────

export function listReviews(filter: { manuscriptId?: string; reviewerId?: string }) {
  return prisma.review.findMany({
    where: {
      ...(filter.manuscriptId ? { manuscriptId: filter.manuscriptId } : {}),
      ...(filter.reviewerId ? { reviewerId: filter.reviewerId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

/** GET /api/reviewer/my-reviews — reviewerId always comes from the session, never a client-supplied param. */
export function listMyReviews(reviewerId: string) {
  return prisma.review.findMany({ where: { reviewerId }, orderBy: { createdAt: "desc" } });
}
