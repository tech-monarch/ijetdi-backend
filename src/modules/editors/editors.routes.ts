import { Router } from "express";
import { ok } from "../../lib/envelope.js";
import { requirePermission } from "../../middleware/requireAuth.js";
import { validateBody } from "../../middleware/validate.js";
import { editorCreateSchema, editorUpdateSchema } from "./editors.schemas.js";
import * as editorsService from "./editors.service.js";

export const editorsRouter = Router();
export const editorsAdminRouter = Router();

// GET /api/admin/editors — Permission: editors.manage. Flat, unfiltered
// list across every publication — EditorList.jsx's admin screen needs
// this (calls editorService.list() with no publication filter), unlike
// the per-publication endpoints below which require a publication to
// already be selected.
editorsAdminRouter.get("/editors", requirePermission("editors.manage"), async (_req, res, next) => {
  try {
    ok(res, await editorsService.listEditorsAdmin());
  } catch (err) {
    next(err);
  }
});

// GET /api/publications/:id/editorial-board — Public. Active editors only.
// Path matches docs/API_DOCUMENTATION.md's documented contract.
editorsRouter.get("/publications/:id/editorial-board", async (req, res, next) => {
  try {
    ok(res, await editorsService.getEditorsByPublicationId(req.params.id));
  } catch (err) {
    next(err);
  }
});

// GET /api/editors/:slug — Public.
editorsRouter.get("/editors/:slug", async (req, res, next) => {
  try {
    ok(res, await editorsService.getEditorBySlug(req.params.slug));
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/publications/:id/editorial-board — Permission: editors.manage. All statuses.
editorsAdminRouter.get(
  "/publications/:id/editorial-board",
  requirePermission("editors.manage"),
  async (req, res, next) => {
    try {
      ok(res, await editorsService.getEditorsByPublicationIdAdmin(req.params.id));
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/admin/editors/:id — Permission: editors.manage. Raw record by
// internal id, for the admin edit form's pre-populate fetch (matches the
// pattern in articles.routes.ts's GET /api/admin/articles/:id).
editorsAdminRouter.get("/editors/:id", requirePermission("editors.manage"), async (req, res, next) => {
  try {
    ok(res, await editorsService.getEditorByIdAdmin(req.params.id));
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/editors — Permission: editors.manage.
editorsAdminRouter.post(
  "/editors",
  requirePermission("editors.manage"),
  validateBody(editorCreateSchema),
  async (req, res, next) => {
    try {
      ok(res, await editorsService.createEditor(req.body), 201);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/admin/editors/:id — Permission: editors.manage.
editorsAdminRouter.patch(
  "/editors/:id",
  requirePermission("editors.manage"),
  validateBody(editorUpdateSchema),
  async (req, res, next) => {
    try {
      ok(res, await editorsService.updateEditor(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);
