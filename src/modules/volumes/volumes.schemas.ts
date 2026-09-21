import { z } from "zod";
import { optionalInt } from "../../lib/zodHelpers.js";

export const volumeCreateSchema = z.object({
  publicationId: z.string().min(1),
  number: z.coerce.number().int(),
  year: optionalInt(),
  description: z.string().optional(),
  status: z.enum(["active", "archived"]),
});

export const volumeUpdateSchema = volumeCreateSchema.partial();
