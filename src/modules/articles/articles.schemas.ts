import { z } from "zod";
import { optionalDate, optionalId, optionalUrl } from "../../lib/zodHelpers.js";
import { ARTICLE_STATUSES } from "../../lib/editorialWorkflow.js";

const articleStatusEnum = z.enum(ARTICLE_STATUSES);

export const articleCreateSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  abstract: z.string().min(1),
  content: z.string().optional(),
  publicationId: z.string().min(1),
  volumeId: optionalId(),
  issueId: optionalId(),
  pages: z.string().optional(),
  doi: z.string().optional(),
  manuscriptId: z.string().optional(),
  articleType: z.string().min(1),
  receivedDate: optionalDate(),
  revisedDate: optionalDate(),
  acceptedDate: optionalDate(),
  publishedDate: optionalDate(),
  pdfUrl: optionalUrl(),
  supplementaryFiles: z.array(z.string().url()).default([]),
  references: z.array(z.string()).default([]),
  keywords: z.array(z.string().trim().min(1)).default([]),
  license: z.string().optional(),
  status: articleStatusEnum,
  area: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoCanonicalUrl: optionalUrl(),
  // Ordered author ids — byline order is the array order (position is
  // derived from index, not sent explicitly). See DATABASE_SCHEMA.md's
  // ArticleAuthor join-table note.
  authorIds: z.array(z.string()).default([]),
  // Editorial team — who handled this article, separate from authorship
  // above. Unordered (plain implicit m2m — see DATABASE_SCHEMA.md's
  // ArticleEditorialTeam entry).
  editorIds: z.array(z.string()).default([]),
});

export const articleUpdateSchema = articleCreateSchema.partial();

export const articleAdminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  status: articleStatusEnum.optional(),
  publicationId: z.string().optional(),
  area: z.string().optional(),
  q: z.string().optional(),
});

export const articlePublicListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  publicationId: z.string().optional(),
  issueId: optionalId(),
  volumeId: optionalId(),
  area: z.string().optional(),
});

export const statusUpdateSchema = z.object({ status: articleStatusEnum });
