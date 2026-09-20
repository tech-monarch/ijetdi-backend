-- Editorial Team: Article.editors <-> Editor.articles, a plain Prisma
-- implicit many-to-many relation named "ArticleEditorialTeam" (no custom
-- join model — unlike ArticleAuthor, which needs a `position` column for
-- byline ordering, an editorial team isn't conventionally ordered).
--
-- Hand-written because `prisma migrate dev` cannot run against a real
-- database in this environment (no network access to binaries.prisma.sh
-- — see backend/README.md's "Known verification gaps" section). Follows
-- Prisma's own documented implicit-m2m convention for a relation
-- explicitly named "ArticleEditorialTeam": table _ArticleEditorialTeam,
-- columns "A" (references the alphabetically-first related model —
-- Article) and "B" (Editor), both TEXT NOT NULL, a unique index on
-- (A, B), an index on B alone, foreign keys with ON DELETE CASCADE ON
-- UPDATE CASCADE (matching this project's existing FK style — see e.g.
-- the init migration's "_authors_fkey" pairs).

CREATE TABLE "_ArticleEditorialTeam" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);

CREATE UNIQUE INDEX "_ArticleEditorialTeam_AB_unique" ON "_ArticleEditorialTeam"("A", "B");

CREATE INDEX "_ArticleEditorialTeam_B_index" ON "_ArticleEditorialTeam"("B");

ALTER TABLE "_ArticleEditorialTeam" ADD CONSTRAINT "_ArticleEditorialTeam_A_fkey"
  FOREIGN KEY ("A") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ArticleEditorialTeam" ADD CONSTRAINT "_ArticleEditorialTeam_B_fkey"
  FOREIGN KEY ("B") REFERENCES "editors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
