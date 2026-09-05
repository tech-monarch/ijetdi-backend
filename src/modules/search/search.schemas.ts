import { z } from "zod";

export const searchQuerySchema = z.object({
  // Empty/missing q returns an empty result set, not a validation error —
  // matches the mock's documented behavior (docs/API_DOCUMENTATION.md,
  // "Search"). So no .min(1) here; the service checks for blank q itself.
  q: z.string().optional().default(""),
  publicationId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
