import { z } from "zod";
import { optionalEmail, optionalUrl } from "../../lib/zodHelpers.js";

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
  profileImage: optionalUrl(),
  website: optionalUrl(),
  email: optionalEmail(),
});

export const authorUpdateSchema = authorCreateSchema.partial();
