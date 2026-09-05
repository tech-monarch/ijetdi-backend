import { z } from "zod";

export const publisherCreateSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  logo: z.string().url().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  status: z.enum(["active", "archived"]),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

export const publisherUpdateSchema = publisherCreateSchema.partial();
