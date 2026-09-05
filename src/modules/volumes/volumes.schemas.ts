import { z } from "zod";

export const volumeCreateSchema = z.object({
  publicationId: z.string().min(1),
  number: z.coerce.number().int(),
  year: z.coerce.number().int().optional(),
  description: z.string().optional(),
  status: z.enum(["active", "archived"]),
});

export const volumeUpdateSchema = volumeCreateSchema.partial();
