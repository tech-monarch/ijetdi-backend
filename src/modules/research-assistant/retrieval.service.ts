import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db.js";
import { isInternallySufficient, MIN_SUFFICIENT_CHUNKS, SIMILARITY_THRESHOLD } from "./retrieval.pure.js";

export { isInternallySufficient, MIN_SUFFICIENT_CHUNKS, SIMILARITY_THRESHOLD };

const RETRIEVAL_TOP_K = 12;

export interface RetrievalFilters {
  publicationId?: string;
  authorId?: string;
  area?: string;
  year?: number;
}

export interface RetrievedChunk {
  chunkId: string;
  articleId: string;
  sectionName: string | null;
  chunkText: string;
  similarity: number;
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

/**
 * pgvector cosine similarity search over ArticleChunk, joined back to
 * Article for status/visibility filtering — always implicitly scoped to
 * status='published' regardless of what filters the request sent
 * (docs/AI_RESEARCH_ASSISTANT.md §6: this is a server-side invariant, not
 * something a client-supplied filter can influence). Uses raw SQL via
 * Prisma.sql, the same pattern search.service.ts already uses for the
 * tsvector column, since Prisma has no native vector type.
 */
export async function retrieveChunks(
  queryEmbedding: number[],
  filters: RetrievalFilters,
): Promise<RetrievedChunk[]> {
  const vectorLiteral = toVectorLiteral(queryEmbedding);

  const publicationFilter = filters.publicationId
    ? Prisma.sql`AND a.publication_id = ${filters.publicationId}`
    : Prisma.empty;
  const areaFilter = filters.area ? Prisma.sql`AND a.area = ${filters.area}` : Prisma.empty;
  const yearFilter = filters.year
    ? Prisma.sql`AND EXTRACT(YEAR FROM a.published_date) = ${filters.year}`
    : Prisma.empty;
  const authorFilter = filters.authorId
    ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM article_authors aa
        WHERE aa.article_id = a.id AND aa.author_id = ${filters.authorId}
      )`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<
    Array<{ chunk_id: string; article_id: string; section_name: string | null; chunk_text: string; similarity: number }>
  >(Prisma.sql`
    SELECT
      ac.id AS chunk_id,
      ac.article_id AS article_id,
      ac.section_name AS section_name,
      ac.chunk_text AS chunk_text,
      1 - (ac.embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM article_chunks ac
    JOIN articles a ON a.id = ac.article_id
    WHERE a.status = 'published'
      ${publicationFilter}
      ${areaFilter}
      ${yearFilter}
      ${authorFilter}
    ORDER BY ac.embedding <=> ${vectorLiteral}::vector
    LIMIT ${RETRIEVAL_TOP_K}
  `);

  return rows.map((r) => ({
    chunkId: r.chunk_id,
    articleId: r.article_id,
    sectionName: r.section_name,
    chunkText: r.chunk_text,
    similarity: r.similarity,
  }));
}
