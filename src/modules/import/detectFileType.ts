// ---------------------------------------------------------------------------
// Pure function: detect what kind of source document a buffer actually is,
// by real magic bytes — never by trusting the client-supplied mimetype
// alone. Same "never trust client input" principle this backend already
// applies everywhere else (see e.g. uploads.routes.ts re-validating
// size/type independently of whatever the frontend already checked).
// ---------------------------------------------------------------------------

export type ImportFileKind = "docx" | "pdf" | "image";

const DOCX_MIMETYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
  "application/zip",
]);

const IMAGE_MIMETYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function isPdf(buffer: Buffer): boolean {
  // "%PDF-" — first 5 bytes, ASCII.
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

function isZipMagic(buffer: Buffer): boolean {
  // PK\x03\x04 (local file header) — also covers PK\x05\x06 (empty archive)
  // and PK\x07\x08 (spanned archive), but those are not realistic for a
  // docx upload; the local-file-header signature alone is sufficient here.
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}

function isJpeg(buffer: Buffer): boolean {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function isPng(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  );
}

function isWebp(buffer: Buffer): boolean {
  // RIFF....WEBP — bytes 0-3 "RIFF", bytes 8-11 "WEBP".
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

/**
 * Detects the import file kind from real magic bytes, cross-checked
 * against the client-supplied mimetype where the magic bytes alone are
 * ambiguous (a zip signature by itself doesn't mean "docx" — plenty of
 * things are zips). Returns `null` for anything unsupported.
 */
export function detectImportFileKind(mimetype: string, buffer: Buffer): ImportFileKind | null {
  if (isPdf(buffer)) return "pdf";

  if (isJpeg(buffer) || isPng(buffer) || isWebp(buffer) || IMAGE_MIMETYPES.has(mimetype)) {
    return "image";
  }

  if (isZipMagic(buffer) && DOCX_MIMETYPES.has(mimetype)) {
    return "docx";
  }

  return null;
}
