import { prisma } from "../../config/db.js";
import { notFound } from "../../lib/envelope.js";
import type { editorCreateSchema, editorUpdateSchema } from "./editors.schemas.js";
import type { z } from "zod";

/**
 * Flat, unfiltered admin list across every publication — the admin
 * Editorial Board screen (EditorList.jsx) needs this to show every
 * editor at once, unlike the public/admin-per-publication endpoints
 * above which only make sense once a publication is already selected.
 * Added alongside the AI Research Assistant work, discovered missing
 * while wiring up the real frontend against this backend.
 */
export function listEditorsAdmin() {
  return prisma.editor.findMany({ orderBy: [{ publicationId: "asc" }, { displayOrder: "asc" }] });
}

export function getEditorsByPublicationId(publicationId: string) {
  return prisma.editor.findMany({
    where: { publicationId, status: "active" },
    orderBy: { displayOrder: "asc" },
  });
}

/** Admin view: all statuses, so inactive editors remain manageable. */
export function getEditorsByPublicationIdAdmin(publicationId: string) {
  return prisma.editor.findMany({ where: { publicationId }, orderBy: { displayOrder: "asc" } });
}

/** Raw, unenriched single-record fetch by internal id — admin edit form pre-populate. */
export async function getEditorByIdAdmin(id: string) {
  const editor = await prisma.editor.findUnique({ where: { id } });
  if (!editor) throw notFound("EDITOR_NOT_FOUND", `Not found: ${id}`);
  return editor;
}

export async function getEditorBySlug(slug: string) {
  const editor = await prisma.editor.findUnique({ where: { slug } });
  if (!editor) throw notFound("EDITOR_NOT_FOUND", `Not found: ${slug}`);
  return editor;
}

export function createEditor(data: z.infer<typeof editorCreateSchema>) {
  return prisma.editor.create({ data });
}

export async function updateEditor(id: string, data: z.infer<typeof editorUpdateSchema>) {
  const existing = await prisma.editor.findUnique({ where: { id } });
  if (!existing) throw notFound("EDITOR_NOT_FOUND", `Not found: ${id}`);
  return prisma.editor.update({ where: { id }, data });
}
