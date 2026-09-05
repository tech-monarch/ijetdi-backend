import { z } from "zod";

export const authorCreateSchema = z.object({
  slug: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  fullName: z.string().min(1),
  institution: z.string().optional(),
  department: z.string().optional(),
  country: z.string().optional(),
  bio: z.string().optional(),
  orcid: z.string().optional(),
  profileImage: z.string().url().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
});

export const authorUpdateSchema = authorCreateSchema.partial();
