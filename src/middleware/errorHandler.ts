import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ApiError } from "../lib/envelope.js";
import { env } from "../config/env.js";

/**
 * Central error handler. Per docs/BACKEND_HANDOFF.md §10: API error
 * responses should never leak sensitive internals (stack traces, query
 * text, internal ids beyond what the frontend already expects) — messages
 * should be informative enough to debug, not detailed enough to aid an
 * attacker. Full details are logged server-side via req.log, never sent
 * to the client in production.
 */
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  // A response was already sent for this request (e.g. the success path
  // finished, then something else — like a lazily-checked session-store
  // table creation — threw asynchronously afterward). Attempting to call
  // res.status()/res.json() here throws ERR_HTTP_HEADERS_SENT, which
  // crashes request handling. Per Express's own documented guidance:
  // delegate to Express's built-in final handler instead, which knows to
  // just close the connection rather than write again. Discovered live
  // (see session.ts's SSL fix, whose failure mode was exactly this).
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Record not found." } });
      return;
    }
    if (err.code === "P2002") {
      res.status(409).json({
        success: false,
        error: { code: "DUPLICATE", message: "A record with that value already exists." },
      });
      return;
    }
  }

  req.log?.error({ err }, "Unhandled error");
  // eslint-disable-next-line no-console
  if (!req.log) console.error(err);

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: env.NODE_ENV === "production" ? "Something went wrong." : String((err as Error)?.message ?? err),
    },
  });
}
