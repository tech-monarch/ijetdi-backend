import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const { uploadToR2 } = vi.hoisted(() => ({ uploadToR2: vi.fn() }));
vi.mock("../../src/config/r2.js", () => ({ uploadToR2 }));

// Import after the mock is registered (vi.mock is hoisted above this
// anyway by vitest's transform, but importing after keeps the file
// readable top-to-bottom).
const { importDocx } = await import("../../src/modules/import/docxImporter.js");

const fixturesDir = join(__dirname, "../fixtures");

describe("importDocx", () => {
  beforeEach(() => {
    uploadToR2.mockReset();
  });

  it("converts a real docx to semantic HTML", async () => {
    const buffer = readFileSync(join(fixturesDir, "heading-and-paragraph.docx"));
    const result = await importDocx(buffer);
    expect(result.html).toContain("<h1>A Heading Line</h1>");
    expect(result.html).toContain("<p>This is a body paragraph for the docx fixture test.</p>");
  });

  it("surfaces mammoth's real warnings (e.g. an undefined referenced style)", async () => {
    const buffer = readFileSync(join(fixturesDir, "heading-and-paragraph.docx"));
    const result = await importDocx(buffer);
    // This fixture references "Heading1" without defining it in styles.xml
    // — mammoth genuinely warns about this; asserting it here confirms
    // warnings really flow through, not just that conversion succeeded.
    expect(result.warnings.some((w) => w.toLowerCase().includes("heading1"))).toBe(true);
  });

  it("never calls uploadToR2 when the docx has no embedded images", async () => {
    const buffer = readFileSync(join(fixturesDir, "heading-and-paragraph.docx"));
    await importDocx(buffer);
    expect(uploadToR2).not.toHaveBeenCalled();
  });
});
