import { describe, expect, it, vi, beforeEach } from "vitest";

const { prisma, sendEmail } = vi.hoisted(() => ({
  prisma: {
    article: { findUnique: vi.fn() },
    reviewer: { findUnique: vi.fn(), findMany: vi.fn() },
    review: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
  sendEmail: vi.fn(),
}));
vi.mock("../../src/config/db.js", () => ({ prisma }));
vi.mock("../../src/lib/email/sendEmail.js", () => ({ sendEmail }));

const { assignReview, submitOwnReview, getReviewById, getManuscriptForReviewer, listReviewers } = await import(
  "../../src/modules/reviewers-reviews/reviewers-reviews.service.js"
);

describe("assignReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.article.findUnique.mockResolvedValue({ id: "article-1", title: "A Study of Something" });
    prisma.reviewer.findUnique.mockResolvedValue({ id: "reviewer-1", name: "Dr. Smith", email: "smith@example.com" });
    prisma.review.create.mockResolvedValue({ id: "review-1", status: "pending" });
  });

  it("rejects assigning a nonexistent manuscript", async () => {
    prisma.article.findUnique.mockResolvedValue(null);
    await expect(assignReview({ manuscriptId: "nope", reviewerId: "reviewer-1" })).rejects.toMatchObject({
      code: "MANUSCRIPT_NOT_FOUND",
    });
    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  it("rejects assigning a nonexistent reviewer", async () => {
    prisma.reviewer.findUnique.mockResolvedValue(null);
    await expect(assignReview({ manuscriptId: "article-1", reviewerId: "nope" })).rejects.toMatchObject({
      code: "REVIEWER_NOT_FOUND",
    });
    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  it("creates the review as pending and emails the reviewer", async () => {
    await assignReview({ manuscriptId: "article-1", reviewerId: "reviewer-1" });
    expect(prisma.review.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "pending" }) }),
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "smith@example.com", template: "review-assigned" }),
    );
  });

  it("still returns the created review even if the notification email fails", async () => {
    sendEmail.mockRejectedValue(new Error("Resend is down"));
    const review = await assignReview({ manuscriptId: "article-1", reviewerId: "reviewer-1" });
    expect(review).toEqual({ id: "review-1", status: "pending" });
  });
});

describe("submitOwnReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.review.findUnique.mockResolvedValue({ id: "review-1", reviewerId: "reviewer-1", manuscriptId: "article-1" });
    prisma.review.update.mockResolvedValue({ id: "review-1", status: "completed", reviewerId: "reviewer-1", manuscriptId: "article-1" });
  });

  it("rejects a review that doesn't exist", async () => {
    prisma.review.findUnique.mockResolvedValue(null);
    await expect(
      submitOwnReview("nope", "reviewer-1", { status: "completed", recommendation: "accept" }),
    ).rejects.toMatchObject({ code: "REVIEW_NOT_FOUND" });
  });

  it("rejects submitting a review that isn't assigned to this reviewer", async () => {
    await expect(
      submitOwnReview("review-1", "someone-else", { status: "completed", recommendation: "accept" }),
    ).rejects.toMatchObject({ code: "NOT_YOUR_REVIEW" });
    expect(prisma.review.update).not.toHaveBeenCalled();
  });

  it("updates the review with the submitted recommendation and sets submittedAt", async () => {
    await submitOwnReview("review-1", "reviewer-1", {
      status: "completed",
      recommendation: "minor_revision",
      comments: "Looks solid overall.",
    });
    expect(prisma.review.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "review-1" },
        data: expect.objectContaining({
          status: "completed",
          recommendation: "minor_revision",
          comments: "Looks solid overall.",
          submittedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("clears recommendation when declining (recommendation is meaningless for a decline)", async () => {
    await submitOwnReview("review-1", "reviewer-1", { status: "declined" });
    expect(prisma.review.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ recommendation: undefined, status: "declined" }) }),
    );
  });
});

describe("getReviewById", () => {
  it("throws REVIEW_NOT_FOUND for a missing review", async () => {
    prisma.review.findUnique.mockResolvedValue(null);
    await expect(getReviewById("nope")).rejects.toMatchObject({ code: "REVIEW_NOT_FOUND" });
  });

  it("returns the review when found", async () => {
    prisma.review.findUnique.mockResolvedValue({ id: "review-1" });
    await expect(getReviewById("review-1")).resolves.toEqual({ id: "review-1" });
  });
});

describe("getManuscriptForReviewer", () => {
  it("rejects when this reviewer has no assignment for the manuscript (no Review row)", async () => {
    prisma.review.findUnique.mockResolvedValue(null);
    await expect(getManuscriptForReviewer("article-1", "reviewer-1")).rejects.toMatchObject({
      code: "MANUSCRIPT_NOT_FOUND",
    });
    expect(prisma.article.findUnique).not.toHaveBeenCalled();
  });

  it("returns only a minimal projection when the reviewer is genuinely assigned", async () => {
    prisma.review.findUnique.mockResolvedValue({ id: "review-1", manuscriptId: "article-1", reviewerId: "reviewer-1" });
    prisma.article.findUnique.mockResolvedValue({
      id: "article-1",
      title: "A Study of Something",
      abstract: "...",
      articleType: "Research Article",
      pdfUrl: "https://r2.example/m.pdf",
      status: "under_review",
    });
    const manuscript = await getManuscriptForReviewer("article-1", "reviewer-1");
    expect(manuscript).toEqual({
      id: "article-1",
      title: "A Study of Something",
      abstract: "...",
      articleType: "Research Article",
      pdfUrl: "https://r2.example/m.pdf",
      status: "under_review",
    });
    // Confirms the narrow select — no full admin shape (e.g. no editors, no authorIds).
    expect(prisma.article.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.objectContaining({ title: true, abstract: true }) }),
    );
  });
});

describe("listReviewers", () => {
  it("includes a real assignedReviewCount derived from the reviews relation", async () => {
    prisma.reviewer.findMany.mockResolvedValue([
      { id: "reviewer-1", name: "Dr. Smith", _count: { reviews: 3 } },
      { id: "reviewer-2", name: "Dr. Jones", _count: { reviews: 0 } },
    ]);
    const reviewers = await listReviewers();
    expect(reviewers).toEqual([
      { id: "reviewer-1", name: "Dr. Smith", assignedReviewCount: 3 },
      { id: "reviewer-2", name: "Dr. Jones", assignedReviewCount: 0 },
    ]);
    // The internal _count shape never leaks to the caller.
    expect(reviewers[0]).not.toHaveProperty("_count");
  });
});
