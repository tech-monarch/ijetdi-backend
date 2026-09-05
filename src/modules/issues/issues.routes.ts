import { Router } from "express";
import { ok } from "../../lib/envelope.js";
import { requirePermission } from "../../middleware/requireAuth.js";
import { validateBody } from "../../middleware/validate.js";
import { issueCreateSchema, issueUpdateSchema } from "./issues.schemas.js";
import * as issuesService from "./issues.service.js";

export const issuesRouter = Router();
export const issuesAdminRouter = Router();

// GET /api/admin/issues — Permission: issues.manage. Flat, unfiltered
// list across every publication/volume — IssueList.jsx's admin screen
// needs this, unlike the per-volume/per-publication endpoints below.
issuesAdminRouter.get("/issues", requirePermission("issues.manage"), async (_req, res, next) => {
  try {
    ok(res, await issuesService.listIssuesAdmin());
  } catch (err) {
    next(err);
  }
});

// GET /api/volumes/:id/issues — Public.
issuesRouter.get("/volumes/:id/issues", async (req, res, next) => {
  try {
    ok(res, await issuesService.getIssuesByVolumeId(req.params.id));
  } catch (err) {
    next(err);
  }
});

// GET /api/publications/:id/issues — Public.
issuesRouter.get("/publications/:id/issues", async (req, res, next) => {
  try {
    ok(res, await issuesService.getIssuesByPublicationId(req.params.id));
  } catch (err) {
    next(err);
  }
});

// GET /api/publications/:id/current-issue — Public. `data: null` (not a
// 404) is a valid response — "no current issue" is a valid state.
issuesRouter.get("/publications/:id/current-issue", async (req, res, next) => {
  try {
    ok(res, await issuesService.getCurrentIssue(req.params.id));
  } catch (err) {
    next(err);
  }
});

// GET /api/issues/:id — Public.
issuesRouter.get("/issues/:id", async (req, res, next) => {
  try {
    ok(res, await issuesService.getIssueById(req.params.id));
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/issues — Permission: issues.manage.
issuesAdminRouter.post(
  "/issues",
  requirePermission("issues.manage"),
  validateBody(issueCreateSchema),
  async (req, res, next) => {
    try {
      ok(res, await issuesService.createIssue(req.body), 201);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/admin/issues/:id — Permission: issues.manage.
issuesAdminRouter.patch(
  "/issues/:id",
  requirePermission("issues.manage"),
  validateBody(issueUpdateSchema),
  async (req, res, next) => {
    try {
      ok(res, await issuesService.updateIssue(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);
