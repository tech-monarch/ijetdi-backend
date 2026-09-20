import { z } from "zod";

// multipart/form-data fields arrive as strings (including the JSON-encoded
// additionalAuthors array) — the routes layer parses the raw body into
// this shape before validation, same pattern as any other multipart
// endpoint in this backend (see import.routes.ts for the file-only case;
// this one also carries real form fields alongside the file).

const authorInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  institution: z.string().optional(),
});

export const submissionCreateSchema = z.object({
  title: z.string().min(1),
  abstract: z.string().min(1),
  articleType: z.string().min(1),
  area: z.string().optional(),
  publicationId: z.string().min(1),
  correspondingAuthor: authorInputSchema,
  // Co-authors, in byline order after the corresponding author. Optional
  // — many submissions are single-author.
  additionalAuthors: z.array(authorInputSchema).default([]),
});
