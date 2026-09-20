import { z } from "zod";
import { optionalUrl } from "../../lib/zodHelpers.js";

export const indexingCreateSchema = z.object({
  publicationId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  url: optionalUrl(),
  logo: optionalUrl(),
  status: z.enum(["unconfirmed", "confirmed", "inactive"]),
  displayOrder: z.coerce.number().int().default(0),
});

export const indexingUpdateSchema = indexingCreateSchema.partial();
