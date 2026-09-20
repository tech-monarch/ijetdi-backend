import { prisma } from "../../config/db.js";
import { badRequest, notFound } from "../../lib/envelope.js";
import { env } from "../../config/env.js";
import { sendEmail } from "../../lib/email/sendEmail.js";
import type { reviewerCreateSchema, reviewerUpdateSchema, reviewCreateSchema, reviewSelfUpdateSchema } from "./reviewers-reviews.schemas.js";
import type { z } from "zod";

// ── Reviewers ───────────────────────────────────────────────────────────

/**
 * Includes a real assigned-review count via Prisma's `_count` — the
 * frontend previously read `assignedManuscriptIds?.length`, a field that
 * never existed on the real Reviewer model (a leftover from the
 * mock-data era's shape) and so silently always rendered 0. Found while
 * rebuilding this area for the real review-assignment workflow, not
 * assumed. (The implicit-any this produces below is the same root cause
 * as every other baseline tsc error in this project — Prisma's client
 * can't regenerate in this sandbox, so its inferred return types aren't
 * available; not a real type-safety gap once `prisma generate` runs for
 * real.)
 */
export async function listReviewers() {
  const reviewers = await prisma.reviewer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { reviews: true } } },
  });
  return reviewers.map(({ _count, ...reviewer }) => ({ ...reviewer, assignedReviewCount: _count.reviews }));
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

/** GET /api/admin/reviews/:id — single review detail, for the admin manuscript view and the reviewer's own submission form. */
export async function getReviewById(id: string) {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw notFound("REVIEW_NOT_FOUND", `Not found: ${id}`);
  return review;
}

/**
 * POST /api/admin/reviews — assign a reviewer to a manuscript. The
 * @@unique([manuscriptId, reviewerId]) constraint means a duplicate
 * assignment surfaces as a clean 409 via errorHandler.ts's existing
 * Prisma P2002 branch — no extra check needed here for that case.
 */
export async function assignReview(data: z.infer<typeof reviewCreateSchema>) {
  const [manuscript, reviewer] = await Promise.all([
    prisma.article.findUnique({ where: { id: data.manuscriptId } }),
    prisma.reviewer.findUnique({ where: { id: data.reviewerId } }),
  ]);
  if (!manuscript) throw badRequest("MANUSCRIPT_NOT_FOUND", "That manuscript doesn't exist.");
  if (!reviewer) throw badRequest("REVIEWER_NOT_FOUND", "That reviewer doesn't exist.");

  const review = await prisma.review.create({
    data: { manuscriptId: data.manuscriptId, reviewerId: data.reviewerId, dueDate: data.dueDate, status: "pending" },
  });

  // Best-effort — the assignment is already saved regardless of whether
  // this email sends (same pattern as every other notification email in
  // this backend).
  try {
    await sendEmail({
      to: reviewer.email,
      template: "review-assigned",
      data: {
        reviewerName: reviewer.name,
        title: manuscript.title,
        dueDate: data.dueDate ? data.dueDate.toISOString().slice(0, 10) : null,
      },
    });
  } catch {
    // Swallow.
  }

  return review;
}

/**
 * PATCH /api/reviewer/reviews/:id — the reviewer's own submission.
 * reviewerId ownership is checked by the caller (route) against
 * req.user.reviewerId before this is ever invoked — this function
 * additionally re-checks it itself rather than trusting the route not to
 * regress, since "a reviewer can only touch their own review" is the
 * entire point of this endpoint existing as a separate, tightly-scoped
 * one from the admin PATCH.
 */
export async function submitOwnReview(id: string, reviewerId: string, data: z.infer<typeof reviewSelfUpdateSchema>) {
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) throw notFound("REVIEW_NOT_FOUND", `Not found: ${id}`);
  if (existing.reviewerId !== reviewerId) {
    throw badRequest("NOT_YOUR_REVIEW", "This review isn't assigned to you.");
  }

  const review = await prisma.review.update({
    where: { id },
    data: {
      recommendation: data.status === "completed" ? data.recommendation : undefined,
      comments: data.comments,
      status: data.status,
      submittedAt: new Date(),
    },
  });

  if (env.EDITOR_NOTIFICATION_EMAIL && data.status === "completed") {
    try {
      const [manuscript, reviewer] = await Promise.all([
        prisma.article.findUnique({ where: { id: review.manuscriptId } }),
        prisma.reviewer.findUnique({ where: { id: review.reviewerId } }),
      ]);
      await sendEmail({
        to: env.EDITOR_NOTIFICATION_EMAIL,
        template: "review-submitted",
        data: {
          reviewerName: reviewer?.name ?? "A reviewer",
          title: manuscript?.title ?? "",
          recommendation: data.recommendation ?? "",
          reviewUrl: `${env.FRONTEND_BASE_URL.replace(/\/$/, "")}/admin/articles/${review.manuscriptId}`,
        },
      });
    } catch {
      // Swallow.
    }
  }

  return review;
}

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

/**
 * GET /api/reviewer/manuscripts/:id — a reviewer needs to see basic
 * manuscript info (title, abstract, the manuscript file) to actually do
 * the review, but has none of articles.read/articles.update — the
 * permissions the admin article endpoints require. Rather than widening
 * those permissions (which would let any reviewer browse every
 * manuscript in the system, not just their own assignments), this is a
 * narrow, purpose-built lookup: only returns anything at all when a
 * Review row proves this reviewer is actually assigned to this
 * manuscript, and returns a minimal projection — not the full admin
 * article shape (no internal editorial notes, no author emails).
 */
export async function getManuscriptForReviewer(manuscriptId: string, reviewerId: string) {
  const assignment = await prisma.review.findUnique({
    where: { manuscriptId_reviewerId: { manuscriptId, reviewerId } },
  });
  if (!assignment) throw notFound("MANUSCRIPT_NOT_FOUND", "Not found, or not assigned to you.");

  const manuscript = await prisma.article.findUnique({
    where: { id: manuscriptId },
    select: { id: true, title: true, abstract: true, articleType: true, pdfUrl: true, status: true },
  });
  if (!manuscript) throw notFound("MANUSCRIPT_NOT_FOUND", "Not found, or not assigned to you.");
  return manuscript;
}
