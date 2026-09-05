import { prisma } from "../../config/db.js";
import { notFound } from "../../lib/envelope.js";
import type { volumeCreateSchema, volumeUpdateSchema } from "./volumes.schemas.js";
import type { z } from "zod";

/**
 * Flat, unfiltered admin list across every publication — VolumeList.jsx's
 * admin screen needs this (calls volumeService.list() with no
 * publication filter, since the admin can pick "all publications").
 * Added alongside the AI Research Assistant work, discovered missing
 * while wiring up the real frontend against this backend.
 */
export function listVolumesAdmin() {
  return prisma.volume.findMany({ orderBy: [{ publicationId: "asc" }, { number: "desc" }] });
}

export function getVolumesByPublicationId(publicationId: string) {
  return prisma.volume.findMany({ where: { publicationId }, orderBy: { number: "desc" } });
}

export async function getVolumeById(id: string) {
  const volume = await prisma.volume.findUnique({ where: { id } });
  if (!volume) throw notFound("VOLUME_NOT_FOUND", `Not found: ${id}`);
  return volume;
}

export function createVolume(data: z.infer<typeof volumeCreateSchema>) {
  return prisma.volume.create({ data });
}

export async function updateVolume(id: string, data: z.infer<typeof volumeUpdateSchema>) {
  const existing = await prisma.volume.findUnique({ where: { id } });
  if (!existing) throw notFound("VOLUME_NOT_FOUND", `Not found: ${id}`);
  return prisma.volume.update({ where: { id }, data });
}
