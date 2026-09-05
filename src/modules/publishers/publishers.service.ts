import { prisma } from "../../config/db.js";
import { notFound } from "../../lib/envelope.js";
import type { publisherCreateSchema, publisherUpdateSchema } from "./publishers.schemas.js";
import type { z } from "zod";

export function listPublishers() {
  return prisma.publisher.findMany({ orderBy: { name: "asc" } });
}

export async function getPublisherBySlug(slug: string) {
  const publisher = await prisma.publisher.findUnique({ where: { slug } });
  if (!publisher) throw notFound("PUBLISHER_NOT_FOUND", `Not found: ${slug}`);
  return publisher;
}

export function getPublicationsByPublisherId(publisherId: string) {
  return prisma.publication.findMany({ where: { publisherId }, orderBy: { name: "asc" } });
}

/** Raw, unenriched single-record fetch by internal id — admin edit form pre-populate. */
export async function getPublisherByIdAdmin(id: string) {
  const publisher = await prisma.publisher.findUnique({ where: { id } });
  if (!publisher) throw notFound("PUBLISHER_NOT_FOUND", `Not found: ${id}`);
  return publisher;
}

export function createPublisher(data: z.infer<typeof publisherCreateSchema>) {
  return prisma.publisher.create({ data });
}

export async function updatePublisher(id: string, data: z.infer<typeof publisherUpdateSchema>) {
  const existing = await prisma.publisher.findUnique({ where: { id } });
  if (!existing) throw notFound("PUBLISHER_NOT_FOUND", `Not found: ${id}`);
  return prisma.publisher.update({ where: { id }, data });
}
