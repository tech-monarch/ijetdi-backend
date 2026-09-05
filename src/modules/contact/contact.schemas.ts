import { z } from "zod";

export const contactCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(1),
  category: z.string().optional(),
});

export const contactStatusUpdateSchema = z.object({
  status: z.enum(["new", "read", "in_progress", "resolved", "archived"]),
});

export const contactListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  status: z.enum(["new", "read", "in_progress", "resolved", "archived"]).optional(),
});
