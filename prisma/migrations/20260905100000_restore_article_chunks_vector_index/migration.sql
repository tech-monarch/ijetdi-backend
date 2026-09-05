-- Restores the ivfflat similarity-search index on article_chunks.embedding.
--
-- Why this migration exists: pgvector's `ivfflat` index type and its
-- `vector_cosine_ops` operator class are NOT expressible in Prisma's
-- schema DSL (@@index's `type` argument only supports Hash/Gist/Gin/
-- SpGist/Brin — no vector/ivfflat). Because this index was created via
-- raw SQL in the original migration but never declared in schema.prisma,
-- a later `prisma migrate dev` run correctly-by-its-own-logic treated it
-- as schema drift and generated a migration dropping it. That drop
-- already applied against a real database once (see the project's
-- README.md / this conversation) — this migration puts it back.
--
-- IMPORTANT — this index can never be declared in schema.prisma, so this
-- exact scenario can recur. Going forward, always run
-- `npx prisma migrate dev --create-only` and inspect the generated SQL
-- for a stray `DROP INDEX "article_chunks_embedding_idx"` line before
-- applying — see README.md's "Aiven PostgreSQL notes" /
-- "AI Research Assistant" sections for the full explanation.

CREATE INDEX IF NOT EXISTS "article_chunks_embedding_idx" ON "article_chunks"
  USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
