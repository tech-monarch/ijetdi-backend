import { Router } from "express";
import { ok, okPaginated } from "../../lib/envelope.js";
import { requirePermission } from "../../middleware/requireAuth.js";
import { roleHasPermission } from "../../lib/permissions.js";
import { validateBody } from "../../middleware/validate.js";
import { camelQuery } from "../../middleware/caseConversion.js";
import { badRequest } from "../../lib/envelope.js";
import {
  articleAdminListQuerySchema,
  articleCreateSchema,
  articlePublicListQuerySchema,
  articleUpdateSchema,
  statusUpdateSchema,
} from "./articles.schemas.js";
import * as articlesService from "./articles.service.js";

export const articlesRouter = Router();
export const articlesAdminRouter = Router();

function parseOrThrow<T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: unknown } }, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw badRequest("VALIDATION_ERROR", "Invalid query parameters.");
  }
  return result.data as T;
}

// GET /api/articles — Public. Always filtered to status=published.
articlesRouter.get("/articles", async (req, res, next) => {
  try {
    const query = parseOrThrow(articlePublicListQuerySchema, camelQuery(req));
    const { data, pagination } = await articlesService.listPublished(query);
    if (pagination) {
      okPaginated(res, data, pagination);
    } else {
      ok(res, data);
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/articles/:slug — Public.
articlesRouter.get("/articles/:slug", async (req, res, next) => {
  try {
    ok(res, await articlesService.getPublishedBySlug(req.params.slug));
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/articles — Permission: articles.read.
articlesAdminRouter.get("/articles", requirePermission("articles.read"), async (req, res, next) => {
  try {
    const query = parseOrThrow(articleAdminListQuerySchema, camelQuery(req));
    const { data, pagination } = await articlesService.listAdmin(query);
    okPaginated(res, data, pagination);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/articles/:id — Permission: articles.update.
articlesAdminRouter.get("/articles/:id", requirePermission("articles.update"), async (req, res, next) => {
  try {
    ok(res, await articlesService.getAdminById(req.params.id));
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/articles — Permission: articles.create.
articlesAdminRouter.post(
  "/articles",
  requirePermission("articles.create"),
  validateBody(articleCreateSchema),
  async (req, res, next) => {
    try {
      ok(res, await articlesService.createArticle(req.body), 201);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/admin/articles/:id — Permission: articles.update. A `status` in
// the body that differs from the stored one is treated as a status change:
// it additionally requires articles.publish and must be a legal transition
// (same rules as PATCH .../status below).
articlesAdminRouter.patch(
  "/articles/:id",
  requirePermission("articles.update"),
  validateBody(articleUpdateSchema),
  async (req, res, next) => {
    try {
      ok(
        res,
        await articlesService.updateArticle(req.params.id, req.body, {
          canPublish: roleHasPermission(req.user!.role, "articles.publish"),
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/admin/articles/:id/status — Permission: articles.publish.
// Validates the transition per docs/EDITORIAL_WORKFLOW.md — see
// articles.service.ts's updateStatus().
articlesAdminRouter.patch(
  "/articles/:id/status",
  requirePermission("articles.publish"),
  validateBody(statusUpdateSchema),
  async (req, res, next) => {
    try {
      ok(res, await articlesService.updateStatus(req.params.id, req.body.status));
    } catch (err) {
      next(err);
    }
  },
);
