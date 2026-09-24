import { randomInt } from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../../config/db.js";
import { badRequest, notFound } from "../../lib/envelope.js";
import { sendEmail } from "../../lib/email/sendEmail.js";
import { issuePasswordResetToken } from "../auth/auth.service.js";
import type { userCreateSchema, userSetPasswordSchema, userUpdateSchema } from "./users.schemas.js";
import type { z } from "zod";

// Never return passwordHash to any client, admin or otherwise — this is
// the one field in this whole model that must never leave the server.
function toPublicUser<T extends { passwordHash: string }>(user: T) {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

// Unambiguous charset (no 0/O/1/l/I) so a generated password can be read
// aloud or copied without the usual mix-ups. 16 chars from this set is
// comfortably above the 10-char policy in userSetPasswordSchema/
// resetPasswordSchema.
const PASSWORD_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function generateTemporaryPassword(): string {
  let out = "";
  for (let i = 0; i < 16; i++) out += PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)];
  return out;
}

export async function listUsers() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return users.map(toPublicUser);
}

/** Single user detail — the admin Users edit form's pre-populate fetch. */
export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound("USER_NOT_FOUND", `Not found: ${id}`);
  return toPublicUser(user);
}

async function assertReviewerLinkable(reviewerId: string, excludingUserId?: string) {
  const reviewer = await prisma.reviewer.findUnique({ where: { id: reviewerId } });
  if (!reviewer) throw badRequest("REVIEWER_NOT_FOUND", "That reviewer profile doesn't exist.");

  const existingLink = await prisma.user.findUnique({ where: { reviewerId } });
  if (existingLink && existingLink.id !== excludingUserId) {
    throw badRequest("REVIEWER_ALREADY_LINKED", "That reviewer profile is already linked to another account.");
  }
}

/**
 * Creates a new staff/reviewer login. An admin may set the initial
 * password (data.password) or leave it out, in which case the server
 * generates one. Either way a real "set your own password" link is ALSO
 * always emailed, through the same single-use token mechanism
 * forgot-password uses, so the account is never left with a password
 * only the admin knows and never told the user. This is the fix for "no
 * way to create a staff login without shell access to the database" —
 * see PROJECT_STATUS.md — extended to let an admin optionally hand
 * someone a working password immediately instead of waiting on email.
 *
 * Returns `temporaryPassword` in the response ONLY when the server
 * generated it (data.password omitted) — it is never persisted anywhere
 * except the argon2 hash, and this is the only time it is ever visible.
 * When the admin supplied their own password, nothing is echoed back;
 * they already know it.
 */
export async function createUser(data: z.infer<typeof userCreateSchema>) {
  if (data.reviewerId) await assertReviewerLinkable(data.reviewerId);

  const generated = data.password ? null : generateTemporaryPassword();
  const passwordHash = await argon2.hash(data.password ?? generated!);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      reviewerId: data.reviewerId,
      passwordHash,
    },
  });

  const setPasswordUrl = await issuePasswordResetToken(user.id);
  try {
    await sendEmail({
      to: user.email,
      template: "user-account-created",
      data: { name: user.name, setPasswordUrl, hasTemporaryPassword: generated !== null },
    });
  } catch {
    // Swallow: the account is already created. An admin can always
    // resend access via the existing "forgot password" flow, or the new
    // PATCH .../password endpoint below, if this particular email didn't
    // arrive.
  }

  return { ...toPublicUser(user), ...(generated ? { temporaryPassword: generated } : {}) };
}

/**
 * An admin setting or resetting a specific user's password directly —
 * "at will", not gated behind that user requesting a reset. Same
 * provide-or-generate rule as createUser. Notifies the user by email
 * (default on; `notify: false` to suppress) with a link to set their own
 * password instead, so an admin-set password is never the only option.
 */
export async function setUserPassword(
  id: string,
  data: z.infer<typeof userSetPasswordSchema>,
) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw notFound("USER_NOT_FOUND", `Not found: ${id}`);

  const generated = data.password ? null : generateTemporaryPassword();
  const passwordHash = await argon2.hash(data.password ?? generated!);

  const user = await prisma.user.update({ where: { id }, data: { passwordHash } });

  if (data.notify !== false) {
    const setPasswordUrl = await issuePasswordResetToken(user.id);
    try {
      await sendEmail({
        to: user.email,
        template: "admin-password-changed",
        data: { name: user.name, setPasswordUrl },
      });
    } catch {
      // Swallow: the password is already changed. Same reasoning as createUser above.
    }
  }

  return { ...toPublicUser(user), ...(generated ? { temporaryPassword: generated } : {}) };
}

export async function updateUser(id: string, data: z.infer<typeof userUpdateSchema>) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw notFound("USER_NOT_FOUND", `Not found: ${id}`);

  if (data.reviewerId) await assertReviewerLinkable(data.reviewerId, id);

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      reviewerId: data.reviewerId,
      active: data.active,
    },
  });
  return toPublicUser(user);
}
