-- DropIndex
DROP INDEX "article_chunks_embedding_idx";

-- DropIndex
DROP INDEX "articles_search_vector_idx";

-- AlterTable
ALTER TABLE "ai_messages" ALTER COLUMN "cited_chunk_ids" DROP DEFAULT;
