import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const { renderPageToPngBuffer, recognizeImageBuffer } = vi.hoisted(() => ({
  renderPageToPngBuffer: vi.fn(),
  recognizeImageBuffer: vi.fn(),
}));
vi.mock("../../src/modules/import/renderPdfPage.js", () => ({ renderPageToPngBuffer }));
vi.mock("../../src/modules/import/ocr.js", () => ({ recognizeImageBuffer }));

const { importPdf } = await import("../../src/modules/import/pdfImporter.js");

const fixturesDir = join(__dirname, "../fixtures");

describe("importPdf", () => {
  beforeEach(() => {
    renderPageToPngBuffer.mockReset();
    recognizeImageBuffer.mockReset();
  });

  it("extracts real text-layer content and never calls OCR for a text-based PDF", async () => {
    const buffer = readFileSync(join(fixturesDir, "heading-and-paragraph.pdf"));
    const result = await importPdf(buffer);

    expect(result.usedOcr).toBe(false);
    expect(result.pageCount).toBe(1);
    expect(result.html).toContain("<h2>A Heading Line</h2>");
    expect(result.html).toContain("This is a body paragraph");
    expect(renderPageToPngBuffer).not.toHaveBeenCalled();
    expect(recognizeImageBuffer).not.toHaveBeenCalled();
  });

  it("falls back to OCR for a scanned page (near-zero extractable text) and folds the result in", async () => {
    renderPageToPngBuffer.mockResolvedValue(Buffer.from("fake-png-bytes"));
    recognizeImageBuffer.mockResolvedValue("Recognized text from the scanned page.");

    const buffer = readFileSync(join(fixturesDir, "blank-no-text.pdf"));
    const result = await importPdf(buffer);

    expect(renderPageToPngBuffer).toHaveBeenCalledTimes(1);
    expect(recognizeImageBuffer).toHaveBeenCalledTimes(1);
    expect(result.usedOcr).toBe(true);
    expect(result.html).toContain("Recognized text from the scanned page.");
    expect(result.warnings.some((w) => w.toLowerCase().includes("ocr"))).toBe(true);
  });

  it("warns (without throwing) when OCR on a scanned page finds nothing usable", async () => {
    renderPageToPngBuffer.mockResolvedValue(Buffer.from("fake-png-bytes"));
    recognizeImageBuffer.mockResolvedValue("   ");

    const buffer = readFileSync(join(fixturesDir, "blank-no-text.pdf"));
    const result = await importPdf(buffer);

    expect(result.usedOcr).toBe(false);
    expect(result.html).toBe("");
    expect(result.warnings.some((w) => w.includes("no usable text"))).toBe(true);
  });

  it("warns (without throwing) when OCR itself fails on a scanned page", async () => {
    renderPageToPngBuffer.mockResolvedValue(Buffer.from("fake-png-bytes"));
    recognizeImageBuffer.mockRejectedValue(new Error("OCR worker failed to initialize in time"));

    const buffer = readFileSync(join(fixturesDir, "blank-no-text.pdf"));
    const result = await importPdf(buffer);

    expect(result.usedOcr).toBe(false);
    expect(result.html).toBe("");
    expect(result.warnings.some((w) => w.includes("OCR failed"))).toBe(true);
  });
});
