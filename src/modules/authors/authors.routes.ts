import { Router } from "express";
import { ok } from "../../lib/envelope.js";
import { requirePermission } from "../../middleware/requireAuth.js";
import { validateBody } from "../../middleware/validate.js";
import { authorCreateSchema, authorUpdateSchema } from "./authors.schemas.js";
import * as authorsService from "./authors.service.js";

export const authorsRouter = Router();
export const authorsAdminRouter = Router();

// GET /api/authors — Public.
authorsRouter.get("/authors", async (_req, res, next) => {
  try {
    ok(res, await authorsService.listAuthors());
  } catch (err) {
    next(err);
  }
});

// GET /api/authors/:slug — Public.
authorsRouter.get("/authors/:slug", async (req, res, next) => {
  try {
    ok(res, await authorsService.getAuthorBySlug(req.params.slug));
  } catch (err) {
    next(err);
  }
});

// GET /api/authors/:id/articles — Public. Published articles only.
authorsRouter.get("/authors/:id/articles", async (req, res, next) => {
  try {
    ok(res, await authorsService.getPublishedArticlesByAuthor(req.params.id));
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/authors/:id — Permission: authors.manage. Raw record by
// internal id, for the admin edit form's pre-populate fetch (matches the
// pattern in articles.routes.ts's GET /api/admin/articles/:id).
authorsAdminRouter.get("/authors/:id", requirePermission("authors.manage"), async (req, res, next) => {
  try {
    ok(res, await authorsService.getAuthorByIdAdmin(req.params.id));
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/authors — Permission: authors.manage.
authorsAdminRouter.post(
  "/authors",
  requirePermission("authors.manage"),
  validateBody(authorCreateSchema),
  async (req, res, next) => {
    try {
      ok(res, await authorsService.createAuthor(req.body), 201);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/admin/authors/:id — Permission: authors.manage.
authorsAdminRouter.patch(
  "/authors/:id",
  requirePermission("authors.manage"),
  validateBody(authorUpdateSchema),
  async (req, res, next) => {
    try {
      ok(res, await authorsService.updateAuthor(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);
