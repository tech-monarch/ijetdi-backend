import { z } from "zod";

// ---------------------------------------------------------------------------
// Every admin *Form.jsx in the frontend leaves an unfilled optional
// URL/email field as an empty string ("") in its form state and sends it
// as-is on submit (see e.g. EditorForm.jsx's `profileImage: ""` default,
// spread directly into the create/update payload) — it does not omit the
// key, and does not send `null`/`undefined`.
//
// Plain `z.string().url().optional()` (and `.email().optional()`) only
// tolerates the key being genuinely absent (`undefined`) — an empty
// string is a *present* value that fails `.url()`/`.email()` validation.
// The result: leaving ANY optional URL/email field blank in the admin —
// profile image, logo, cover, website, PDF URL, canonical URL, indexing
// URL — guaranteed a 400 Bad Request on every create/update across every
// entity that has one, the exact opposite of "optional."
//
// Fix: treat an empty string as "not provided," matching what every one
// of these forms actually means by leaving a field blank. Use these two
// helpers instead of raw `z.string().url().optional()` /
// `z.string().email().optional()` everywhere in this backend — see
// tests/unit/zodHelpers.test.ts.
// ---------------------------------------------------------------------------

export function optionalUrl() {
  return z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional());
}

export function optionalEmail() {
  return z.preprocess((value) => (value === "" ? undefined : value), z.string().email().optional());
}
