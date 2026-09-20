import { describe, expect, it } from "vitest";
import { chunkArticle } from "../../src/modules/research-assistant/chunking.js";

const word = (n: number, w = "word") => Array.from({ length: n }, () => w).join(" ");

describe("research-assistant: chunkArticle", () => {
  it("produces a dedicated Title chunk and Abstract chunk first", () => {
    const chunks = chunkArticle({ title: "My Article", abstract: "An abstract.", content: null });
    expect(chunks[0]).toEqual({ sectionName: "Title", chunkText: "My Article", chunkIndex: 0 });
    expect(chunks[1]).toEqual({ sectionName: "Abstract", chunkText: "An abstract.", chunkIndex: 1 });
  });

  it("skips a null/empty content field entirely", () => {
    const chunks = chunkArticle({ title: "T", abstract: "A", content: null });
    expect(chunks).toHaveLength(2);
  });

  it("strips HTML tags and decodes entities from stored content, preserving paragraph breaks", () => {
    const content = "<p>First <strong>paragraph</strong> here &amp; more.</p><h2>A heading</h2><p>Second one.</p>";
    const chunks = chunkArticle({ title: "T", abstract: "A", content });
    const body = chunks.filter((c) => c.sectionName === "Content");
    const joined = body.map((c) => c.chunkText).join(" ");
    expect(joined).not.toMatch(/<[^>]+>/);
    expect(joined).toContain("First paragraph here & more.");
    expect(joined).toContain("A heading");
    expect(joined).toContain("Second one.");
  });

  it("keeps a short body as a single Content chunk", () => {
    const content = "First paragraph here.\n\nSecond paragraph here.";
    const chunks = chunkArticle({ title: "T", abstract: "A", content });
    const bodyChunks = chunks.filter((c) => c.sectionName === "Content");
    expect(bodyChunks).toHaveLength(1);
    expect(bodyChunks[0].chunkText).toContain("First paragraph");
    expect(bodyChunks[0].chunkText).toContain("Second paragraph");
  });

  it("splits a long body into multiple chunks, each under the max word ceiling", () => {
    // 5 paragraphs of 300 words each = 1500 words, comfortably over one
    // ~700-word target chunk, so this must split into at least 2 chunks.
    const paragraphs = Array.from({ length: 5 }, (_, i) => word(300, `p${i}`));
    const content = paragraphs.join("\n\n");
    const chunks = chunkArticle({ title: "T", abstract: "A", content });
    const bodyChunks = chunks.filter((c) => c.sectionName === "Content");
    expect(bodyChunks.length).toBeGreaterThan(1);
    for (const c of bodyChunks) {
      // Generous ceiling check — a single oversized paragraph is allowed
      // to exceed the target, but not by an unbounded amount once overlap
      // is added back in.
      expect(c.chunkText.split(/\s+/).length).toBeLessThan(1300);
    }
  });

  it("carries a small word-overlap into the next chunk when splitting", () => {
    const paragraphs = Array.from({ length: 5 }, (_, i) => word(300, `p${i}`));
    const content = paragraphs.join("\n\n");
    const chunks = chunkArticle({ title: "T", abstract: "A", content });
    const bodyChunks = chunks.filter((c) => c.sectionName === "Content");
    // The tail words of chunk N should reappear at the head of chunk N+1.
    const firstChunkWords = bodyChunks[0].chunkText.split(/\s+/);
    const lastWordOfFirst = firstChunkWords[firstChunkWords.length - 1];
    expect(bodyChunks[1].chunkText.split(/\s+/).slice(0, 5)).toContain(lastWordOfFirst);
  });

  it("merges very short trailing paragraphs forward instead of leaving a near-empty chunk", () => {
    const content = `${word(50)}\n\nShort.`;
    const chunks = chunkArticle({ title: "T", abstract: "A", content });
    const bodyChunks = chunks.filter((c) => c.sectionName === "Content");
    expect(bodyChunks).toHaveLength(1);
    expect(bodyChunks[0].chunkText).toContain("Short.");
  });

  it("assigns sequential chunkIndex across title, abstract, and body", () => {
    const content = "One paragraph.";
    const chunks = chunkArticle({ title: "T", abstract: "A", content });
    expect(chunks.map((c) => c.chunkIndex)).toEqual(chunks.map((_, i) => i));
  });
});
