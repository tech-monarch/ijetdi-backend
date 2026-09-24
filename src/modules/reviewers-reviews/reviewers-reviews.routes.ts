import { Router } from "express";
import { ok } from "../../lib/envelope.js";
import { forbidden, unauthorized } from "../../lib/envelope.js";
import { requirePermission } from "../../middleware/requireAuth.js";
import { validateBody } from "../../middleware/validate.js";
import { camelQuery } from "../../middleware/caseConversion.js";
import {
  reviewerCreateSchema,
  reviewerUpdateSchema,
  reviewListQuerySchema,
  reviewCreateSchema,
  reviewSelfUpdateSchema,
} from "./reviewers-reviews.schemas.js";
import * as reviewersReviewsService from "./reviewers-reviews.service.js";

// Mounted only under /api/admin and /api/reviewer — never /api directly.
export const reviewersAdminRouter = Router();
export const reviewerSelfRouter = Router();

// GET /api/admin/reviewers — Permission: reviewers.manage.
reviewersAdminRouter.get("/reviewers", requirePermission("reviewers.manage"), async (_req, res, next) => {
  try {
    ok(res, await reviewersReviewsService.listReviewers());
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reviewers/:id — Permission: reviewers.manage.
reviewersAdminRouter.get("/reviewers/:id", requirePermission("reviewers.manage"), async (req, res, next) => {
  try {
    ok(res, await reviewersReviewsService.getReviewerById(req.params.id));
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/reviewers — Permission: reviewers.manage.
reviewersAdminRouter.post(
  "/reviewers",
  requirePermission("reviewers.manage"),
  validateBody(reviewerCreateSchema),
  async (req, res, next) => {
    try {
      ok(res, await reviewersReviewsService.createReviewer(req.body), 201);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/admin/reviewers/:id — Permission: reviewers.manage.
reviewersAdminRouter.patch(
  "/reviewers/:id",
  requirePermission("reviewers.manage"),
  validateBody(reviewerUpdateSchema),
  async (req, res, next) => {
    try {
      ok(res, await reviewersReviewsService.updateReviewer(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/admin/reviews — Permission: reviews.manage. (Was reviews.read, which
// the `reviewer` role also holds — that let any reviewer list EVERY review,
// including other reviewers' confidential comments, by calling this route
// directly. reviews.read is deliberately only "my own reviews", served by
// GET /api/reviewer/my-reviews below; reviews.manage is "any reviewer's data",
// matching the frontend's src/auth/permissions.js.)
reviewersAdminRouter.get("/reviews", requirePermission("reviews.manage"), async (req, res, next) => {
  try {
    const query = reviewListQuerySchema.parse(camelQuery(req));
    ok(res, await reviewersReviewsService.listReviews(query));
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reviews/:id — Permission: reviews.manage (see above).
reviewersAdminRouter.get("/reviews/:id", requirePermission("reviews.manage"), async (req, res, next) => {
  try {
    ok(res, await reviewersReviewsService.getReviewById(req.params.id));
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/reviews — assign a reviewer to a manuscript. Permission: reviews.manage.
reviewersAdminRouter.post(
  "/reviews",
  requirePermission("reviews.manage"),
  validateBody(reviewCreateSchema),
  async (req, res, next) => {
    try {
      ok(res, await reviewersReviewsService.assignReview(req.body), 201);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reviewer/my-reviews — Any authenticated reviewer. Scoped to
// req.user.reviewerId from the session — a reviewer can never pass a
// different reviewerId to see someone else's reviews.
reviewerSelfRouter.get("/my-reviews", requirePermission("reviews.read"), async (req, res, next) => {
  try {
    if (!req.user) throw unauthorized();
    if (!req.user.reviewerId) throw forbidden("This account is not linked to a reviewer profile.");
    ok(res, await reviewersReviewsService.listMyReviews(req.user.reviewerId));
  } catch (err) {
    next(err);
  }
});

// GET /api/reviewer/manuscripts/:id — basic manuscript info (title,
// abstract, the manuscript file), only when this reviewer actually has
// an assignment for it — see getManuscriptForReviewer's own comment on
// why this exists as its own narrow endpoint rather than widening the
// admin articles permissions.
reviewerSelfRouter.get("/manuscripts/:id", requirePermission("reviews.read"), async (req, res, next) => {
  try {
    if (!req.user) throw unauthorized();
    if (!req.user.reviewerId) throw forbidden("This account is not linked to a reviewer profile.");
    ok(res, await reviewersReviewsService.getManuscriptForReviewer(req.params.id, req.user.reviewerId));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/reviewer/reviews/:id — a reviewer submits (or declines)
// their own assigned review. Ownership (req.user.reviewerId must match
// the review's reviewerId) is checked both here and again in the service
// — see submitOwnReview's own comment on why it re-checks.
reviewerSelfRouter.patch(
  "/reviews/:id",
  requirePermission("reviews.read"),
  validateBody(reviewSelfUpdateSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw unauthorized();
      if (!req.user.reviewerId) throw forbidden("This account is not linked to a reviewer profile.");
      ok(res, await reviewersReviewsService.submitOwnReview(req.params.id, req.user.reviewerId, req.body));
    } catch (err) {
      next(err);
    }
  },
);
