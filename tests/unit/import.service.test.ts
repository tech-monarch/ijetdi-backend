import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const { uploadToR2, recognizeImageBuffer, renderPageToPngBuffer } = vi.hoisted(() => ({
  uploadToR2: vi.fn(),
  recognizeImageBuffer: vi.fn(),
  renderPageToPngBuffer: vi.fn(),
}));
vi.mock("../../src/config/r2.js", () => ({ uploadToR2 }));
vi.mock("../../src/modules/import/ocr.js", () => ({ recognizeImageBuffer }));
vi.mock("../../src/modules/import/renderPdfPage.js", () => ({ renderPageToPngBuffer }));

const { importDocument } = await import("../../src/modules/import/import.service.js");

const fixturesDir = join(__dirname, "../fixtures");

describe("importDocument (orchestration)", () => {
  beforeEach(() => {
    uploadToR2.mockReset();
    recognizeImageBuffer.mockReset();
    renderPageToPngBuffer.mockReset();
    uploadToR2.mockResolvedValue({ key: "article-import-sources/fake.pdf", url: "https://r2.example/fake.pdf" });
  });

  it("always uploads the original file first, before extraction", async () => {
    const buffer = readFileSync(join(fixturesDir, "heading-and-paragraph.pdf"));
    const result = await importDocument({ buffer, mimetype: "application/pdf", originalFilename: "doc.pdf" });

    expect(uploadToR2).toHaveBeenCalledTimes(1);
    expect(result.originalFileUrl).toBe("https://r2.example/fake.pdf");
    expect(result.originalFileName).toBe("doc.pdf");
  });

  it("DOCX and text-PDF give embedFallback: false", async () => {
    const pdfBuffer = readFileSync(join(fixturesDir, "heading-and-paragraph.pdf"));
    const pdfResult = await importDocument({ buffer: pdfBuffer, mimetype: "application/pdf", originalFilename: "a.pdf" });
    expect(pdfResult.embedFallback).toBe(false);
    expect(pdfResult.html).toContain("A Heading Line");

    const docxBuffer = readFileSync(join(fixturesDir, "heading-and-paragraph.docx"));
    const docxResult = await importDocument({
      buffer: docxBuffer,
      mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      originalFilename: "a.docx",
    });
    expect(docxResult.embedFallback).toBe(false);
    expect(docxResult.html).toContain("A Heading Line");
  });

  it("a scanned PDF where OCR also finds nothing usable gives embedFallback: true, with originalFileUrl still present", async () => {
    renderPageToPngBuffer.mockResolvedValue(Buffer.from("fake-png"));
    recognizeImageBuffer.mockResolvedValue("");

    const buffer = readFileSync(join(fixturesDir, "blank-no-text.pdf"));
    const result = await importDocument({ buffer, mimetype: "application/pdf", originalFilename: "scan.pdf" });

    expect(result.embedFallback).toBe(true);
    expect(result.html).toBe("");
    expect(result.originalFileUrl).toBe("https://r2.example/fake.pdf");
  });

  it("a scanned PDF where OCR succeeds with real content does NOT fall back", async () => {
    renderPageToPngBuffer.mockResolvedValue(Buffer.from("fake-png"));
    recognizeImageBuffer.mockResolvedValue(
      "A genuinely long recognized paragraph of text, comfortably over the minimum usable length threshold used for the embed-fallback decision.",
    );

    const buffer = readFileSync(join(fixturesDir, "blank-no-text.pdf"));
    const result = await importDocument({ buffer, mimetype: "application/pdf", originalFilename: "scan.pdf" });

    expect(result.embedFallback).toBe(false);
    expect(result.usedOcr).toBe(true);
    expect(result.html).toContain("genuinely long recognized paragraph");
  });

  it("an unsupported file type throws UNSUPPORTED_FILE_TYPE and never calls uploadToR2", async () => {
    const buffer = Buffer.from("plain text, not a supported format", "ascii");
    await expect(
      importDocument({ buffer, mimetype: "text/plain", originalFilename: "notes.txt" }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_FILE_TYPE" });

    expect(uploadToR2).not.toHaveBeenCalled();
  });

  it("an image is always OCR'd and never falls back (no embeddable concept for images)", async () => {
    recognizeImageBuffer.mockResolvedValue("Text recognized from a photographed page.");
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

    const result = await importDocument({ buffer, mimetype: "image/png", originalFilename: "page.png" });

    expect(result.usedOcr).toBe(true);
    expect(result.embedFallback).toBe(false);
    expect(result.html).toContain("Text recognized from a photographed page.");
  });
});
