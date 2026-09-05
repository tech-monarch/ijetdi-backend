-- AI Research Assistant: real ArticleChunk / AiConversation / AiMessage
-- tables, per the frontend's docs/DATABASE_SCHEMA.md "Forward-looking
-- models" section and docs/AI_RESEARCH_ASSISTANT.md's contract.
--
-- pgvector was already enabled by the init migration
-- (CREATE EXTENSION IF NOT EXISTS vector;) — this migration doesn't
-- repeat that, just uses the `vector` type it registered. On Aiven, if
-- the init migration's CREATE EXTENSION failed with a permission error,
-- see README.md's "Aiven PostgreSQL notes" for the console/CLI fallback
-- before running this migration.

-- ── ai_message_role enum ───────────────────────────────────────────────

CREATE TYPE "AiMessageRole" AS ENUM ('user', 'assistant');

-- ── article_chunks ──────────────────────────────────────────────────────
--
-- embedding is vector(768) — MUST match GEMINI_EMBEDDING_DIMENSIONS
-- (.env.example). 768 is one of Google's recommended truncation points
-- for gemini-embedding-001's Matryoshka output (default 3072, truncatable
-- to 3072/1536/768). Changing this requires a new migration + full
-- re-ingest (`npm run ingest`) — old vectors are not compatible with a
-- different dimension or model, see README.md.

CREATE TABLE "article_chunks" (
  "id" TEXT NOT NULL,
  "article_id" TEXT NOT NULL,
  "section_name" TEXT,
  "chunk_text" TEXT NOT NULL,
  "chunk_index" INTEGER NOT NULL,
  "embedding" vector(768) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "article_chunks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "article_chunks_article_id_idx" ON "article_chunks"("article_id");
ALTER TABLE "article_chunks" ADD CONSTRAINT "article_chunks_article_id_fkey"
  FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Approximate nearest-neighbor index for cosine-distance similarity
-- search (the <=> operator). IVFFlat requires an estimate of row count
-- to pick `lists` sensibly (rule of thumb: rows / 1000, minimum 1) — 100
-- is a placeholder tuned for a modest journal's article count (tens of
-- thousands of chunks, not millions). Re-tune (or switch to HNSW, if the
-- Aiven Postgres version supports pgvector >= 0.5 with HNSW) once real
-- ingestion volume is known. An IVFFlat index is only meaningfully
-- populated once the table already has rows — building it here on an
-- empty table is fine, Postgres will just use it as vectors are added,
-- but plans should be checked (EXPLAIN ANALYZE) after the real backfill
-- (`npm run ingest`) runs.
CREATE INDEX "article_chunks_embedding_idx" ON "article_chunks"
  USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- ── ai_conversations ─────────────────────────────────────────────────────

CREATE TABLE "ai_conversations" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "title" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_conversations_user_id_idx" ON "ai_conversations"("user_id");
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── ai_messages ──────────────────────────────────────────────────────────

CREATE TABLE "ai_messages" (
  "id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "role" "AiMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "cited_chunk_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_messages_conversation_id_idx" ON "ai_messages"("conversation_id");
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
