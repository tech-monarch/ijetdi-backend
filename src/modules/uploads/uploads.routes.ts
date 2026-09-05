import { Router } from "express";
import multer from "multer";
import { ok, badRequest } from "../../lib/envelope.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { uploadToR2 } from "../../config/r2.js";

// docs/BACKEND_HANDOFF.md: "the frontend already validates size/type
// client-side (FileUploadField.jsx, 5MB images / 20MB other files by
// default) — re-validate independently server-side regardless." This is
// that re-validation — multer's own limits.fileSize is a first, cheap
// backstop; the per-mimetype check below enforces the documented split.
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const OTHER_MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_OTHER_TYPES = new Set(["application/pdf"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: OTHER_MAX_BYTES },
});

export const uploadsAdminRouter = Router();

// POST /api/admin/uploads — Authenticated (any admin role — this is a
// shared primitive used by many admin forms, not gated by a single
// resource permission). multipart/form-data, field name "file"; optional
// "folder" field to group uploads (e.g. "article-pdfs", "logos").
uploadsAdminRouter.post("/uploads", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) throw badRequest("NO_FILE", "No file was uploaded (expected multipart field \"file\").");

    const isImage = ALLOWED_IMAGE_TYPES.has(file.mimetype);
    const isOther = ALLOWED_OTHER_TYPES.has(file.mimetype);
    if (!isImage && !isOther) {
      throw badRequest("UNSUPPORTED_FILE_TYPE", `Unsupported file type: ${file.mimetype}`);
    }

    const maxBytes = isImage ? IMAGE_MAX_BYTES : OTHER_MAX_BYTES;
    if (file.size > maxBytes) {
      throw badRequest(
        "FILE_TOO_LARGE",
        `File exceeds the ${Math.round(maxBytes / (1024 * 1024))}MB limit for this file type.`,
      );
    }

    const folderRaw = typeof req.body?.folder === "string" ? req.body.folder : "uploads";
    const folder = folderRaw.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 60) || "uploads";

    const result = await uploadToR2({
      buffer: file.buffer,
      contentType: file.mimetype,
      originalFilename: file.originalname,
      folder,
    });

    ok(res, result, 201);
  } catch (err) {
    next(err);
  }
});
