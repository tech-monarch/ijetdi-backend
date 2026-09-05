/**
 * Chunking strategy (documented here since docs/AI_RESEARCH_ASSISTANT.md
 * §8 explicitly leaves this an open implementation decision):
 *
 * - Paragraph-based: split on blank lines, never mid-paragraph. Keeps
 *   each chunk a semantically coherent unit rather than an arbitrary
 *   character cut, which matters more for retrieval quality than hitting
 *   an exact token count.
 * - Target size ~700 words per chunk (~930 tokens at the common ≈0.75
 *   words/token approximation — no tokenizer dependency is added just for
 *   chunk sizing), with a hard ceiling of ~1000 words (~1330 tokens),
 *   inside the requested 500-1000 token guidance's upper end when a
 *   single paragraph is long enough to need splitting.
 * - ~15% word overlap (rounded, min 20 words) between consecutive chunks
 *   pulled from the same section, so a sentence spanning a chunk boundary
 *   still has surrounding context in whichever chunk retrieval surfaces —
 *   a small, standard RAG overlap, not tuned against real article content
 *   since none exists yet in this project (docs/AI_RESEARCH_ASSISTANT.md
 *   §8's own caveat).
 * - The title and abstract are each their own dedicated first chunks
 *   (never merged with body content) since they're the highest-density,
 *   most citation-relevant parts of an article and shouldn't get diluted
 *   by averaging their embedding with unrelated body paragraphs.
 * - Paragraphs under a small floor (~20 words) are merged forward into
 *   the next paragraph rather than becoming their own near-empty chunk
 *   (common for short transitional paragraphs, headers-as-own-lines, etc).
 */

const TARGET_WORDS = 700;
const MAX_WORDS = 1000;
const OVERLAP_RATIO = 0.15;
const MIN_OVERLAP_WORDS = 20;
const MIN_STANDALONE_PARAGRAPH_WORDS = 20;

export interface ArticleChunkInput {
  sectionName: string | null;
  chunkText: string;
  chunkIndex: number;
}

export interface ChunkableArticle {
  title: string;
  abstract: string;
  content: string | null;
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Merges short trailing paragraphs forward so no chunk-worthy unit is near-empty. */
function mergeShortParagraphs(paragraphs: string[]): string[] {
  const merged: string[] = [];
  let pending = "";
  for (const p of paragraphs) {
    pending = pending ? `${pending}\n\n${p}` : p;
    if (wordCount(pending) >= MIN_STANDALONE_PARAGRAPH_WORDS) {
      merged.push(pending);
      pending = "";
    }
  }
  if (pending) {
    if (merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]}\n\n${pending}`;
    } else {
      merged.push(pending);
    }
  }
  return merged;
}

/**
 * Groups paragraphs into ~TARGET_WORDS chunks (never exceeding MAX_WORDS
 * unless a single paragraph alone is longer, in which case it stays
 * whole rather than being cut mid-sentence), with a small trailing-word
 * overlap carried into the next chunk.
 */
function chunkParagraphs(paragraphs: string[]): string[] {
  const merged = mergeShortParagraphs(paragraphs);
  const chunks: string[] = [];
  let current: string[] = [];
  let currentWords = 0;

  // Flushes the current chunk and seeds `current` with a small
  // trailing-word overlap from what was just flushed, so a boundary-
  // spanning idea still has context on either side of the split.
  const flushWithOverlap = () => {
    if (current.length === 0) return;
    const chunkText = current.join("\n\n");
    chunks.push(chunkText);
    const words = chunkText.split(/\s+/);
    const overlapCount = Math.min(words.length, Math.max(MIN_OVERLAP_WORDS, Math.round(words.length * OVERLAP_RATIO)));
    const overlapText = words.slice(-overlapCount).join(" ");
    current = overlapText ? [overlapText] : [];
    currentWords = wordCount(overlapText);
  };

  for (const paragraph of merged) {
    const pWords = wordCount(paragraph);
    if (currentWords > 0 && currentWords + pWords > MAX_WORDS) {
      flushWithOverlap();
    }
    current.push(paragraph);
    currentWords += pWords;
    if (currentWords >= TARGET_WORDS) {
      flushWithOverlap();
    }
  }
  if (current.length > 0) {
    chunks.push(current.join("\n\n"));
  }

  return chunks;
}

/**
 * Chunks an article's title + abstract + content into ArticleChunk rows
 * (without ids/embeddings — those are added by ingestion.service.ts,
 * which is the only caller that needs a database or the Gemini API).
 * Kept pure and dependency-free so it's unit-testable — see
 * tests/unit/chunking.test.ts.
 */
export function chunkArticle(article: ChunkableArticle): ArticleChunkInput[] {
  const chunks: ArticleChunkInput[] = [];
  let index = 0;

  const title = article.title.trim();
  if (title) {
    chunks.push({ sectionName: "Title", chunkText: title, chunkIndex: index++ });
  }

  const abstract = article.abstract.trim();
  if (abstract) {
    chunks.push({ sectionName: "Abstract", chunkText: abstract, chunkIndex: index++ });
  }

  if (article.content) {
    const paragraphs = splitParagraphs(article.content);
    const bodyChunks = chunkParagraphs(paragraphs);
    for (const text of bodyChunks) {
      chunks.push({ sectionName: "Content", chunkText: text, chunkIndex: index++ });
    }
  }

  return chunks;
}
