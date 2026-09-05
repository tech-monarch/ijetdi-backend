import { Router } from "express";
import { ok, forbidden, unauthorized, badRequest } from "../../lib/envelope.js";
import { roleHasPermission } from "../../lib/permissions.js";
import { validateBody } from "../../middleware/validate.js";
import { publicationCreateSchema, publicationUpdateSchema, archiveOnlySchema } from "./publications.schemas.js";
import { requirePermission } from "../../middleware/requireAuth.js";
import * as publicationsService from "./publications.service.js";

export const publicationsRouter = Router();
export const publicationsAdminRouter = Router();

// GET /api/publications — Public.
publicationsRouter.get("/publications", async (_req, res, next) => {
  try {
    ok(res, await publicationsService.listPublications());
  } catch (err) {
    next(err);
  }
});

// GET /api/publications/:slug — Public. Not currently called by the
// frontend's /publications/:slug route (that's the Article-detail route
// — see docs/DATABASE_SCHEMA.md's "Routing quirk"), but exists for a
// future multi-journal browsing UI.
publicationsRouter.get("/publications/:slug", async (req, res, next) => {
  try {
    ok(res, await publicationsService.getPublicationBySlug(req.params.slug));
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/publications/:id — Permission: publications.update. Raw
// record by internal id, for the admin edit form's pre-populate fetch
// (matches the pattern in articles.routes.ts's GET /api/admin/articles/:id).
publicationsAdminRouter.get("/publications/:id", requirePermission("publications.update"), async (req, res, next) => {
  try {
    ok(res, await publicationsService.getPublicationByIdAdmin(req.params.id));
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/publications — Permission: publications.create.
publicationsAdminRouter.post(
  "/publications",
  requirePermission("publications.create"),
  validateBody(publicationCreateSchema),
  async (req, res, next) => {
    try {
      ok(res, await publicationsService.createPublication(req.body), 201);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/admin/publications/:id — Permission: publications.update
// for a normal edit, OR publications.delete when the body is exactly
// { status: "archived" } (the entire "Archive" action).
publicationsAdminRouter.patch("/publications/:id", async (req, res, next) => {
  try {
    if (!req.user) throw unauthorized();

    const isArchiveOnly = archiveOnlySchema.safeParse(req.body).success;
    const allowed = isArchiveOnly
      ? roleHasPermission(req.user.role, "publications.delete") || roleHasPermission(req.user.role, "publications.update")
      : roleHasPermission(req.user.role, "publications.update");

    if (!allowed) throw forbidden();

    const parsed = publicationUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
      throw badRequest("VALIDATION_ERROR", message);
    }

    ok(res, await publicationsService.updatePublication(req.params.id, parsed.data));
  } catch (err) {
    next(err);
  }
});
