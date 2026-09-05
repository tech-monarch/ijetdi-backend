import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { badRequest } from "../lib/envelope.js";

/**
 * Validates req.body against a Zod schema and replaces req.body with the
 * parsed (and thus type-coerced/defaulted) result. Every write endpoint
 * uses this — see docs/API_DOCUMENTATION.md's Validation convention:
 * "No endpoint below should assume the request body it receives has
 * already been validated," since the frontend's own validation is
 * client-side only.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
      next(badRequest("VALIDATION_ERROR", message));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const message = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
      next(badRequest("VALIDATION_ERROR", message));
      return;
    }
    // Store parsed query separately — req.query is a getter-only in newer
    // Express/Node combinations, so mutating it in place is unreliable.
    (req as Request & { validatedQuery?: unknown }).validatedQuery = result.data;
    next();
  };
}
