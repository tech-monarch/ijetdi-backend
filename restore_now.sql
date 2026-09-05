CREATE INDEX IF NOT EXISTS "article_chunks_embedding_idx" ON "article_chunks"
  USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
