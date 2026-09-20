import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import multer from "multer";
import { ZodError } from "zod";
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

  // Pre-existing gap, fixed here: multer's own errors (e.g. exceeding
  // limits.fileSize) previously fell through to the generic 500 branch
  // below with no dedicated handling — a client-side problem (an
  // oversized upload) reported back as a server error. Affects both the
  // existing uploads endpoint and the new document-import endpoint, since
  // both use multer.
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "That file is too large for this field."
        : `Upload error: ${err.message}`;
    res.status(400).json({ success: false, error: { code: err.code, message } });
    return;
  }

  // Pre-existing gap, fixed here: a few routes call a Zod schema's
  // .parse() directly on the query string (contact.routes.ts,
  // reviewers-reviews.routes.ts, search.routes.ts) rather than going
  // through validate.ts's validateBody/validateQuery (which use
  // safeParse and format their own 400s). A raw .parse() throws a
  // ZodError, which had no dedicated branch here and fell through to the
  // generic 500 below — a malformed query string reported back as a
  // server error. Found while adding the submissions endpoint's own
  // validation and checking this file for how errors were formatted
  // elsewhere, not assumed.
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message } });
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
