import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression tests for a class of bug that whole-Prisma mocks normally hide:
// inside `prisma.$transaction(async (tx) => …)`, EVERY read/write must go through
// `tx`. A helper that reaches for the global `prisma` runs on a different
// connection — it can't see the transaction's uncommitted rows (createArticle
// 404'd on the row it had just inserted; updateArticle returned pre-update
// authors) and its writes commit independently of the transaction.
//
// The mock here makes the global client THROW on any model access, so a leak
// fails the test instead of silently working against a shared fake.

const { prisma, tx, calls } = vi.hoisted(() => {
  const calls: string[] = [];
  const track = (name: string, value: unknown = {}) =>
    vi.fn(async (..._a: unknown[]) => {
      calls.push(name);
      return value;
    });
  const tx = {
    article: {
      create: track("tx.article.create", { id: "a1" }),
      update: track("tx.article.update", { id: "a1" }),
      findUnique: track("tx.article.findUnique", { id: "a1", authors: [], editors: [] }),
    },
    articleAuthor: { createMany: track("tx.articleAuthor.createMany"), deleteMany: track("tx.articleAuthor.deleteMany") },
    issue: { create: track("tx.issue.create", { id: "i1" }), update: track("tx.issue.update", { id: "i1" }), updateMany: track("tx.issue.updateMany") },
  };
  const leak = (path: string) => () => {
    throw new Error(`global prisma used inside a transaction: ${path}`);
  };
  const prisma = {
    $transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
    article: { findUnique: vi.fn(), create: leak("article.create") },
    issue: { findUnique: vi.fn(), updateMany: leak("issue.updateMany") },
    volume: { findUnique: vi.fn() },
  };
  return { prisma, tx, calls };
});
vi.mock("../../src/config/db.js", () => ({ prisma }));
vi.mock("../../src/modules/research-assistant/ingestion.service.js", () => ({ ingestArticle: vi.fn(), deleteArticleChunks: vi.fn() }));

const articles = await import("../../src/modules/articles/articles.service.js");
const issues = await import("../../src/modules/issues/issues.service.js");

beforeEach(() => {
  calls.length = 0;
  vi.clearAllMocks();
  prisma.volume.findUnique.mockResolvedValue({ id: "v1", publicationId: "p1" });
  prisma.article.findUnique.mockResolvedValue({ id: "a1", status: "draft", title: "t" });
});

describe("article transactions read back through tx", () => {
  const base = { slug: "s", title: "t", abstract: "a", publicationId: "p1", articleType: "x", status: "draft" as const, authorIds: ["au1"], editorIds: [], supplementaryFiles: [], references: [], keywords: [] };

  it("createArticle re-reads the new row with the tx client (never the global one)", async () => {
    await articles.createArticle(base as never);
    expect(tx.article.findUnique).toHaveBeenCalled();
    expect(prisma.article.findUnique).not.toHaveBeenCalled();
  });

  it("updateArticle re-reads the updated row with the tx client", async () => {
    await articles.updateArticle("a1", { title: "new", authorIds: ["au2"] } as never, { canPublish: false });
    expect(tx.article.findUnique).toHaveBeenCalled();
    // the only global read is the pre-transaction existence check
    expect(prisma.article.findUnique).toHaveBeenCalledTimes(1);
  });
});

describe("issue current-swap", () => {
  const data = { publicationId: "p1", volumeId: "v1", number: 1, label: "L", status: "current" as const };

  it("createIssue demotes through tx, and BEFORE writing the new current row", async () => {
    await issues.createIssue(data as never);
    expect(calls.indexOf("tx.issue.updateMany")).toBeGreaterThanOrEqual(0);
    expect(calls.indexOf("tx.issue.updateMany")).toBeLessThan(calls.indexOf("tx.issue.create"));
  });

  it("updateIssue to current demotes through tx first, excluding itself", async () => {
    prisma.issue.findUnique.mockResolvedValue({ id: "i1", publicationId: "p1", volumeId: "v1", status: "published" });
    await issues.updateIssue("i1", { status: "current" } as never);
    expect(calls.indexOf("tx.issue.updateMany")).toBeLessThan(calls.indexOf("tx.issue.update"));
    expect(tx.issue.updateMany.mock.calls[0][0].where.id).toEqual({ not: "i1" });
  });

  it("a non-current issue triggers no demotion", async () => {
    await issues.createIssue({ ...data, status: "published" } as never);
    expect(tx.issue.updateMany).not.toHaveBeenCalled();
  });
});
