// Author.email is contact data supplied by (or scraped from) manuscript
// submitters and admins. No public page reads it, but it used to ride along on
// every public author payload — GET /api/authors, /api/authors/:slug, and the
// authors[] of every public article — and POST /api/submissions creates Author
// rows from anonymous input, so an unauthenticated submitter's address became
// publicly listable. Public serializers drop it; admin endpoints
// (GET /api/admin/authors/:id, GET /api/admin/articles) still return it.
export function omitAuthorEmail<T extends { email?: string | null }>(author: T): Omit<T, "email"> {
  const { email: _email, ...rest } = author;
  return rest;
}
