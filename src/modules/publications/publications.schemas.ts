import { z } from "zod";
import { optionalEmail, optionalUrl } from "../../lib/zodHelpers.js";

export const publicationCreateSchema = z.object({
  slug: z.string().min(1),
  publisherId: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().min(1),
  tagline: z.string().optional(),
  issnOnline: z.string().optional(),
  issnPrint: z.string().optional(),
  founded: z.string().optional(),
  frequency: z.string().optional(),
  language: z.string().optional(),
  country: z.string().optional(),
  reviewModel: z.string().optional(),
  accessModel: z.string().optional(),
  subjectAreaIds: z.array(z.string()).default([]),
  email: optionalEmail(),
  address: z.string().optional(),
  website: optionalUrl(),
  logo: optionalUrl(),
  cover: optionalUrl(),
  // Rich-text HTML body for the publication's own public page. See
  // prisma/schema.prisma's Publication.content field comment for why
  // this exists and how it's sanitized. Empty string is a genuinely
  // valid "no content written yet" value here (unlike the URL/email
  // fields above) — don't route this through zodHelpers.ts's
  // empty-string-means-absent helpers, that solves a different problem.
  content: z.string().optional(),
  status: z.enum(["active", "archived"]),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

export const publicationUpdateSchema = publicationCreateSchema.partial();

// The "Archive" action is literally { status: "archived" } and nothing
// else — see API_DOCUMENTATION.md's Publications PATCH entry.
export const archiveOnlySchema = z.object({ status: z.literal("archived") });
