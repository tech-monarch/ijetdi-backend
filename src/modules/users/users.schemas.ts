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

// `password` is optional: an admin may set a specific initial password, or
// leave it out and have the server generate one (returned once, in the
// create response only — see users.service.ts's createUser). Either way a
// real "set your own password" link is ALSO always emailed, through the
// same single-use token mechanism forgot-password uses, so the user is
// never stuck with a password only the admin knows.
export const userCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: userRoleEnum,
  password: z.string().min(10, "Password must be at least 10 characters").optional(),
  // Only meaningful when role === "reviewer" — links this login to an
  // existing Reviewer profile so "My Reviews" resolves to the right
  // reviewerId. Validated against a real Reviewer record server-side in
  // the service, not trusted here.
  reviewerId: z.string().optional(),
});

// PATCH /api/admin/users/:id/password — an admin setting or resetting a
// specific user's password at will. `password` optional, same rule as
// create: omit it to have the server generate one (returned once).
// `notify` (default true) controls whether the user is emailed about the
// change, with a link to set their own password instead.
export const userSetPasswordSchema = z.object({
  password: z.string().min(10, "Password must be at least 10 characters").optional(),
  notify: z.boolean().optional(),
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
