import mammoth from "mammoth";
import { uploadToR2 } from "../../config/r2.js";

export interface DocxImportResult {
  html: string;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// mammoth's default behavior embeds images as base64 `data:` URIs, which
// this project's sanitizer correctly rejects (real uploads only — see
// sanitizeContent.ts's allowedSchemesByTag: { img: ["https"] }). The
// imgElement hook below intercepts every embedded image during conversion
// and uploads it to R2 for real instead, using the returned URL — a genuine
// value-add over plain format conversion, not just a compatibility shim.
// ---------------------------------------------------------------------------

export async function importDocx(buffer: Buffer): Promise<DocxImportResult> {
  const imageHandler = mammoth.images.imgElement(async (image) => {
    const imageBuffer = await image.readAsBuffer();
    const { url } = await uploadToR2({
      buffer: imageBuffer,
      contentType: image.contentType,
      originalFilename: `docx-image.${image.contentType.split("/")[1] ?? "png"}`,
      folder: "article-content-images",
    });
    return { src: url };
  });

  const result = await mammoth.convertToHtml({ buffer }, { convertImage: imageHandler });
  const warnings = result.messages.filter((m) => m.type === "warning").map((m) => m.message);

  return { html: result.value, warnings };
}
