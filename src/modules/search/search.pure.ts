import { buildPagination } from "../../lib/envelope.js";

export type SearchResult = {
  type: "article" | "author";
  id: string;
  slug: string;
  title: string;
};

/**
 * Pure combine-then-paginate step, kept in its own module (no prisma/env
 * import) so it's unit-testable without a database — see
 * tests/unit/search.test.ts. Articles are expected first, authors second;
 * the caller is responsible for that ordering, this function only slices
 * the already-ordered combined list.
 */
export function combineAndPaginate(
  articleResults: SearchResult[],
  authorResults: SearchResult[],
  page: number,
  limit: number,
): { data: SearchResult[]; pagination: ReturnType<typeof buildPagination> } {
  const combined = [...articleResults, ...authorResults];
  const total = combined.length;
  const offset = (page - 1) * limit;
  const data = combined.slice(offset, offset + limit);
  return { data, pagination: buildPagination(page, limit, total) };
}
