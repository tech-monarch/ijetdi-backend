import { badRequest } from "../../lib/envelope.js";
import { uploadToR2 } from "../../config/r2.js";
import { sanitizeRichTextContent } from "../../lib/sanitizeContent.js";
import { detectImportFileKind } from "./detectFileType.js";
import { importDocx } from "./docxImporter.js";
import { importPdf } from "./pdfImporter.js";
import { importImage } from "./imageImporter.js";

export interface ImportResult {
  html: string;
  warnings: string[];
  usedOcr: boolean;
  embedFallback: boolean; // PDF-only
  originalFileUrl: string; // ALWAYS present
  originalFileName: string;
}

// Extraction has genuinely failed (PDF only) once the plain-text length of
// the sanitized result drops below this. Calibrated against a real
// document's worth of text, not a tiny test string — a too-short fixture
// can accidentally trigger this path in a test that isn't meant to
// exercise it (see tests/fixtures' own note on this).
const MIN_USABLE_TEXT_LENGTH = 40;

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * Orchestrates the whole import: upload the original file first (so it's
 * never lost even if extraction fails entirely), detect the file kind,
 * dispatch to the matching importer, sanitize the result through the
 * exact same sanitizeRichTextContent() used by articles/publications, and
 * — for PDFs only — decide whether to fall back to embedding the original
 * file rather than widening the rich-text sanitizer's allowlist.
 */
export async function importDocument(params: {
  buffer: Buffer;
  mimetype: string;
  originalFilename: string;
}): Promise<ImportResult> {
  const { buffer, mimetype, originalFilename } = params;

  // Unrecognized file type: thrown as a distinct, identifiable ApiError
  // (code: "UNSUPPORTED_FILE_TYPE") BEFORE the R2 upload happens below —
  // an unrecognized file type shouldn't get uploaded at all.
  // errorHandler.ts's existing ApiError branch turns this into a clean
  // 400 with no special-casing needed in the route.
  const kind = detectImportFileKind(mimetype, buffer);
  if (!kind) {
    throw badRequest("UNSUPPORTED_FILE_TYPE", `Unsupported file type: ${mimetype}`);
  }

  // Step 1, always, before anything else: upload the original file to R2.
  // Per the spec: "If extraction fails, do not lose the uploaded file."
  const { url: originalFileUrl } = await uploadToR2({
    buffer,
    contentType: mimetype,
    originalFilename,
    folder: "article-import-sources",
  });

  const base = { originalFileUrl, originalFileName: originalFilename };

  try {
    if (kind === "docx") {
      const { html, warnings } = await importDocx(buffer);
      const sanitized = sanitizeRichTextContent(html);
      return { ...base, html: sanitized, warnings, usedOcr: false, embedFallback: false };
    }

    if (kind === "image") {
      const { html, warnings } = await importImage(buffer);
      const sanitized = sanitizeRichTextContent(html);
      return { ...base, html: sanitized, warnings, usedOcr: true, embedFallback: false };
    }

    // kind === "pdf"
    const { html, warnings, usedOcr } = await importPdf(buffer);
    const sanitized = sanitizeRichTextContent(html);

    // Step 3 — embed-fallback decision (PDF only). Do NOT widen the
    // rich-text sanitizer's allowlist to add <iframe>/<object> so the PDF
    // can be embedded inline in the "content" field — that would be a
    // real, unjustified security regression (arbitrary user-authored
    // rich-text content embedding arbitrary framed content, for the sake
    // of one fallback case). Instead: return embedFallback: true with an
    // empty html and the already-uploaded originalFileUrl; the frontend
    // offers setting Article.pdfUrl to that URL instead, rendered through
    // a separate, trusted, first-party component (PdfEmbed.jsx) that
    // isn't part of the sanitized-content pipeline at all.
    if (stripTags(sanitized).length < MIN_USABLE_TEXT_LENGTH) {
      return {
        ...base,
        html: "",
        warnings: [...warnings, "Couldn't extract usable text from this PDF, even with OCR."],
        usedOcr,
        embedFallback: true,
      };
    }

    return { ...base, html: sanitized, warnings, usedOcr, embedFallback: false };
  } catch (err) {
    // Step 4 — error resilience. The upload from Step 1 already
    // succeeded — don't lose it. DOCX/image have no embeddable fallback
    // the way PDF does (no "embed a Word doc"/"embed a photo" concept) —
    // they just get an empty-html result with a warning.
    const message = (err as Error).message ?? String(err);
    return {
      ...base,
      html: "",
      warnings: [`Extraction failed: ${message}`],
      usedOcr: false,
      embedFallback: kind === "pdf",
    };
  }
}
