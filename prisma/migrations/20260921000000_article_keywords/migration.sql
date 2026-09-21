-- Article.keywords: the frontend (ArticleForm, the public article page, JSON-LD,
-- Publications search) has always read/written a keywords list, but no column existed,
-- so keywords were silently dropped on save and absent from every API response.
ALTER TABLE "articles" ADD COLUMN "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Include keywords in full-text search (weight B, alongside the abstract), as
-- schema.prisma and docs/BACKEND_HANDOFF.md's search section always said it did.
CREATE OR REPLACE FUNCTION articles_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.abstract, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.keywords, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.area, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS articles_search_vector_trigger ON "articles";
CREATE TRIGGER articles_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, abstract, area, keywords ON "articles"
  FOR EACH ROW EXECUTE FUNCTION articles_search_vector_update();
