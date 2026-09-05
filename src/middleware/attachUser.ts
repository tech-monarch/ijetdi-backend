import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/db.js";

/**
 * Runs on every request. If the session carries a userId, loads the real
 * user record fresh from the database (never trusts anything cached in
 * the session/cookie beyond the id) and attaches it as req.user.
 * Downstream middleware/handlers use req.user, never req.session directly.
 */
export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const userId = req.session.userId;
  if (!userId) {
    next();
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    // Session refers to a deleted/nonexistent user — clear it rather
    // than silently proceeding unauthenticated.
    req.session.userId = undefined;
    next();
    return;
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    reviewerId: user.reviewerId,
  };
  next();
}
