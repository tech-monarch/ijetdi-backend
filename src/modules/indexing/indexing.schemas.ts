import { z } from "zod";

export const indexingCreateSchema = z.object({
  publicationId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  url: z.string().url().optional(),
  logo: z.string().url().optional(),
  status: z.enum(["unconfirmed", "confirmed", "inactive"]),
  displayOrder: z.coerce.number().int().default(0),
});

export const indexingUpdateSchema = indexingCreateSchema.partial();
