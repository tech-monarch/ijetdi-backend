import { prisma } from "../../config/db.js";
import { notFound } from "../../lib/envelope.js";
import type { indexingCreateSchema, indexingUpdateSchema } from "./indexing.schemas.js";
import type { z } from "zod";

/**
 * Flat, unfiltered admin list across every publication — IndexingList.jsx
 * calls indexingService.list() with no publication filter. Added
 * alongside the AI Research Assistant work, discovered missing while
 * wiring up the real frontend against this backend.
 */
export function listIndexingAdmin() {
  return prisma.indexingService.findMany({ orderBy: [{ publicationId: "asc" }, { displayOrder: "asc" }] });
}

// Public list shows only "confirmed" — matches the frontend's indexing
// badge display, which only ever shows confirmed indexing partners.
export function getConfirmedIndexingByPublicationId(publicationId: string) {  return prisma.indexingService.findMany({
    where: { publicationId, status: "confirmed" },
    orderBy: { displayOrder: "asc" },
  });
}

export function getIndexingByPublicationIdAdmin(publicationId: string) {
  return prisma.indexingService.findMany({ where: { publicationId }, orderBy: { displayOrder: "asc" } });
}

/** Single indexing entry detail — IndexingForm.jsx's edit-load fetch. */
export async function getIndexingEntryById(id: string) {
  const entry = await prisma.indexingService.findUnique({ where: { id } });
  if (!entry) throw notFound("INDEXING_SERVICE_NOT_FOUND", `Not found: ${id}`);
  return entry;
}

export function createIndexingEntry(data: z.infer<typeof indexingCreateSchema>) {
  return prisma.indexingService.create({ data });
}

export async function updateIndexingEntry(id: string, data: z.infer<typeof indexingUpdateSchema>) {
  const existing = await prisma.indexingService.findUnique({ where: { id } });
  if (!existing) throw notFound("INDEXING_SERVICE_NOT_FOUND", `Not found: ${id}`);
  return prisma.indexingService.update({ where: { id }, data });
}
