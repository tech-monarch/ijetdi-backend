import { Router } from "express";
import { ok } from "../../lib/envelope.js";
import { requirePermission } from "../../middleware/requireAuth.js";
import { validateBody } from "../../middleware/validate.js";
import { indexingCreateSchema, indexingUpdateSchema } from "./indexing.schemas.js";
import * as indexingService from "./indexing.service.js";

export const indexingRouter = Router();
export const indexingAdminRouter = Router();

// GET /api/admin/indexing — Permission: indexing.manage. Flat, unfiltered
// list across every publication — IndexingList.jsx's admin screen needs
// this, unlike the per-publication endpoint below.
indexingAdminRouter.get("/indexing", requirePermission("indexing.manage"), async (_req, res, next) => {
  try {
    ok(res, await indexingService.listIndexingAdmin());
  } catch (err) {
    next(err);
  }
});

// GET /api/publications/:id/indexing — Public. Confirmed entries only.
indexingRouter.get("/publications/:id/indexing", async (req, res, next) => {
  try {
    ok(res, await indexingService.getConfirmedIndexingByPublicationId(req.params.id));
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/publications/:id/indexing — Permission: indexing.manage. All statuses.
indexingAdminRouter.get(
  "/publications/:id/indexing",
  requirePermission("indexing.manage"),
  async (req, res, next) => {
    try {
      ok(res, await indexingService.getIndexingByPublicationIdAdmin(req.params.id));
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/admin/indexing/:id — Permission: indexing.manage.
indexingAdminRouter.get("/indexing/:id", requirePermission("indexing.manage"), async (req, res, next) => {
  try {
    ok(res, await indexingService.getIndexingEntryById(req.params.id));
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/indexing — Permission: indexing.manage.
indexingAdminRouter.post(
  "/indexing",
  requirePermission("indexing.manage"),
  validateBody(indexingCreateSchema),
  async (req, res, next) => {
    try {
      ok(res, await indexingService.createIndexingEntry(req.body), 201);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/admin/indexing/:id — Permission: indexing.manage.
indexingAdminRouter.patch(
  "/indexing/:id",
  requirePermission("indexing.manage"),
  validateBody(indexingUpdateSchema),
  async (req, res, next) => {
    try {
      ok(res, await indexingService.updateIndexingEntry(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);
