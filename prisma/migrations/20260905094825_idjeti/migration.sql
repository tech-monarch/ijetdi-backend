-- DropIndex
--
-- Fixed here (found via real Postgres verification — see
-- backend/README.md's session notes): the immediately-preceding
-- migration (20260905093316_idjeti) already dropped this same index,
-- so this statement unmodified fails outright on a fresh
-- `prisma migrate deploy` against a brand-new database with
-- "index does not exist" — a genuine, previously-undetected bug in the
-- migration history, only caught now that a real Postgres instance was
-- available to actually run these against, rather than assumed safe.
-- IF EXISTS makes this idempotent either way: a no-op on a fresh deploy
-- (where the prior migration already dropped it), and identical to the
-- original behavior on any database where this migration already ran
-- successfully before this fix (where the index still existed at this
-- point in that database's own history).
DROP INDEX IF EXISTS "article_chunks_embedding_idx";

-- AlterTable
ALTER TABLE "ai_messages" ALTER COLUMN "cited_chunk_ids" SET DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "articles_search_vector_idx" ON "articles" USING GIN ("search_vector");
