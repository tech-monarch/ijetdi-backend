import { afterAll, beforeEach, describe, expect, it } from "vitest";
import argon2 from "argon2";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/config/db.js";
import { resetDatabase } from "./setup.js";

const app = createApp();

async function seedPublicationChain() {
  const publisher = await prisma.publisher.create({
    data: { slug: "test-pub", name: "Test Publisher", status: "active" },
  });
  const publication = await prisma.publication.create({
    data: {
      slug: "test-journal",
      publisherId: publisher.id,
      name: "Test Journal",
      shortName: "TJ",
      subjectAreaIds: [],
      status: "active",
    },
  });
  return { publisher, publication };
}

async function loginAsEditorialSubadmin() {
  const passwordHash = await argon2.hash("correct-horse-battery-staple");
  await prisma.user.create({
    data: { name: "Editor", email: "editor@example.com", passwordHash, role: "editorial_subadmin" },
  });
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "editor@example.com", password: "correct-horse-battery-staple" });
  return res.headers["set-cookie"];
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/articles (public)", () => {
  it("never returns a non-published article, even if it's the only one", async () => {
    const { publication } = await seedPublicationChain();
    await prisma.article.create({
      data: {
        slug: "draft-article",
        title: "A Draft",
        abstract: "Not ready yet.",
        publicationId: publication.id,
        articleType: "research",
        status: "draft",
        supplementaryFiles: [],
        references: [],
      },
    });

    const res = await request(app).get("/api/articles");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("returns a published article with resolved, ordered authors", async () => {
    const { publication } = await seedPublicationChain();
    const authorA = await prisma.author.create({
      data: { slug: "author-a", firstName: "A", lastName: "Author", fullName: "A Author" },
    });
    const authorB = await prisma.author.create({
      data: { slug: "author-b", firstName: "B", lastName: "Author", fullName: "B Author" },
    });
    await prisma.article.create({
      data: {
        slug: "published-article",
        title: "Published Work",
        abstract: "Ready.",
        publicationId: publication.id,
        articleType: "research",
        status: "published",
        publishedDate: new Date(),
        supplementaryFiles: [],
        references: [],
        authors: {
          create: [
            { authorId: authorB.id, position: 1 },
            { authorId: authorA.id, position: 0 },
          ],
        },
      },
    });

    const res = await request(app).get("/api/articles");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    // Byline order (position), not insertion order.
    expect(res.body.data[0].authors.map((a: { full_name: string }) => a.full_name)).toEqual([
      "A Author",
      "B Author",
    ]);
  });
});

describe("PATCH /api/admin/articles/:id/status", () => {
  it("rejects an illegal transition (draft -> published)", async () => {
    const { publication } = await seedPublicationChain();
    const cookie = await loginAsEditorialSubadmin();
    const article = await prisma.article.create({
      data: {
        slug: "wf-article",
        title: "Workflow Test",
        abstract: "...",
        publicationId: publication.id,
        articleType: "research",
        status: "draft",
        supplementaryFiles: [],
        references: [],
      },
    });

    const res = await request(app)
      .patch(`/api/admin/articles/${article.id}/status`)
      .set("Cookie", cookie)
      .send({ status: "published" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("allows the documented chain and stamps published_date automatically", async () => {
    const { publication } = await seedPublicationChain();
    const cookie = await loginAsEditorialSubadmin();
    const article = await prisma.article.create({
      data: {
        slug: "wf-article-2",
        title: "Workflow Test 2",
        abstract: "...",
        publicationId: publication.id,
        articleType: "research",
        status: "draft",
        supplementaryFiles: [],
        references: [],
      },
    });

    const chain: Array<[string]> = [
      ["submitted"],
      ["under_review"],
      ["accepted"],
      ["scheduled"],
      ["published"],
    ];

    let lastRes;
    for (const [status] of chain) {
      lastRes = await request(app)
        .patch(`/api/admin/articles/${article.id}/status`)
        .set("Cookie", cookie)
        .send({ status });
      expect(lastRes.status).toBe(200);
    }

    expect(lastRes!.body.data.status).toBe("published");
    expect(lastRes!.body.data.published_date).toBeTruthy();
  });
});
