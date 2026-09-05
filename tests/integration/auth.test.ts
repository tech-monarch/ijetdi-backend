import { afterAll, beforeEach, describe, expect, it } from "vitest";
import argon2 from "argon2";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/config/db.js";
import { resetDatabase } from "./setup.js";

const app = createApp();

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /health", () => {
  it("returns 200 with no auth needed", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("auth flow", () => {
  async function createUser(role: "super_admin" | "publication_subadmin" = "super_admin") {
    const passwordHash = await argon2.hash("correct-horse-battery-staple");
    return prisma.user.create({
      data: { name: "Test Admin", email: "admin@example.com", passwordHash, role },
    });
  }

  it("rejects login with wrong password", async () => {
    await createUser();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("logs in, persists a session cookie, and returns snake_case user fields", async () => {
    await createUser();
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "correct-horse-battery-staple" });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.user.email).toBe("admin@example.com");
    // Snake_case per the documented API convention (see README).
    expect(loginRes.body.data.user).toHaveProperty("reviewer_id");

    const cookie = loginRes.headers["set-cookie"];
    expect(cookie).toBeTruthy();

    const meRes = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(meRes.body.data.email).toBe("admin@example.com");

    const logoutRes = await request(app).post("/api/auth/logout").set("Cookie", cookie);
    expect(logoutRes.status).toBe(200);

    const meAfterLogout = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(meAfterLogout.body.data).toBeNull();
  });

  it("blocks a permission-gated admin route without the right role", async () => {
    await createUser("publication_subadmin"); // has no reviewers.manage
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "correct-horse-battery-staple" });
    const cookie = loginRes.headers["set-cookie"];

    const res = await request(app).get("/api/admin/reviewers").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });
});
