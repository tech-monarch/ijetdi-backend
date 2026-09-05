import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { env } from "./env.js";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export interface UploadResult {
  key: string;
  url: string;
}

/**
 * Uploads an already-validated buffer to R2 and returns the permanent,
 * public URL. Postgres only ever stores the returned `url`/`key` — never
 * the file itself (see BACKEND_HANDOFF.md's "File uploads" section).
 *
 * `folder` groups uploads by field/purpose (e.g. "article-pdfs",
 * "publication-logos") for easier bucket browsing; it is not
 * user-supplied.
 */
export async function uploadToR2(params: {
  buffer: Buffer;
  contentType: string;
  originalFilename: string;
  folder: string;
}): Promise<UploadResult> {
  const { buffer, contentType, originalFilename, folder } = params;
  const safeExt = originalFilename.includes(".")
    ? originalFilename.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "";
  const key = `${folder}/${randomUUID()}${safeExt ? `.${safeExt}` : ""}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  const url = `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  return { key, url };
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
}
