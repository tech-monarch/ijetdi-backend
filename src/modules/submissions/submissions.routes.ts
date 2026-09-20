import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { ok, badRequest } from "../../lib/envelope.js";
import { submissionCreateSchema } from "./submissions.schemas.js";
import { createSubmission } from "./submissions.service.js";

// 40MB, matching the Document Import Pipeline's own manuscript-scale
// limit (import.routes.ts) — a submitted manuscript is the same kind of
// source document.
const MAX_MANUSCRIPT_BYTES = 40 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MANUSCRIPT_BYTES },
});

// Public, unauthenticated, writes to the database and uploads a file —
// an obvious spam/abuse target, same reasoning as contact.routes.ts's
// own rate limit. Tighter window than the contact form since a real
// author submitting a real manuscript is a rare action per person.
const submissionRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many submissions sent. Please try again later." },
  },
});

export const submissionsRouter = Router();

// POST /api/submissions — Public. multipart/form-data: a "manuscript"
// file field plus plain-text form fields, with correspondingAuthor and
// additionalAuthors sent as JSON-encoded strings (the browser's
// FormData/multipart can't nest objects natively).
submissionsRouter.post(
  "/submissions",
  submissionRateLimit,
  upload.single("manuscript"),
  async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) {
        throw badRequest("NO_FILE", 'No manuscript file was uploaded (expected multipart field "manuscript").');
      }

      let correspondingAuthor: unknown;
      let additionalAuthors: unknown;
      try {
        correspondingAuthor = req.body.correspondingAuthor ? JSON.parse(req.body.correspondingAuthor) : undefined;
        additionalAuthors = req.body.additionalAuthors ? JSON.parse(req.body.additionalAuthors) : undefined;
      } catch {
        throw badRequest("INVALID_AUTHOR_JSON", "correspondingAuthor/additionalAuthors must be valid JSON.");
      }

      const parsed = submissionCreateSchema.safeParse({
        title: req.body.title,
        abstract: req.body.abstract,
        articleType: req.body.articleType,
        area: req.body.area || undefined,
        publicationId: req.body.publicationId,
        correspondingAuthor,
        additionalAuthors,
      });
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
        throw badRequest("VALIDATION_ERROR", message);
      }

      const result = await createSubmission({
        data: parsed.data,
        manuscript: { buffer: file.buffer, mimetype: file.mimetype, originalFilename: file.originalname },
      });

      ok(res, result, 201);
    } catch (err) {
      next(err);
    }
  },
);
