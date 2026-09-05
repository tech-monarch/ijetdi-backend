import type { NextFunction, Request, Response } from "express";
import { snakeToCamel } from "../lib/caseConversion.js";

/**
 * Converts req.body's keys from snake_case (the documented JSON
 * convention — see API_DOCUMENTATION.md) to camelCase before it reaches
 * any Zod schema or service function, all of which are written in
 * camelCase to match Prisma's generated client.
 */
export function convertRequestBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    req.body = snakeToCamel(req.body);
  }
  next();
}

/** Returns req.query with keys converted snake_case -> camelCase, for handlers that parse query params themselves. */
export function camelQuery(req: Request): Record<string, unknown> {
  return snakeToCamel(req.query) as Record<string, unknown>;
}
