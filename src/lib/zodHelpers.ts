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

// "" (a blank form input) and null (an unset column round-tripped from the API)
// both mean "no value": they validate, and resolve to null so that on a PATCH
// they CLEAR the stored value. They used to resolve to undefined, which on a
// PATCH meant "leave untouched" — so removing a logo/cover/canonical URL in the
// admin returned 200 but silently kept the old value (found by live test).
// Omitting the key entirely (undefined) still means "leave untouched".
export function optionalUrl() {
  return z.preprocess(
    (value) => (value === "" || (typeof value === "string" && value.trim() === "") ? null : value),
    z.string().url().nullable().optional(),
  );
}

export function optionalEmail() {
  return z.preprocess(
    (value) => (value === "" || (typeof value === "string" && value.trim() === "") ? null : value),
    z.string().email().nullable().optional(),
  );
}

// ---------------------------------------------------------------------------
// Blank-input helpers for optional date / id / integer fields.
//
// Same class of bug as optionalUrl()/optionalEmail() above, found by
// replaying the admin forms' real payloads against a live database:
//   • <input type="date"> left blank sends "" → z.coerce.date() turns that
//     into an Invalid Date → 400 "Invalid date" (ArticleForm's four date
//     fields, IssueForm's publicationDate).
//   • A "— none —" <select> sends "" for volumeId/issueId → Prisma FK
//     violation → 500 (and `null`, the only way to clear a relation, was
//     rejected by z.string().optional()).
//   • VolumeForm sends `year: null` when blank → z.coerce.number() turns null
//     into 0 → a volume silently stored as year 0.
// Treat "" as "clear this field" (null), and let an explicit null through.
// Omitted (undefined) still means "leave untouched" on PATCH.
// ---------------------------------------------------------------------------

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export function optionalDate() {
  return z.preprocess(blankToNull, z.coerce.date().nullable().optional());
}

export function optionalId() {
  return z.preprocess(blankToNull, z.string().min(1).nullable().optional());
}

export function optionalInt() {
  return z.preprocess(blankToNull, z.coerce.number().int().nullable().optional());
}
