import argon2 from "argon2";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "../../config/db.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../lib/envelope.js";
import { permissionsForRole } from "../../lib/permissions.js";
import { sendEmail } from "../../lib/email/sendEmail.js";
import type { AuthenticatedUser } from "../../types/express.js";

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  role: AuthenticatedUser["role"];
  reviewerId: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    reviewerId: user.reviewerId,
    permissions: permissionsForRole(user.role),
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Don't distinguish "wrong email" from "wrong password" in the
  // message, to avoid leaking which emails are registered — per
  // API_DOCUMENTATION.md's Auth section. A deactivated account gets the
  // same generic message too, for the same reason — confirming "this
  // account exists but is deactivated" is itself information leakage.
  const invalidCredentials = () => new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");

  if (!user) throw invalidCredentials();
  if (!user.active) throw invalidCredentials();

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) throw invalidCredentials();

  return toPublicUser(user);
}

export async function getMe(userId: string | undefined) {
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return toPublicUser(user);
}

/**
 * Issues a real, single-use, expiring password-reset token for a given
 * user and returns the frontend URL to complete it. Factored out of
 * forgotPassword() below so users.service.ts's createUser can reuse the
 * exact same token mechanism for a new account's "set your password"
 * link, rather than ever emailing a plaintext initial password.
 */
export async function issuePasswordResetToken(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });

  return `${env.FRONTEND_BASE_URL.replace(/\/$/, "")}/reset-password?token=${rawToken}`;
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always behave the same regardless of whether the email exists —
  // don't leak account existence. Only proceed to issue a token/send an
  // email when a user actually matched.
  if (!user) return;

  const resetUrl = await issuePasswordResetToken(user.id);

  await sendEmail({
    to: user.email,
    template: "password-reset",
    data: { resetUrl },
  });
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  const invalidToken = () => new ApiError(400, "INVALID_TOKEN", "This reset link is invalid or has expired.");

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw invalidToken();
  }

  const passwordHash = await argon2.hash(newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
}
