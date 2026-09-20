import { recognizeImageBuffer } from "./ocr.js";

export interface ImageImportResult {
  html: string;
  warnings: string[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Thin wrapper: OCR the image, split into paragraphs on blank lines, wrap
// each in <p>. Always warns that this used OCR — per the spec's explicit
// requirement to flag OCR usage clearly, since it may contain errors.
export async function importImage(buffer: Buffer): Promise<ImageImportResult> {
  const text = await recognizeImageBuffer(buffer);
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const html = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  const warnings = [
    "This content was extracted using OCR and may contain errors — please review carefully before publishing.",
  ];

  return { html, warnings };
}
