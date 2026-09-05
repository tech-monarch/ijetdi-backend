import { Router } from "express";
import { ok } from "../../lib/envelope.js";
import { requirePermission } from "../../middleware/requireAuth.js";
import { validateBody } from "../../middleware/validate.js";
import { volumeCreateSchema, volumeUpdateSchema } from "./volumes.schemas.js";
import * as volumesService from "./volumes.service.js";

export const volumesRouter = Router();
export const volumesAdminRouter = Router();

// GET /api/admin/volumes — Permission: volumes.manage. Flat, unfiltered
// list across every publication — VolumeList.jsx's admin screen needs
// this, unlike the per-publication endpoint below.
volumesAdminRouter.get("/volumes", requirePermission("volumes.manage"), async (_req, res, next) => {
  try {
    ok(res, await volumesService.listVolumesAdmin());
  } catch (err) {
    next(err);
  }
});

// GET /api/publications/:id/volumes — Public.
volumesRouter.get("/publications/:id/volumes", async (req, res, next) => {
  try {
    ok(res, await volumesService.getVolumesByPublicationId(req.params.id));
  } catch (err) {
    next(err);
  }
});

// GET /api/volumes/:id — Public.
volumesRouter.get("/volumes/:id", async (req, res, next) => {
  try {
    ok(res, await volumesService.getVolumeById(req.params.id));
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/volumes — Permission: volumes.manage.
volumesAdminRouter.post(
  "/volumes",
  requirePermission("volumes.manage"),
  validateBody(volumeCreateSchema),
  async (req, res, next) => {
    try {
      ok(res, await volumesService.createVolume(req.body), 201);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/admin/volumes/:id — Permission: volumes.manage.
volumesAdminRouter.patch(
  "/volumes/:id",
  requirePermission("volumes.manage"),
  validateBody(volumeUpdateSchema),
  async (req, res, next) => {
    try {
      ok(res, await volumesService.updateVolume(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);
