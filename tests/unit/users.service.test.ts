import { describe, expect, it, vi, beforeEach } from "vitest";

const { prisma, sendEmail, issuePasswordResetToken } = vi.hoisted(() => ({
  prisma: {
    user: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    reviewer: { findUnique: vi.fn() },
  },
  sendEmail: vi.fn(),
  issuePasswordResetToken: vi.fn(),
}));
vi.mock("../../src/config/db.js", () => ({ prisma }));
vi.mock("../../src/lib/email/sendEmail.js", () => ({ sendEmail }));
vi.mock("../../src/modules/auth/auth.service.js", () => ({ issuePasswordResetToken }));

const { createUser, updateUser, listUsers, getUserById } = await import("../../src/modules/users/users.service.js");

const FAKE_USER = {
  id: "user-1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "editorial_subadmin",
  reviewerId: null,
  active: true,
  passwordHash: "argon2-hash-should-never-leak",
};

describe("createUser / updateUser / listUsers / getUserById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.create.mockResolvedValue(FAKE_USER);
    prisma.user.update.mockResolvedValue(FAKE_USER);
    prisma.user.findMany.mockResolvedValue([FAKE_USER]);
    prisma.user.findUnique.mockResolvedValue(FAKE_USER);
    prisma.reviewer.findUnique.mockResolvedValue({ id: "reviewer-1" });
    issuePasswordResetToken.mockResolvedValue("https://frontend.example/reset-password?token=abc123");
  });

  it("never includes passwordHash in listUsers' output", async () => {
    const users = await listUsers();
    expect(users[0]).not.toHaveProperty("passwordHash");
  });

  it("never includes passwordHash in getUserById's output", async () => {
    const user = await getUserById("user-1");
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("never includes passwordHash in createUser's output", async () => {
    const user = await createUser({ name: "Ada Lovelace", email: "ada@example.com", role: "editorial_subadmin" });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("creates the account with a hashed placeholder password, then issues a real set-password link", async () => {
    await createUser({ name: "Ada Lovelace", email: "ada@example.com", role: "editorial_subadmin" });

    const createCall = prisma.user.create.mock.calls[0][0];
    expect(createCall.data.passwordHash).toBeTypeOf("string");
    expect(createCall.data.passwordHash.length).toBeGreaterThan(20); // a real argon2 hash, not a placeholder string
    expect(createCall.data).not.toHaveProperty("password");

    expect(issuePasswordResetToken).toHaveBeenCalledWith("user-1");
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ada@example.com",
        template: "user-account-created",
        data: expect.objectContaining({ setPasswordUrl: "https://frontend.example/reset-password?token=abc123" }),
      }),
    );
  });

  it("still creates the account even if the welcome email fails to send", async () => {
    sendEmail.mockRejectedValue(new Error("Resend is down"));
    const user = await createUser({ name: "Ada Lovelace", email: "ada@example.com", role: "editorial_subadmin" });
    expect(user.email).toBe("ada@example.com");
  });

  it("rejects linking a reviewerId that doesn't exist", async () => {
    prisma.reviewer.findUnique.mockResolvedValue(null);
    await expect(
      createUser({ name: "X", email: "x@example.com", role: "reviewer", reviewerId: "nope" }),
    ).rejects.toMatchObject({ code: "REVIEWER_NOT_FOUND" });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("rejects linking a reviewerId already linked to a different account", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: "some-other-user" }); // the reviewerId lookup inside assertReviewerLinkable
    await expect(
      createUser({ name: "X", email: "x@example.com", role: "reviewer", reviewerId: "reviewer-1" }),
    ).rejects.toMatchObject({ code: "REVIEWER_ALREADY_LINKED" });
  });

  it("updateUser rejects updating a nonexistent user", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(updateUser("nope", { active: false })).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });

  it("updateUser can deactivate an account", async () => {
    prisma.user.update.mockResolvedValue({ ...FAKE_USER, active: false });
    const user = await updateUser("user-1", { active: false });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" }, data: expect.objectContaining({ active: false }) }),
    );
    expect(user.active).toBe(false);
  });
});
