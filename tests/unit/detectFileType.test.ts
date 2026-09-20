import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { detectImportFileKind } from "../../src/modules/import/detectFileType.js";

const fixturesDir = join(__dirname, "../fixtures");

describe("detectImportFileKind", () => {
  it("detects a real PDF by magic bytes, regardless of mimetype", () => {
    const buffer = readFileSync(join(fixturesDir, "heading-and-paragraph.pdf"));
    expect(detectImportFileKind("application/octet-stream", buffer)).toBe("pdf");
    expect(detectImportFileKind("application/pdf", buffer)).toBe("pdf");
  });

  it("detects a real DOCX by zip magic bytes + a plausible mimetype", () => {
    const buffer = readFileSync(join(fixturesDir, "heading-and-paragraph.docx"));
    expect(
      detectImportFileKind(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        buffer,
      ),
    ).toBe("docx");
    // Browsers/clients sometimes send a generic mimetype for docx.
    expect(detectImportFileKind("application/octet-stream", buffer)).toBe("docx");
  });

  it("does not classify an arbitrary zip as docx when the mimetype disagrees", () => {
    const buffer = readFileSync(join(fixturesDir, "heading-and-paragraph.docx"));
    expect(detectImportFileKind("application/zip-but-not-really", buffer)).toBeNull();
  });

  it("detects JPEG by magic bytes", () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectImportFileKind("application/octet-stream", buffer)).toBe("image");
  });

  it("detects PNG by magic bytes", () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectImportFileKind("application/octet-stream", buffer)).toBe("image");
  });

  it("detects WEBP by RIFF....WEBP magic bytes", () => {
    const buffer = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("WEBP", "ascii"),
    ]);
    expect(detectImportFileKind("application/octet-stream", buffer)).toBe("image");
  });

  it("falls back to mimetype for images when magic bytes are inconclusive", () => {
    const buffer = Buffer.from("not a real image", "ascii");
    expect(detectImportFileKind("image/jpeg", buffer)).toBe("image");
  });

  it("returns null for an unsupported file", () => {
    const buffer = Buffer.from("plain text file", "ascii");
    expect(detectImportFileKind("text/plain", buffer)).toBeNull();
  });
});
