import { createCanvas, DOMMatrix } from "@napi-rs/canvas";

// Node has no DOMMatrix global; pdfjs-dist's Node rendering path needs one.
// @napi-rs/canvas exports a real implementation — set it once, globally,
// before any page.render() call happens anywhere in this process.
if (!("DOMMatrix" in globalThis)) {
  (globalThis as unknown as { DOMMatrix: unknown }).DOMMatrix = DOMMatrix;
}

// This project's tsconfig.json has no "dom" lib (see docs/ note in
// pdfImporter.ts) — HTMLCanvasElement/CanvasRenderingContext2D don't exist
// as types here. Declared as local aliases scoped to this one file, used
// only as cast targets for pdfjs-dist's `page.render()` call, rather than
// adding "dom" to the project-wide tsconfig (which risks unrelated type
// conflicts elsewhere in a strict-mode project).
type HTMLCanvasElement = unknown;
type CanvasRenderingContext2D = unknown;

// Deliberately its own module rather than inlined into pdfImporter.ts:
// unit-testing pdfImporter by mocking @napi-rs/canvas's createCanvas
// directly would require faking every canvas context method pdfjs-dist's
// internal rendering calls (save(), restore(), transform(), fillRect(),
// etc.) — a bare `{}` context throws "ctx.save is not a function" deep
// inside pdfjs-dist's rendering internals, which a surrounding try/catch
// silently swallows, producing a confusing failure that looks like "OCR
// never got called" rather than "canvas rendering threw." Keeping this as
// its own module means tests can mock renderPageToPngBuffer directly
// instead of faking canvas internals.
export async function renderPageToPngBuffer(page: {
  getViewport: (params: { scale: number }) => { width: number; height: number };
  render: (params: {
    canvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;
    viewport: unknown;
  }) => { promise: Promise<void> };
}): Promise<Buffer> {
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext("2d");
  await page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
  return canvas.toBuffer("image/png");
}
