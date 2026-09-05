import type { Response } from "express";

// Response bodies are camelCase, matching the frontend's native shape
// (every mock data file, service, and component in the frontend repo
// reads fields as camelCase — publicationId, journalSources,
// totalPages, etc. — verified directly against that repo, not assumed).
//
// Previously this ran every response through camelToSnake() to match
// docs/API_DOCUMENTATION.md's snake_case query-param spelling. That was
// a free choice (the frontend's apiClient.js has no casing opinion) and
// turned out to be the wrong one: it silently breaks every single page
// on cutover, since every field read in the frontend expects camelCase
// and nothing there converts responses back. Removed.
//
// Request-side conversion (src/middleware/caseConversion.ts's
// convertRequestBody/camelQuery, still snake_case -> camelCase) is left
// in place deliberately, not touched by this fix — it's a harmless
// no-op on already-camelCase input (the underlying snakeToCamel() only
// rewrites keys containing an underscore), so it doesn't need removing
// for this to work, and leaving it keeps snake_case query params
// (?publication_id=...) working if anything ever sends them that way.

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}

export function okPaginated<T>(res: Response, data: T[], pagination: Pagination, status = 200): void {
  res.status(status).json({
    success: true,
    data,
    pagination,
  });
}

export function buildPagination(page: number, limit: number, total: number): Pagination {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFound(code: string, message: string): ApiError {
  return new ApiError(404, code, message);
}

export function badRequest(code: string, message: string): ApiError {
  return new ApiError(400, code, message);
}

export function unauthorized(message = "Authentication required."): ApiError {
  return new ApiError(401, "UNAUTHENTICATED", message);
}

export function forbidden(message = "You do not have permission to perform this action."): ApiError {
  return new ApiError(403, "FORBIDDEN", message);
}
