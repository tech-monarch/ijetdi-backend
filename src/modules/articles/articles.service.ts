import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db.js";
import { badRequest, buildPagination, forbidden, notFound } from "../../lib/envelope.js";
import { isValidTransition, type ArticleStatusValue } from "../../lib/editorialWorkflow.js";
import { sanitizeRichTextContent } from "../../lib/sanitizeContent.js";
import { omitAuthorEmail } from "../../lib/publicAuthor.js";
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
function enrich(article: ArticleWithRelations, opts: { publicView?: boolean } = {}) {
  const { authors, volume, issue, ...rest } = article;
  return {
    ...rest,
    authors: authors.map((a) => (opts.publicView ? omitAuthorEmail(a.author) : a.author)),
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
      data: rows.map((r) => enrich(r, { publicView: true })),
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
  return { data: rows.map((r) => enrich(r, { publicView: true })), pagination: null };
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
  return enrich(article, { publicView: true });
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

  return { data: rows.map((r) => enrich(r)), pagination: buildPagination(query.page, query.limit, total) };
}

/**
 * Raw admin shape: author IDs (ordered) + editor IDs (unordered) — not resolved objects — what ArticleForm's pickers need.
 *
 * `db` MUST be the transaction client when this is called from inside a
 * $transaction callback (createArticle/updateArticle below). Reading through
 * the global client from inside an interactive transaction uses a different
 * connection, which cannot see the transaction's own uncommitted rows: on
 * create it 404'd with ARTICLE_NOT_FOUND for the very article just inserted
 * (rolling the whole create back — which also broke POST /api/submissions),
 * and on update it returned the pre-update authors/editors.
 */
export async function getAdminById(id: string, db: Prisma.TransactionClient | typeof prisma = prisma) {
  const article = await db.article.findUnique({
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

  // timeout/maxWait: Prisma's interactive-transaction defaults (5s timeout, 2s maxWait
  // to acquire a connection) are tuned for a local database. Against a remote host
  // (Aiven) the round trip for create + link rows + read-back can occasionally exceed
  // that, and the failure mode is a confusing one: not a query error, but
  // "Transaction API error: Transaction not found ... obtained before disconnecting" —
  // Prisma closed the transaction on the server side before the callback finished.
  // This showed up live during the integration audit (worked once, failed once, same
  // code, same request), which is the signature of a timeout/latency issue rather than
  // a logic bug. Widened here rather than left at the default.
  return prisma.$transaction(
    async (tx) => {
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
    return getAdminById(article.id, tx);
    },
    { timeout: 15000, maxWait: 10000 },
  );
}

export async function updateArticle(
  id: string,
  input: z.infer<typeof articleUpdateSchema>,
  opts: { canPublish: boolean },
) {
  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) throw notFound("ARTICLE_NOT_FOUND", `Not found: ${id}`);

  // `status` is part of the general update schema (ArticleForm sends the
  // whole form, status included), but it must not be a back door around the
  // dedicated PATCH .../status endpoint: that endpoint alone enforced the
  // docs/EDITORIAL_WORKFLOW.md transition table, the articles.publish
  // permission, the server-set publishedDate, and the research-assistant
  // ingest/delete hooks. So a status that actually CHANGES is validated here
  // exactly as there (before anything is written), then applied through
  // updateStatus() below; an unchanged status (the common case — the form
  // re-sends whatever it loaded) is simply ignored.
  const { status: requestedStatus, ...data } = input;
  const statusChange =
    requestedStatus !== undefined && requestedStatus !== (existing.status as ArticleStatusValue)
      ? requestedStatus
      : null;
  if (statusChange) {
    if (!opts.canPublish) {
      throw forbidden("Changing an article's status requires the articles.publish permission.");
    }
    if (!isValidTransition(existing.status as ArticleStatusValue, statusChange)) {
      throw badRequest(
        "INVALID_STATUS_TRANSITION",
        `Cannot transition an article from "${existing.status}" to "${statusChange}".`,
      );
    }
  }

  const sanitized = sanitizeContentField(data);
  const { authorIds, articleData: withoutAuthors } = splitAuthorIds(sanitized);
  const { editorIds, articleData } = splitEditorIds(withoutAuthors);

  const result = await prisma.$transaction(
    async (tx) => {
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
    return getAdminById(id, tx);
    },
    { timeout: 15000, maxWait: 10000 },
  );

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

  if (statusChange) {
    // Applies the transition plus its side effects (publishedDate, ingest /
    // delete chunks). Re-reads afterwards so the response reflects both the
    // field edits and the new status.
    await updateStatus(id, statusChange);
    return getAdminById(id);
  }

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
