import { Router } from "express";
import { ok } from "../../lib/envelope.js";
import { requirePermission } from "../../middleware/requireAuth.js";
import { validateBody } from "../../middleware/validate.js";
import { publisherCreateSchema, publisherUpdateSchema } from "./publishers.schemas.js";
import * as publishersService from "./publishers.service.js";

export const publishersRouter = Router();
export const publishersAdminRouter = Router();

// GET /api/publishers — Public.
publishersRouter.get("/publishers", async (_req, res, next) => {
  try {
    ok(res, await publishersService.listPublishers());
  } catch (err) {
    next(err);
  }
});

// GET /api/publishers/:slug — Public.
publishersRouter.get("/publishers/:slug", async (req, res, next) => {
  try {
    ok(res, await publishersService.getPublisherBySlug(req.params.slug));
  } catch (err) {
    next(err);
  }
});

// GET /api/publishers/:id/publications — Public.
publishersRouter.get("/publishers/:id/publications", async (req, res, next) => {
  try {
    ok(res, await publishersService.getPublicationsByPublisherId(req.params.id));
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/publishers/:id — Permission: publishers.manage. Raw record
// by internal id, for the admin edit form's pre-populate fetch (matches the
// pattern in articles.routes.ts's GET /api/admin/articles/:id).
publishersAdminRouter.get("/publishers/:id", requirePermission("publishers.manage"), async (req, res, next) => {
  try {
    ok(res, await publishersService.getPublisherByIdAdmin(req.params.id));
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/publishers — Permission: publishers.manage.
publishersAdminRouter.post(
  "/publishers",
  requirePermission("publishers.manage"),
  validateBody(publisherCreateSchema),
  async (req, res, next) => {
    try {
      ok(res, await publishersService.createPublisher(req.body), 201);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/admin/publishers/:id — Permission: publishers.manage.
publishersAdminRouter.patch(
  "/publishers/:id",
  requirePermission("publishers.manage"),
  validateBody(publisherUpdateSchema),
  async (req, res, next) => {
    try {
      ok(res, await publishersService.updatePublisher(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);
