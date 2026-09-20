import { z } from "zod";

/**
 * Every "optional URL" field across this API (Editor/Author.profileImage,
 * Publication/Publisher.logo/cover, Article.pdfUrl, Indexing.url/logo,
 * etc.) was originally written as `z.string().url().optional()`. That's a
 * real, systemic bug: `.optional()` only allows the field to be *absent*
 * (undefined) — it does NOT allow an empty string. Every one of these
 * fields is backed by an HTML text input (or, now, FileUploadField.jsx)
 * that defaults to `""`, not `undefined`, when left blank. So leaving any
 * of these fields empty and submitting produced a 400 VALIDATION_ERROR
 * purely because "" isn't a valid URL — discovered live, via a real
 * editorial-board submission with a blank profile image field.
 *
 * This helper treats an empty (or whitespace-only) string the same as
 * "not provided": it's transformed to undefined before the `.url()` check
 * ever runs, so a blank field validates cleanly, while a real, malformed
 * URL is still rejected exactly as before.
 */
export function optionalUrl() {
  return z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().url().optional(),
  );
}

/** Same empty-string-vs-optional bug, same fix, for optional email fields. */
export function optionalEmail() {
  return z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().email().optional(),
  );
}
