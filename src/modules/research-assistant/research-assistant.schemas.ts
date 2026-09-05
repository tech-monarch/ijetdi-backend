import { z } from "zod";

// Matches docs/AI_RESEARCH_ASSISTANT.md §2's request shape exactly.
// `filters` is optional and every key inside it is optional — mirrors the
// frontend's ResearchAssistantFilters.jsx, which only ever sends the keys
// the visitor actually set.
export const researchAssistantQuerySchema = z.object({
  // No .min(1) here — a blank question needs the specific EMPTY_QUERY
  // error code documented in docs/AI_RESEARCH_ASSISTANT.md §2, not the
  // generic VALIDATION_ERROR validateBody would produce. The service
  // checks for blank/whitespace-only question itself.
  question: z.string(),
  filters: z
    .object({
      publicationId: z.string().optional(),
      authorId: z.string().optional(),
      area: z.string().optional(),
      year: z.coerce.number().int().optional(),
    })
    .optional()
    .default({}),
  // .nullable() as well as .optional(): the frontend's conversationIdRef
  // starts as `null` (not merely absent) before any turn has happened,
  // and JSON.stringify keeps `null` values (unlike `undefined`, which
  // gets dropped from the payload entirely) — so the wire request
  // genuinely contains `"conversationId": null` on a fresh conversation.
  // Without .nullable() here, Zod rejects that null as a type error
  // (expected string, received null) and the whole request 400s before
  // ever reaching the service. Caught by testing this for real against a
  // live frontend, not just reasoning about the shape in isolation.
  conversationId: z.string().nullable().optional(),
});
