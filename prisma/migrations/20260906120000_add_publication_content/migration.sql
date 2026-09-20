-- Adds a nullable rich-text HTML content column to publications, matching
-- the one articles already has. Additive, non-destructive: existing rows
-- get NULL, which the frontend/backend both already treat as "no content
-- yet" (falls back to the existing static About page content — see
-- src/pages/About.jsx).
--
-- See prisma/schema.prisma's Publication.content field comment for the
-- full reasoning (Rich Text Editor milestone).

ALTER TABLE "publications" ADD COLUMN "content" TEXT;
