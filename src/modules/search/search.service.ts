import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db.js";
import { buildPagination } from "../../lib/envelope.js";
import { combineAndPaginate, type SearchResult } from "./search.pure.js";

export type { SearchResult } from "./search.pure.js";
export { combineAndPaginate } from "./search.pure.js";

/**
 * Real Postgres full-text search (tsvector/tsquery + GIN index for
 * articles; ILIKE for authors — author volume is small enough that a
 * plain index-backed ILIKE is reasonable and avoids a second generated
 * tsvector column just for a name lookup), replacing the frontend mock's
 * naive substring scan per BACKEND_HANDOFF.md.
 *
 * Response shape is the documented lightweight mixed-type array —
 * { type: "article" | "author", id, slug, title } — NOT full Article or
 * Author records. See docs/API_DOCUMENTATION.md "Search" and the
 * frontend's src/services/searchService.js / src/pages/Search.jsx, which
 * key off exactly these four fields (result.type, result.slug for the
 * link, result.title as display text).
 *
 * Only status='published' articles are searchable — same hard rule as
 * every other public article endpoint. Authors have no publish-state of
 * their own, so all authors are searchable by name (matching the mock's
 * behavior, which also searches the full authors list unfiltered).
 *
 * Article results are ranked first by full-text rank, then author
 * results are appended — matching the mock's article-then-author
 * ordering — and the combined list is paginated in application code
 * (mirroring the mock's `paginate([...articles, ...authors])` behavior),
 * since page/limit apply across the *combined* result set per the
 * documented contract, not per-type. The actual combine/paginate step
 * lives in search.pure.ts (no prisma/env import) so it's unit-testable
 * without a database — see tests/unit/search.test.ts.
 */
export async function search(params: {
  q: string;
  publicationId?: string;
  page: number;
  limit: number;
}): Promise<{ data: SearchResult[]; pagination: ReturnType<typeof buildPagination> }> {
  const { publicationId, page, limit } = params;
  const q = params.q.trim();

  if (!q) {
    return { data: [], pagination: buildPagination(page, limit, 0) };
  }

  const publicationFilter = publicationId ? Prisma.sql`AND a.publication_id = ${publicationId}` : Prisma.empty;

  const articleRows = await prisma.$queryRaw<Array<{ id: string; slug: string; title: string; rank: number }>>(
    Prisma.sql`
      SELECT a.id, a.slug, a.title, ts_rank(a.search_vector, plainto_tsquery('english', ${q})) AS rank
      FROM articles a
      WHERE a.status = 'published'
        AND a.search_vector @@ plainto_tsquery('english', ${q})
        ${publicationFilter}
      ORDER BY rank DESC
    `,
  );

  // Authors have no publicationId of their own, so publicationId is only
  // ever applied to the article half of the search — filtering authors by
  // publication would silently drop legitimate name matches.
  const authorRows = await prisma.author.findMany({
    where: { fullName: { contains: q, mode: "insensitive" } },
    select: { id: true, slug: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  const articleResults: SearchResult[] = articleRows.map((r) => ({
    type: "article",
    id: r.id,
    slug: r.slug,
    title: r.title,
  }));
  const authorResults: SearchResult[] = authorRows.map((r) => ({
    type: "author",
    id: r.id,
    slug: r.slug,
    title: r.fullName,
  }));

  return combineAndPaginate(articleResults, authorResults, page, limit);
}
