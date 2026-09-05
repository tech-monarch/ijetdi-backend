import { prisma } from "../../config/db.js";
import { buildPagination, notFound } from "../../lib/envelope.js";
import { sendEmail } from "../../lib/email/sendEmail.js";
import type { contactCreateSchema, contactListQuerySchema, contactStatusUpdateSchema } from "./contact.schemas.js";
import type { z } from "zod";

type ContactStatus = z.infer<typeof contactStatusUpdateSchema>["status"];

export async function createContactMessage(data: z.infer<typeof contactCreateSchema>) {
  const message = await prisma.contactMessage.create({ data: { ...data, status: "new" } });
  // Best-effort confirmation email — a delivery failure here shouldn't
  // fail the contact-form submission itself, so it's not awaited inline
  // with try/catch that rethrows.
  try {
    await sendEmail({ to: data.email, template: "contact-received", data: { name: data.name } });
  } catch {
    // Swallow: the message is already saved; email delivery is best-effort.
  }
  return message;
}

/** Single message detail — Admin ContactMessageDetail.jsx's pre-populate fetch. */
export async function getContactMessageById(id: string) {
  const message = await prisma.contactMessage.findUnique({ where: { id } });
  if (!message) throw notFound("CONTACT_MESSAGE_NOT_FOUND", `Not found: ${id}`);
  return message;
}

export async function listContactMessages(params: z.infer<typeof contactListQuerySchema>) {
  const where = params.status ? { status: params.status as ContactStatus } : {};
  const skip = (params.page - 1) * params.limit;
  const [rows, total] = await Promise.all([
    prisma.contactMessage.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: params.limit }),
    prisma.contactMessage.count({ where }),
  ]);
  return { data: rows, pagination: buildPagination(params.page, params.limit, total) };
}

export async function updateContactMessageStatus(id: string, status: ContactStatus) {
  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) throw notFound("CONTACT_MESSAGE_NOT_FOUND", `Not found: ${id}`);
  return prisma.contactMessage.update({ where: { id }, data: { status } });
}
