import { prisma } from "../../config/db.js";

/**
 * Citation metadata is NOT denormalized onto ArticleChunk — per
 * docs/DATABASE_SCHEMA.md's explicit note, it's joined back to Article
 * (and Article's existing Author/Volume/Issue relations) at query time.
 * This is the join.
 */

export interface JournalSource {
  id: string;
  slug: string;
  title: string;
  authors: Array<{ id: string; fullName: string }>;
  volumeNumber: number | null;
  issueNumber: number | null;
  areaTitle: string | null;
  doi: string | null;
  chunkIds: string[];
}

/**
 * Groups retrieved chunk rows by article and resolves each into the
 * §2 journalSources shape. `chunkIdsByArticle` maps articleId -> the
 * chunk ids retrieved for it (so the response's chunkIds only ever list
 * chunks that were actually retrieved for this query — the
 * citation-traceability requirement in docs/AI_RESEARCH_ASSISTANT.md §4).
 */
export async function buildJournalSources(chunkIdsByArticle: Map<string, string[]>): Promise<JournalSource[]> {
  const articleIds = [...chunkIdsByArticle.keys()];
  if (articleIds.length === 0) return [];

  const articles = await prisma.article.findMany({
    where: { id: { in: articleIds }, status: "published" }, // re-asserted here, not just trusted from retrieval
    include: {
      authors: { orderBy: { position: "asc" }, include: { author: true } },
      volume: { select: { number: true } },
      issue: { select: { number: true } },
    },
  });

  return articles.map((article) => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    authors: article.authors.map((a) => ({ id: a.author.id, fullName: a.author.fullName })),
    volumeNumber: article.volume?.number ?? null,
    issueNumber: article.issue?.number ?? null,
    areaTitle: article.area ?? null,
    doi: article.doi ?? null,
    chunkIds: chunkIdsByArticle.get(article.id) ?? [],
  }));
}
