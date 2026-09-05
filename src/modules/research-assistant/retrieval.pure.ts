/**
 * Similarity threshold + minimum-chunk-count rule for deciding "internal
 * results are sufficient, skip Tavily" (docs/AI_RESEARCH_ASSISTANT.md §3d).
 * See retrieval.service.ts's header comment (which re-exports these) for
 * the full rationale — kept in their own dependency-free module so the
 * decision function is unit-testable without a database, same reasoning
 * as search.pure.ts.
 */
export const SIMILARITY_THRESHOLD = 0.75;
export const MIN_SUFFICIENT_CHUNKS = 2;

export interface SimilarityScored {
  similarity: number;
}

export function isInternallySufficient(chunks: SimilarityScored[]): boolean {
  const strongMatches = chunks.filter((c) => c.similarity >= SIMILARITY_THRESHOLD);
  return strongMatches.length >= MIN_SUFFICIENT_CHUNKS;
}
