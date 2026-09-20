import { Router } from "express";
import multer from "multer";
import { ok, badRequest } from "../../lib/envelope.js";
import { requirePermission } from "../../middleware/requireAuth.js";
import { importDocument } from "./import.service.js";

// 40MB — larger than the existing uploads endpoint's 5MB/20MB split,
// since this is a source document (a scanned journal issue, say), not a
// logo or a single PDF attachment.
const MAX_IMPORT_BYTES = 40 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMPORT_BYTES },
});

export const importAdminRouter = Router();

// POST /api/admin/import — shared content-authoring tool for either
// Articles or Publications (whichever the admin is editing), not its own
// separate resource — gated by any of the four relevant permissions
// (requirePermission uses OR semantics across its arguments).
// multipart/form-data, single file field named "file".
importAdminRouter.post(
  "/import",
  requirePermission("articles.create", "articles.update", "publications.create", "publications.update"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) throw badRequest("NO_FILE", 'No file was uploaded (expected multipart field "file").');

      const result = await importDocument({
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalFilename: file.originalname,
      });

      ok(res, result, 201);
    } catch (err) {
      // detectImportFileKind's UNSUPPORTED_FILE_TYPE case is thrown as an
      // ApiError already (see import.service.ts), so it's handled by
      // errorHandler.ts's generic ApiError branch — no special casing
      // needed here beyond passing it through.
      next(err);
    }
  },
);
