import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { renderPageToPngBuffer } from "./renderPdfPage.js";
import { recognizeImageBuffer } from "./ocr.js";

export interface PdfImportResult {
  html: string;
  warnings: string[];
  usedOcr: boolean;
  pageCount: number;
}

// OCR is slow (each page is a real, multi-second Tesseract pass), and the
// whole import endpoint is currently one synchronous HTTP request/response.
// An unbounded scanned document could make one request run for minutes
// with no way for the client to know it's still working, or hit a
// platform request timeout. Pages beyond this limit are dropped with an
// explicit warning, never silently truncated. A background-job/queue-based
// pipeline would be the real production answer for large scanned
// documents — a genuine, flagged follow-up, not built here.
export const MAX_OCR_PAGES = 20;

// A real scanned page "succeeds" at text extraction with zero/near-zero
// characters rather than throwing — that's the practical signal used here
// to decide a page is image-based and needs OCR.
const SCANNED_PAGE_CHAR_THRESHOLD = 20;

interface TextItemLike {
  str: string;
  transform: number[];
}

function hasTransform(item: unknown): boolean {
  // getTextContent()'s items are a union (TextItem | TextMarkedContent) —
  // only TextItem has .transform. Both branches of the union have .str,
  // so filtering on "str" in item would NOT actually narrow the type;
  // TypeScript correctly complains that .transform might not exist if we
  // try that. Filter on "transform" instead. Deliberately not typed as a
  // `value is TextItemLike` type-guard predicate: TypeScript's
  // Array.prototype.filter only picks its narrowing overload when the
  // guarded type is a structural subtype of the array's element type —
  // our local TextItemLike (a minimal shape) isn't one of pdfjs-dist's
  // real TextItem (which carries many more fields), so that overload
  // silently doesn't apply and the result stays unnarrowed. A manual
  // loop with an explicit cast (below) avoids relying on that at all.
  return typeof item === "object" && item !== null && "transform" in item;
}

interface Line {
  text: string;
  fontSize: number;
  y: number;
}

function groupIntoLines(items: TextItemLike[]): Line[] {
  // Group text items into lines by Y-position — items within ~2 units of
  // each other's Y are treated as the same line. PDF has no semantic line
  // structure to query directly; this is an approximation.
  const sorted = [...items].sort((a, b) => b.transform[5] - a.transform[5]);
  const lines: Line[] = [];
  for (const item of sorted) {
    const y = item.transform[5];
    const fontSize = item.transform[0];
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - y) <= 2) {
      last.text += item.str;
      last.fontSize = Math.max(last.fontSize, fontSize);
    } else {
      lines.push({ text: item.str, fontSize, y });
    }
  }
  return lines.filter((l) => l.text.trim().length > 0);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isHeadingLine(line: Line, bodySize: number): boolean {
  // Heading heuristic: a line is a heading if its font size is >=1.25x
  // the page's most common ("body") font size AND it's short (<=12
  // words) — long large-font text is more likely a pull-quote or
  // emphasized sentence than a heading. Approximation, not a
  // guarantee; PDF carries no semantic structure to query directly.
  return line.fontSize >= bodySize * 1.25 && line.text.trim().split(/\s+/).length <= 12;
}

function linesToHtml(lines: Line[]): string {
  if (lines.length === 0) return "";
  const bodySize = mostCommonFontSize(lines);

  // Consecutive wrapped body lines (real PDFs wrap a paragraph across many
  // Tj/Td operators, one per visual line) are merged into a single <p> —
  // otherwise every wrapped line becomes its own paragraph, which reads
  // oddly for anything longer than a couple of words. A line starts a new
  // paragraph block when it's a heading, or when the gap to the previous
  // line is noticeably larger than the typical line-to-line gap on this
  // page (a blank line between paragraphs). Still an approximation, not a
  // guarantee — PDF carries no semantic paragraph structure to query.
  const gaps = lines.slice(1).map((line, i) => Math.abs(lines[i].y - line.y));
  const typicalGap = gaps.length > 0 ? [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : 0;

  const blocks: { heading: boolean; text: string }[] = [];
  lines.forEach((line, i) => {
    const heading = isHeadingLine(line, bodySize);
    const gapFromPrev = i > 0 ? Math.abs(lines[i - 1].y - line.y) : Infinity;
    const startsNewBlock = heading || i === 0 || gapFromPrev > typicalGap * 1.6;
    if (startsNewBlock) {
      blocks.push({ heading, text: line.text.trim() });
    } else {
      blocks[blocks.length - 1].text += ` ${line.text.trim()}`;
    }
  });

  return blocks
    .map((block) => {
      const tag = block.heading ? "h2" : "p";
      return `<${tag}>${escapeHtml(block.text)}</${tag}>`;
    })
    .join("");
}

function mostCommonFontSize(lines: Line[]): number {
  const counts = new Map<number, number>();
  for (const line of lines) {
    const rounded = Math.round(line.fontSize);
    counts.set(rounded, (counts.get(rounded) ?? 0) + 1);
  }
  let best = 12;
  let bestCount = 0;
  for (const [size, count] of counts) {
    if (count > bestCount) {
      best = size;
      bestCount = count;
    }
  }
  return best;
}

export async function importPdf(buffer: Buffer): Promise<PdfImportResult> {
  const data = new Uint8Array(buffer);
  const doc = await getDocument({ data }).promise;
  const pageCount = doc.numPages;
  const warnings: string[] = [];
  let usedOcr = false;
  const pageHtmlParts: string[] = [];

  const pagesToProcess = Math.min(pageCount, MAX_OCR_PAGES);
  if (pageCount > MAX_OCR_PAGES) {
    warnings.push(
      `This document has ${pageCount} pages; only the first ${MAX_OCR_PAGES} were processed. ` +
        `Pages beyond that limit were not extracted.`,
    );
  }

  for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const textItems: TextItemLike[] = [];
    for (const item of textContent.items) {
      if (hasTransform(item)) {
        textItems.push(item as unknown as TextItemLike);
      }
    }
    const totalChars = textItems.reduce((sum, item) => sum + item.str.trim().length, 0);

    if (totalChars < SCANNED_PAGE_CHAR_THRESHOLD) {
      // Treat as a scanned/image-based page — render it and OCR it.
      try {
        const pngBuffer = await renderPageToPngBuffer(page as never);
        const ocrText = await recognizeImageBuffer(pngBuffer);
        if (ocrText.trim().length > 0) {
          usedOcr = true;
          const paragraphs = ocrText
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter(Boolean);
          pageHtmlParts.push(paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join(""));
        } else {
          warnings.push(`Page ${pageNum} appears to be scanned and OCR found no usable text.`);
        }
      } catch (err) {
        warnings.push(
          `Page ${pageNum} appears to be scanned, and OCR failed: ${(err as Error).message}`,
        );
      }
    } else {
      const lines = groupIntoLines(textItems);
      pageHtmlParts.push(linesToHtml(lines));
    }

    // Simple page-break marker between pages (not after the last one).
    if (pageNum < pagesToProcess) {
      pageHtmlParts.push("<hr>");
    }
  }

  if (usedOcr) {
    warnings.push(
      "Part or all of this content was extracted using OCR and may contain errors — please review carefully before publishing.",
    );
  }

  return { html: pageHtmlParts.join(""), warnings, usedOcr, pageCount };
}
