import { prisma } from "../../config/db.js";
import { notFound } from "../../lib/envelope.js";
import type { publicationCreateSchema, publicationUpdateSchema } from "./publications.schemas.js";
import type { z } from "zod";

export function listPublications() {
  return prisma.publication.findMany({ orderBy: { name: "asc" } });
}

export async function getPublicationBySlug(slug: string) {
  const publication = await prisma.publication.findUnique({ where: { slug } });
  if (!publication) throw notFound("PUBLICATION_NOT_FOUND", `Not found: ${slug}`);
  return publication;
}

/** Raw, unenriched single-record fetch by internal id — admin edit form pre-populate. */
export async function getPublicationByIdAdmin(id: string) {
  const publication = await prisma.publication.findUnique({ where: { id } });
  if (!publication) throw notFound("PUBLICATION_NOT_FOUND", `Not found: ${id}`);
  return publication;
}

export function createPublication(data: z.infer<typeof publicationCreateSchema>) {
  return prisma.publication.create({ data });
}

export async function updatePublication(id: string, data: z.infer<typeof publicationUpdateSchema>) {
  const existing = await prisma.publication.findUnique({ where: { id } });
  if (!existing) throw notFound("PUBLICATION_NOT_FOUND", `Not found: ${id}`);
  return prisma.publication.update({ where: { id }, data });
}
