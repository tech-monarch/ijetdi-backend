import { prisma } from "../../config/db.js";
import { notFound } from "../../lib/envelope.js";
import type { authorCreateSchema, authorUpdateSchema } from "./authors.schemas.js";
import type { z } from "zod";

export function listAuthors() {
  return prisma.author.findMany({ orderBy: { lastName: "asc" } });
}

export async function getAuthorBySlug(slug: string) {
  const author = await prisma.author.findUnique({ where: { slug } });
  if (!author) throw notFound("AUTHOR_NOT_FOUND", `Not found: ${slug}`);
  return author;
}

async function resolveAuthorId(idOrSlug: string): Promise<string> {
  const byId = await prisma.author.findUnique({ where: { id: idOrSlug }, select: { id: true } });
  if (byId) return byId.id;
  const bySlug = await prisma.author.findUnique({ where: { slug: idOrSlug }, select: { id: true } });
  if (!bySlug) throw notFound("AUTHOR_NOT_FOUND", `Not found: ${idOrSlug}`);
  return bySlug.id;
}

/** Published articles by this author, most-recent first — used by the author profile page. */
export async function getPublishedArticlesByAuthor(idOrSlug: string) {
  const authorId = await resolveAuthorId(idOrSlug);
  const rows = await prisma.article.findMany({
    where: { status: "published", authors: { some: { authorId } } },
    orderBy: { publishedDate: "desc" },
    include: {
      authors: { orderBy: { position: "asc" }, include: { author: true } },
      volume: { select: { number: true } },
      issue: { select: { number: true } },
    },
  });
  return rows.map((article) => {
    const { authors, volume, issue, ...rest } = article;
    return {
      ...rest,
      authors: authors.map((a) => a.author),
      volumeNumber: volume?.number ?? null,
      issueNumber: issue?.number ?? null,
    };
  });
}

/** Raw, unenriched single-record fetch by internal id — admin edit form pre-populate. */
export async function getAuthorByIdAdmin(id: string) {
  const author = await prisma.author.findUnique({ where: { id } });
  if (!author) throw notFound("AUTHOR_NOT_FOUND", `Not found: ${id}`);
  return author;
}

export function createAuthor(data: z.infer<typeof authorCreateSchema>) {
  return prisma.author.create({ data });
}

export async function updateAuthor(id: string, data: z.infer<typeof authorUpdateSchema>) {
  const existing = await prisma.author.findUnique({ where: { id } });
  if (!existing) throw notFound("AUTHOR_NOT_FOUND", `Not found: ${id}`);
  return prisma.author.update({ where: { id }, data });
}
