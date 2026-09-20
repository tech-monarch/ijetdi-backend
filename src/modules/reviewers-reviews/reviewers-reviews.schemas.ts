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

// POST /api/admin/reviews — assigning a reviewer to a manuscript.
export const reviewCreateSchema = z.object({
  manuscriptId: z.string().min(1),
  reviewerId: z.string().min(1),
  dueDate: z.coerce.date().optional(),
});

// PATCH /api/reviewer/reviews/:id — the reviewer's own submission. Never
// includes manuscriptId/reviewerId/dueDate — those are assignment
// details the reviewer doesn't control, set only via the admin endpoint
// above.
export const reviewSelfUpdateSchema = z.object({
  recommendation: z.enum(["accept", "minor_revision", "major_revision", "reject"]).optional(),
  comments: z.string().optional(),
  status: z.enum(["completed", "declined"]),
});
