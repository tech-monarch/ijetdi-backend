import { prisma } from "../../config/db.js";
import { env } from "../../config/env.js";
import { badRequest } from "../../lib/envelope.js";
import { uploadToR2 } from "../../config/r2.js";
import { sendEmail } from "../../lib/email/sendEmail.js";
import { slugify } from "../../lib/slugify.js";
import { detectImportFileKind } from "../import/detectFileType.js";
import { createArticle } from "../articles/articles.service.js";
import type { submissionCreateSchema } from "./submissions.schemas.js";
import type { z } from "zod";

type AuthorInput = z.infer<typeof submissionCreateSchema>["correspondingAuthor"];

/**
 * Finds an existing Author by email (author identity has no unique
 * constraint on email in this schema — a plain findFirst, not a
 * findUnique) or creates a new one. Reused so a returning author who
 * submits again isn't duplicated every time, without requiring the
 * submitter to already have an account.
 */
async function resolveAuthor(input: AuthorInput): Promise<string> {
  if (input.email) {
    const existing = await prisma.author.findFirst({ where: { email: input.email } });
    if (existing) return existing.id;
  }

  const nameParts = input.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? input.name;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : firstName;

  const author = await prisma.author.create({
    data: {
      slug: slugify(input.name),
      firstName,
      lastName,
      fullName: input.name,
      institution: input.institution,
      email: input.email,
    },
  });
  return author.id;
}

async function uniqueArticleSlug(title: string): Promise<string> {
  // slugify() already appends a random suffix, so a real collision is
  // vanishingly unlikely — but checking costs one query and a silent
  // slug collision would be a confusing bug to track down later, so
  // check anyway rather than assume the random suffix is enough.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = slugify(title);
    const existing = await prisma.article.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
  }
  throw new Error("Could not generate a unique slug after 5 attempts.");
}

export async function createSubmission(params: {
  data: z.infer<typeof submissionCreateSchema>;
  manuscript: { buffer: Buffer; mimetype: string; originalFilename: string };
}) {
  const { data, manuscript } = params;

  const publication = await prisma.publication.findUnique({ where: { id: data.publicationId } });
  if (!publication) throw badRequest("PUBLICATION_NOT_FOUND", "That publication doesn't exist.");

  // Manuscripts are a document, not an image — real magic-byte detection,
  // reusing the same detector the Document Import Pipeline uses rather
  // than writing a second one.
  const kind = detectImportFileKind(manuscript.mimetype, manuscript.buffer);
  if (kind !== "pdf" && kind !== "docx") {
    throw badRequest("UNSUPPORTED_FILE_TYPE", "Manuscript must be a PDF or Word document.");
  }

  const { url: manuscriptUrl } = await uploadToR2({
    buffer: manuscript.buffer,
    contentType: manuscript.mimetype,
    originalFilename: manuscript.originalFilename,
    folder: "manuscript-submissions",
  });

  const correspondingAuthorId = await resolveAuthor(data.correspondingAuthor);
  const additionalAuthorIds = await Promise.all(data.additionalAuthors.map(resolveAuthor));
  const authorIds = [correspondingAuthorId, ...additionalAuthorIds];

  const slug = await uniqueArticleSlug(data.title);

  const article = await createArticle({
    slug,
    title: data.title,
    abstract: data.abstract,
    publicationId: data.publicationId,
    articleType: data.articleType,
    area: data.area,
    pdfUrl: manuscriptUrl,
    status: "submitted",
    supplementaryFiles: [],
    references: [],
    keywords: [],
    authorIds,
    editorIds: [],
  });

  // Best-effort notifications — a delivery failure here shouldn't fail
  // the submission itself, which is already saved (same "swallow and
  // move on" pattern contact.service.ts already uses for its own
  // confirmation email).
  if (data.correspondingAuthor.email) {
    try {
      await sendEmail({
        to: data.correspondingAuthor.email,
        template: "submission-received",
        data: { name: data.correspondingAuthor.name, title: data.title },
      });
    } catch {
      // Swallow: the submission is already saved.
    }
  }

  if (env.EDITOR_NOTIFICATION_EMAIL) {
    try {
      await sendEmail({
        to: env.EDITOR_NOTIFICATION_EMAIL,
        template: "submission-notify-editors",
        data: {
          title: data.title,
          correspondingAuthor: data.correspondingAuthor.name,
          reviewUrl: `${env.FRONTEND_BASE_URL.replace(/\/$/, "")}/admin/articles/${article.id}`,
        },
      });
    } catch {
      // Swallow: the submission is already saved; staff will still see it
      // in the admin article queue regardless of whether this email sent.
    }
  }

  // Deliberately a minimal, non-sensitive response — the caller is
  // unauthenticated, so this never echoes back the internal admin
  // article shape (getAdminById's full payload). Nothing here is
  // information an attacker couldn't already infer from the request they
  // just sent.
  return { received: true, title: data.title };
}
