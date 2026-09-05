import { z } from "zod";

export const reviewerCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  institution: z.string().optional(),
  country: z.string().optional(),
  expertise: z.array(z.string()).default([]),
  status: z.enum(["active", "inactive"]),
});

export const reviewerUpdateSchema = reviewerCreateSchema.partial();

export const reviewListQuerySchema = z.object({
  manuscriptId: z.string().optional(),
  reviewerId: z.string().optional(),
});
