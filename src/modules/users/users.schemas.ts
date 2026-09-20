import { z } from "zod";

const userRoleEnum = z.enum([
  "super_admin",
  "admin",
  "editorial_subadmin",
  "publication_subadmin",
  "seo_subadmin",
  "support_subadmin",
  "reviewer",
]);

// No `password` field here, deliberately — see users.service.ts's
// createUser: new accounts get a real, single-use "set your password"
// link via the same token mechanism as forgot-password, never a
// plaintext initial password chosen by the admin and emailed around.
export const userCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: userRoleEnum,
  // Only meaningful when role === "reviewer" — links this login to an
  // existing Reviewer profile so "My Reviews" resolves to the right
  // reviewerId. Validated against a real Reviewer record server-side in
  // the service, not trusted here.
  reviewerId: z.string().optional(),
});

// role is intentionally excludable from a partial update the same as
// every other field — an admin correcting a name/email doesn't need to
// resend the role. active toggles access without a real delete.
export const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: userRoleEnum.optional(),
  reviewerId: z.string().nullable().optional(),
  active: z.boolean().optional(),
});
