import type { NextFunction, Request, Response } from "express";
import { forbidden, unauthorized } from "../lib/envelope.js";
import { roleHasPermission, type Permission } from "../lib/permissions.js";

/** Requires any logged-in user, regardless of role/permissions. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(unauthorized());
    return;
  }
  next();
}

/**
 * Requires a logged-in user holding at least one of the given
 * permissions. This is the real, independent, server-side re-check
 * called for throughout docs/PERMISSIONS.md and docs/API_DOCUMENTATION.md
 * — it never trusts anything the client sent, hid, or implied.
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    const hasAny = permissions.some((p) => roleHasPermission(req.user!.role, p));
    if (!hasAny) {
      next(forbidden());
      return;
    }
    next();
  };
}
