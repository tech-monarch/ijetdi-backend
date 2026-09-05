import { Router } from "express";
import { ok } from "../../lib/envelope.js";
import { forbidden, unauthorized } from "../../lib/envelope.js";
import { requirePermission } from "../../middleware/requireAuth.js";
import { validateBody } from "../../middleware/validate.js";
import { camelQuery } from "../../middleware/caseConversion.js";
import { reviewerCreateSchema, reviewerUpdateSchema, reviewListQuerySchema } from "./reviewers-reviews.schemas.js";
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

// GET /api/admin/reviews — Permission: reviews.read.
reviewersAdminRouter.get("/reviews", requirePermission("reviews.read"), async (req, res, next) => {
  try {
    const query = reviewListQuerySchema.parse(camelQuery(req));
    ok(res, await reviewersReviewsService.listReviews(query));
  } catch (err) {
    next(err);
  }
});

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
