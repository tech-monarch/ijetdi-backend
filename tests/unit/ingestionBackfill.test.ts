import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression tests for backfillMissingPublished — the engine behind
// `npm run ingest:missing`, meant to run unattended on every deploy. Must
// select only published articles with zero chunks, and one article's
// failure must not stop the rest or throw out of the function.
//
// Runs the REAL ingestArticle (not a stand-in), mocked only at its own
// true dependency boundary (embedText, and the raw chunk-insert), so this
// exercises backfillMissingPublished's actual per-article try/catch.

const { prisma, embedText } = vi.hoisted(() => ({
  prisma: {
    article: { findMany: vi.fn(), findUnique: vi.fn() },
    articleChunk: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    $executeRaw: vi.fn(async () => 1),
  },
  embedText: vi.fn(async () => Array(768).fill(0.01)),
}));
vi.mock("../../src/config/db.js", () => ({ prisma }));
vi.mock("../../src/lib/gemini.js", () => ({ embedText, generateAnswer: vi.fn() }));

const { backfillMissingPublished } = await import("../../src/modules/research-assistant/ingestion.service.js");

function article(id: string, title: string) {
  return { id, title, status: "published", content: `<p>${title} body text long enough to chunk.</p>`, abstract: "Abs." };
}

beforeEach(() => {
  vi.clearAllMocks();
  embedText.mockResolvedValue(Array(768).fill(0.01));
});

describe("backfillMissingPublished", () => {
  it("only queries published articles with zero chunks", async () => {
    prisma.article.findMany.mockResolvedValueOnce([]);
    await backfillMissingPublished();
    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "published", chunks: { none: {} } } }),
    );
  });

  it("does nothing and reports zero on a clean run (nothing missing)", async () => {
    prisma.article.findMany.mockResolvedValueOnce([]);
    const result = await backfillMissingPublished();
    expect(result).toEqual({ articlesProcessed: 0, chunksWritten: 0, failures: [] });
  });

  it("one article's real ingestArticle failure does not stop the rest, and is reported", async () => {
    prisma.article.findMany.mockResolvedValueOnce([
      { id: "a1", title: "First" },
      { id: "a2", title: "Second (will fail)" },
      { id: "a3", title: "Third" },
    ]);
    prisma.article.findUnique.mockImplementation(async ({ where: { id } }: { where: { id: string } }) =>
      article(id, { a1: "First", a2: "Second (will fail)", a3: "Third" }[id] ?? id),
    );
    embedText.mockImplementation(async (text: string) => {
      if (text.includes("will fail")) throw new Error("Gemini embedding request failed (403): blocked");
      return Array(768).fill(0.01);
    });

    const progress: string[] = [];
    const result = await backfillMissingPublished((_done, _total, title) => progress.push(title));

    expect(progress).toEqual(["First", "Second (will fail)", "Third"]); // a3 still ran despite a2 throwing
    expect(result.failures).toEqual([{ id: "a2", title: "Second (will fail)", error: "Gemini embedding request failed (403): blocked" }]);
    expect(result.articlesProcessed).toBe(3);
    expect(result.chunksWritten).toBe(6); // a1 (3 chunks) + a3 (3 chunks), a2 wrote 0
    // deleteArticleChunks runs (via ingestArticle) for every attempted article, including the one that then fails
    expect(prisma.articleChunk.deleteMany).toHaveBeenCalledTimes(3);
  });
});
