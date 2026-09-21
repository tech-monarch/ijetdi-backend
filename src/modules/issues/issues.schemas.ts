import { z } from "zod";
import { optionalDate, optionalUrl } from "../../lib/zodHelpers.js";

export const issueCreateSchema = z.object({
  volumeId: z.string().min(1),
  publicationId: z.string().min(1),
  number: z.coerce.number().int(),
  label: z.string().min(1),
  period: z.string().optional(),
  publicationDate: optionalDate(),
  description: z.string().optional(),
  cover: optionalUrl(),
  status: z.enum(["published", "current", "archived"]),
});

export const issueUpdateSchema = issueCreateSchema.partial();
