import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../../config/db.js";
import { badRequest, notFound } from "../../lib/envelope.js";
import { sendEmail } from "../../lib/email/sendEmail.js";
import { issuePasswordResetToken } from "../auth/auth.service.js";
import type { userCreateSchema, userUpdateSchema } from "./users.schemas.js";
import type { z } from "zod";

// Never return passwordHash to any client, admin or otherwise — this is
// the one field in this whole model that must never leave the server.
function toPublicUser<T extends { passwordHash: string }>(user: T) {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
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
 * Creates a new staff/reviewer login. Deliberately never accepts a
 * password from the admin creating the account: a random, never-revealed
 * placeholder is hashed and stored purely to satisfy the NOT NULL
 * constraint, and the new user gets a real "set your password" link
 * through the exact same single-use token mechanism forgot-password
 * uses — the account has no usable password until they set one
 * themselves. This is the fix for "no way to create a staff login
 * without shell access to the database" — see PROJECT_STATUS.md.
 */
export async function createUser(data: z.infer<typeof userCreateSchema>) {
  if (data.reviewerId) await assertReviewerLinkable(data.reviewerId);

  const placeholderPassword = randomBytes(32).toString("hex");
  const passwordHash = await argon2.hash(placeholderPassword);

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
      data: { name: user.name, setPasswordUrl },
    });
  } catch {
    // Swallow: the account is already created. An admin can always
    // resend access via the existing "forgot password" flow if this
    // particular email didn't arrive.
  }

  return toPublicUser(user);
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
