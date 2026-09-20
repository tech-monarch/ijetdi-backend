import { randomBytes } from "node:crypto";

// Every other model in this backend takes an admin-typed slug directly
// (see articles.schemas.ts, authors.schemas.ts) — there's no existing
// slug-generation utility because nothing needed one before. Public
// submissions have no admin present to type one, so this generates a
// reasonable kebab-case slug from a title, with a short random suffix to
// avoid relying on a uniqueness retry loop for the common case (still
// worth checking for a real collision at the call site — see
// submissions.service.ts).
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const suffix = randomBytes(3).toString("hex"); // 6 hex chars, negligible collision odds
  return `${base || "submission"}-${suffix}`;
}
