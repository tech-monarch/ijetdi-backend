import { z } from "zod";
import { optionalEmail, optionalUrl } from "../../lib/zodHelpers.js";

export const publisherCreateSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  logo: optionalUrl(),
  address: z.string().optional(),
  country: z.string().optional(),
  website: optionalUrl(),
  email: optionalEmail(),
  phone: z.string().optional(),
  status: z.enum(["active", "archived"]),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

export const publisherUpdateSchema = publisherCreateSchema.partial();
