-- DropIndex
DROP INDEX "article_chunks_embedding_idx";

-- AlterTable
ALTER TABLE "ai_messages" ALTER COLUMN "cited_chunk_ids" SET DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "articles_search_vector_idx" ON "articles" USING GIN ("search_vector");
