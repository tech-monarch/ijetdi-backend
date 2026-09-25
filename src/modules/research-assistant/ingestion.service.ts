import { randomUUID } from "node:crypto";
import { prisma } from "../../config/db.js";
import { embedText } from "../../lib/gemini.js";
import { chunkArticle } from "./chunking.js";

/** Converts a JS number array into the pgvector text literal format, e.g. "[0.1,0.2,...]". */
function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

/**
 * Deletes every ArticleChunk for an article. Used both when an article
 * transitions OUT of "published" (unpublish/archive — it must not remain
 * retrievable, per docs/AI_RESEARCH_ASSISTANT.md §6) and as the first
 * step of re-ingestion (so an edit never leaves stale chunks mixed in
 * with fresh ones).
 */
export async function deleteArticleChunks(articleId: string): Promise<void> {
  await prisma.articleChunk.deleteMany({ where: { articleId } });
}

/**
 * Chunks, embeds, and stores every chunk for one article. Callers MUST
 * only invoke this for status='published' articles — this function
 * itself re-checks status and no-ops (after clearing any existing
 * chunks) if the article isn't published, as a defense-in-depth measure
 * against a caller mistake, not the primary enforcement point (the
 * primary enforcement is: this is only ever called from the 'published'
 * transition in articles.service.ts and the backfill script, both of
 * which already filter to published articles).
 *
 * Always deletes existing chunks first — re-ingestion (an edit to a
 * live article) must not leave stale embeddings from the old title/
 * abstract/content alongside the new ones.
 */
export async function ingestArticle(articleId: string): Promise<{ chunksWritten: number }> {
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) {
    return { chunksWritten: 0 };
  }

  await deleteArticleChunks(articleId);

  if (article.status !== "published") {
    return { chunksWritten: 0 };
  }

  const chunkInputs = chunkArticle({
    title: article.title,
    abstract: article.abstract,
    content: article.content,
  });

  let written = 0;
  for (const chunk of chunkInputs) {
    const embedding = await embedText(chunk.chunkText);
    const id = randomUUID();
    const vectorLiteral = toVectorLiteral(embedding);
    // Raw SQL insert — Prisma has no native vector type (see
    // prisma/schema.prisma's Unsupported("vector(768)") comment), so the
    // embedding column is written the same way search.service.ts already
    // handles the tsvector column: parameterized raw SQL, with the vector
    // itself passed as a single ::vector-cast text parameter (never
    // string-interpolated), so this is not SQL-injectable.
    await prisma.$executeRaw`
      INSERT INTO article_chunks (id, article_id, section_name, chunk_text, chunk_index, embedding, created_at)
      VALUES (${id}, ${articleId}, ${chunk.sectionName}, ${chunk.chunkText}, ${chunk.chunkIndex}, ${vectorLiteral}::vector, now())
    `;
    written += 1;
  }

  return { chunksWritten: written };
}

/**
 * One-time backfill for every currently-published article — see
 * `npm run ingest` (src/db/ingest.ts). Sequential, not parallel: Gemini
 * calls are rate-limited per-project, and running dozens of embedding
 * calls concurrently against a free/low tier is more likely to trip a
 * rate limit than to meaningfully speed up a one-time batch job.
 */
export async function backfillAllPublished(
  onProgress?: (done: number, total: number, articleTitle: string) => void,
): Promise<{ articlesProcessed: number; chunksWritten: number }> {
  const articles = await prisma.article.findMany({
    where: { status: "published" },
    select: { id: true, title: true },
    orderBy: { publishedDate: "asc" },
  });

  let chunksWritten = 0;
  for (let i = 0; i < articles.length; i++) {
    const { chunksWritten: n } = await ingestArticle(articles[i].id);
    chunksWritten += n;
    onProgress?.(i + 1, articles.length, articles[i].title);
  }

  return { articlesProcessed: articles.length, chunksWritten };
}

/**
 * Same idea as backfillAllPublished, but scoped to published articles that
 * currently have ZERO chunks, and resilient to a single article's failure
 * rather than stopping the whole run on it.
 *
 * Built for this specific gap: an article can end up published with no
 * chunks either because it was inserted directly (a seed script, a manual
 * DB fix — anything that skips the updateStatus() hook in
 * articles.service.ts) or because ingestion was attempted at publish time
 * but failed (e.g. GEMINI_API_KEY was invalid that day) — that failure is
 * caught and only logged server-side there, so nothing about the article
 * itself looks wrong afterwards. Both cases look identical from here:
 * "published, but article_chunks has no rows for it."
 *
 * Unlike backfillAllPublished (deliberate, one-time, fail-fast — see
 * src/db/ingest.ts), this is meant to run unattended and often — e.g. as a
 * Render pre-deploy command on every deploy — so a single bad article must
 * not block the rest or fail the whole command. On a normal run where
 * nothing is missing, this does one cheap query and exits.
 */
export async function backfillMissingPublished(
  onProgress?: (done: number, total: number, articleTitle: string) => void,
): Promise<{ articlesProcessed: number; chunksWritten: number; failures: { id: string; title: string; error: string }[] }> {
  const articles = await prisma.article.findMany({
    where: { status: "published", chunks: { none: {} } },
    select: { id: true, title: true },
    orderBy: { publishedDate: "asc" },
  });

  let chunksWritten = 0;
  const failures: { id: string; title: string; error: string }[] = [];
  for (let i = 0; i < articles.length; i++) {
    try {
      const { chunksWritten: n } = await ingestArticle(articles[i].id);
      chunksWritten += n;
    } catch (err) {
      failures.push({ id: articles[i].id, title: articles[i].title, error: err instanceof Error ? err.message : String(err) });
    }
    onProgress?.(i + 1, articles.length, articles[i].title);
  }

  return { articlesProcessed: articles.length, chunksWritten, failures };
}
