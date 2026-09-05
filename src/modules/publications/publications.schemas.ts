import { z } from "zod";

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
  email: z.string().email().optional(),
  address: z.string().optional(),
  website: z.string().url().optional(),
  logo: z.string().url().optional(),
  cover: z.string().url().optional(),
  status: z.enum(["active", "archived"]),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

export const publicationUpdateSchema = publicationCreateSchema.partial();

// The "Archive" action is literally { status: "archived" } and nothing
// else — see API_DOCUMENTATION.md's Publications PATCH entry.
export const archiveOnlySchema = z.object({ status: z.literal("archived") });
