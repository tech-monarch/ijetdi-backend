import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db.js";
import { badRequest, buildPagination, notFound } from "../../lib/envelope.js";
import { isValidTransition, type ArticleStatusValue } from "../../lib/editorialWorkflow.js";
import { sanitizeRichTextContent } from "../../lib/sanitizeContent.js";
import { deleteArticleChunks, ingestArticle } from "../research-assistant/ingestion.service.js";
import type { z } from "zod";
import type {
  articleAdminListQuerySchema,
  articleCreateSchema,
  articlePublicListQuerySchema,
  articleUpdateSchema,
} from "./articles.schemas.js";

const authorInclude = {
  authors: {
    orderBy: { position: "asc" as const },
    include: { author: true },
  },
  volume: { select: { number: true } },
  issue: { select: { number: true } },
  // Editorial team — full resolved Editor objects, alongside however
  // authors is already resolved here. Unordered (see
  // DATABASE_SCHEMA.md's ArticleEditorialTeam entry).
  editors: true,
} satisfies Prisma.ArticleInclude;

type ArticleWithRelations = Prisma.ArticleGetPayload<{ include: typeof authorInclude }>;

/** Public/enriched shape: resolved authors[]/editors[] (full objects) + volumeNumber/issueNumber. */
function enrich(article: ArticleWithRelations) {
  const { authors, volume, issue, ...rest } = article;
  return {
    ...rest,
    authors: authors.map((a) => a.author),
    volumeNumber: volume?.number ?? null,
    issueNumber: issue?.number ?? null,
  };
}

// ── Public ──────────────────────────────────────────────────────────────

export async function listPublished(query: z.infer<typeof articlePublicListQuerySchema>) {
  const where: Prisma.ArticleWhereInput = {
    status: "published", // always, regardless of what's requested — a security rule, not optional
    ...(query.publicationId ? { publicationId: query.publicationId } : {}),
    ...(query.issueId ? { issueId: query.issueId } : {}),
    ...(query.volumeId ? { volumeId: query.volumeId } : {}),
    ...(query.area ? { area: query.area } : {}),
  };

  if (query.page && query.limit) {
    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: authorInclude,
        orderBy: { publishedDate: "desc" },
        skip,
        take: query.limit,
      }),
      prisma.article.count({ where }),
    ]);
    return {
      data: rows.map(enrich),
      pagination: buildPagination(query.page, query.limit, total),
    };
  }

  // Some callers fetch the full published set unpaginated (see
  // API_DOCUMENTATION.md's note on this dual behavior).
  const rows = await prisma.article.findMany({
    where,
    include: authorInclude,
    orderBy: { publishedDate: "desc" },
  });
  return { data: rows.map(enrich), pagination: null };
}

export async function getPublishedBySlug(slug: string) {
  const article = await prisma.article.findUnique({
    where: { slug },
    include: authorInclude,
  });
  // A non-published article's slug 404s here — it must not leak
  // existence/status to an unauthenticated caller.
  if (!article || article.status !== "published") {
    throw notFound("ARTICLE_NOT_FOUND", `Not found: ${slug}`);
  }
  return enrich(article);
}

// ── Admin ───────────────────────────────────────────────────────────────

export async function listAdmin(query: z.infer<typeof articleAdminListQuerySchema>) {
  const where: Prisma.ArticleWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.publicationId ? { publicationId: query.publicationId } : {}),
    ...(query.area ? { area: query.area } : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: "insensitive" } },
            {
              authors: {
                some: {
                  author: {
                    OR: [
                      { fullName: { contains: query.q, mode: "insensitive" } },
                      { firstName: { contains: query.q, mode: "insensitive" } },
                      { lastName: { contains: query.q, mode: "insensitive" } },
                    ],
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;
  const [rows, total] = await Promise.all([
    prisma.article.findMany({
      where,
      include: authorInclude,
      orderBy: { updatedAt: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.article.count({ where }),
  ]);

  return { data: rows.map(enrich), pagination: buildPagination(query.page, query.limit, total) };
}

/** Raw admin shape: author IDs (ordered) + editor IDs (unordered) — not resolved objects — what ArticleForm's pickers need. */
export async function getAdminById(id: string) {
  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      authors: { orderBy: { position: "asc" }, select: { authorId: true } },
      editors: { select: { id: true } },
    },
  });
  if (!article) throw notFound("ARTICLE_NOT_FOUND", `Not found: ${id}`);
  const { authors, editors, ...rest } = article;
  return { ...rest, authorIds: authors.map((a) => a.authorId), editorIds: editors.map((e) => e.id) };
}

// Sanitizes rich-text HTML before it's ever persisted — see
// src/lib/sanitizeContent.ts. Called on both create and update,
// independent of whatever sanitization the frontend's own TipTap ->
// DOMPurify pass already did; never trust that as the source of truth.
function sanitizeContentField<T extends { content?: string | null }>(data: T): T {
  if (typeof data.content === "string") {
    return { ...data, content: sanitizeRichTextContent(data.content) };
  }
  return data;
}

function splitAuthorIds<T extends { authorIds?: string[] }>(data: T) {
  const { authorIds, ...articleData } = data;
  return { authorIds: authorIds ?? [], articleData };
}

function splitEditorIds<T extends { editorIds?: string[] }>(data: T) {
  const { editorIds, ...articleData } = data;
  return { editorIds: editorIds ?? [], articleData };
}

export async function createArticle(data: z.infer<typeof articleCreateSchema>) {
  const sanitized = sanitizeContentField(data);
  const { authorIds, articleData: withoutAuthors } = splitAuthorIds(sanitized);
  const { editorIds, articleData } = splitEditorIds(withoutAuthors);

  return prisma.$transaction(async (tx) => {
    const article = await tx.article.create({
      data: {
        ...articleData,
        ...(editorIds.length > 0 ? { editors: { connect: editorIds.map((id) => ({ id })) } } : {}),
      },
    });
    if (authorIds.length > 0) {
      await tx.articleAuthor.createMany({
        data: authorIds.map((authorId, position) => ({ articleId: article.id, authorId, position })),
      });
    }
    return getAdminById(article.id);
  });
}

export async function updateArticle(id: string, data: z.infer<typeof articleUpdateSchema>) {
  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) throw notFound("ARTICLE_NOT_FOUND", `Not found: ${id}`);

  const sanitized = sanitizeContentField(data);
  const { authorIds, articleData: withoutAuthors } = splitAuthorIds(sanitized);
  const { editorIds, articleData } = splitEditorIds(withoutAuthors);

  const result = await prisma.$transaction(async (tx) => {
    await tx.article.update({
      where: { id },
      data: {
        ...articleData,
        // Only touch the editorial team if editorIds was explicitly sent
        // (mirrors authorIds' own "explicit empty array vs. omitted"
        // distinction below) — an update that omits editorIds entirely
        // leaves the team untouched; explicitly sending editorIds: []
        // clears it.
        ...(data.editorIds !== undefined ? { editors: { set: editorIds.map((eid) => ({ id: eid })) } } : {}),
      },
    });
    if (data.authorIds !== undefined) {
      await tx.articleAuthor.deleteMany({ where: { articleId: id } });
      if (authorIds.length > 0) {
        await tx.articleAuthor.createMany({
          data: authorIds.map((authorId, position) => ({ articleId: id, authorId, position })),
        });
      }
    }
    return getAdminById(id);
  });

  // Re-ingestion hook: an edit to a title/abstract/content field on an
  // ALREADY-published article must not leave stale embeddings from the
  // old text sitting alongside (or instead of) fresh ones. Only fires
  // when the article is published AND one of the chunked fields actually
  // changed — an edit to, say, `pages` or `doi` doesn't need a re-embed.
  // (A draft article being edited has no chunks yet — nothing to do,
  // ingestion only ever happens on the transition into "published".)
  const contentFieldsChanged =
    (articleData.title !== undefined && articleData.title !== existing.title) ||
    (articleData.abstract !== undefined && articleData.abstract !== existing.abstract) ||
    (articleData.content !== undefined && articleData.content !== existing.content);

  if (existing.status === "published" && contentFieldsChanged) {
    ingestArticle(id).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`[research-assistant] re-ingestion failed for edited article ${id}:`, err);
    });
  }

  return result;
}

/**
 * PATCH .../articles/:id/status — validates the transition against
 * docs/EDITORIAL_WORKFLOW.md's 11-row table and rejects anything else.
 * Sets published_date server-side on transition into "published" if not
 * already set (per that doc's §5), rather than trusting whatever an
 * editor typed into the date field.
 */
export async function updateStatus(id: string, nextStatus: ArticleStatusValue) {
  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) throw notFound("ARTICLE_NOT_FOUND", `Not found: ${id}`);

  const currentStatus = existing.status as ArticleStatusValue;
  if (!isValidTransition(currentStatus, nextStatus)) {
    throw badRequest(
      "INVALID_STATUS_TRANSITION",
      `Cannot transition an article from "${currentStatus}" to "${nextStatus}".`,
    );
  }

  const data: Prisma.ArticleUpdateInput = { status: nextStatus };
  if (nextStatus === "published" && !existing.publishedDate) {
    data.publishedDate = new Date();
  }

  const updated = await prisma.article.update({ where: { id }, data });

  // AI Research Assistant ingestion hook (docs/AI_RESEARCH_ASSISTANT.md
  // §3/§6) — fires on every transition INTO or OUT OF "published", not
  // duplicating the transition logic above, just reacting to it.
  // Best-effort: ingestion failure (e.g. Gemini unreachable) must never
  // fail the editorial status change itself — an editor publishing an
  // article shouldn't be blocked by an unrelated AI feature being down.
  if (nextStatus === "published") {
    ingestArticle(id).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`[research-assistant] ingestion failed for article ${id} after publish:`, err);
    });
  } else if (currentStatus === "published") {
    // Unpublish/archive — the article must not remain retrievable by the
    // assistant (docs/AI_RESEARCH_ASSISTANT.md §6). This one isn't
    // best-effort in the same "shrug and log" sense — a stuck stale chunk
    // is a content-leak risk — but it also must not block the status
    // change itself if it fails; log loudly instead.
    deleteArticleChunks(id).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`[research-assistant] failed to delete chunks for unpublished article ${id}:`, err);
    });
  }

  return updated;
}
