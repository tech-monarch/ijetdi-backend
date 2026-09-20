import { Router } from "express";
import { ok } from "../../lib/envelope.js";
import { requirePermission } from "../../middleware/requireAuth.js";
import { validateBody } from "../../middleware/validate.js";
import { userCreateSchema, userUpdateSchema } from "./users.schemas.js";
import * as usersService from "./users.service.js";

// Mounted only under /api/admin. Every route here is gated by
// users.manage — per docs/PERMISSIONS.md, only super_admin holds this
// permission (see lib/permissions.ts's ALL_EXCEPT_USER_MANAGEMENT).
export const usersAdminRouter = Router();

// GET /api/admin/users
usersAdminRouter.get("/users", requirePermission("users.manage"), async (_req, res, next) => {
  try {
    ok(res, await usersService.listUsers());
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users/:id
usersAdminRouter.get("/users/:id", requirePermission("users.manage"), async (req, res, next) => {
  try {
    ok(res, await usersService.getUserById(req.params.id));
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users — see users.service.ts's createUser for why this
// never accepts a password directly.
usersAdminRouter.post(
  "/users",
  requirePermission("users.manage"),
  validateBody(userCreateSchema),
  async (req, res, next) => {
    try {
      ok(res, await usersService.createUser(req.body), 201);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/admin/users/:id
usersAdminRouter.patch(
  "/users/:id",
  requirePermission("users.manage"),
  validateBody(userUpdateSchema),
  async (req, res, next) => {
    try {
      ok(res, await usersService.updateUser(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);
