import { z } from "zod";
import { optionalUrl } from "../../lib/zodHelpers.js";

const editorRoleEnum = z.enum([
  "editor_in_chief",
  "managing_editor",
  "associate_editor",
  "section_editor",
  "board_member",
  "guest_editor",
]);

export const editorCreateSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  role: editorRoleEnum,
  publicationId: z.string().min(1),
  institution: z.string().optional(),
  country: z.string().optional(),
  bio: z.string().optional(),
  profileImage: optionalUrl(),
  orcid: z.string().optional(),
  researchInterests: z.array(z.string()).default([]),
  displayOrder: z.coerce.number().int().default(0),
  status: z.enum(["active", "inactive"]),
});

export const editorUpdateSchema = editorCreateSchema.partial();
