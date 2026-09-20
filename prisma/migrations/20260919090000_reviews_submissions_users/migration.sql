-- Real review-submission workflow: reviews.status moves from a free-text
-- placeholder column to a real enum (per the historical note in the
-- Review model this replaces — "define the real enum when the
-- review-submission workflow is actually built"). Also adds invited_at/
-- due_date to reviews, a uniqueness constraint so a reviewer can only be
-- assigned to a given manuscript once, and an `active` flag on users for
-- revoking a departed staff member's access without a real delete.
--
-- Hand-written for the same reason every migration since the init one is
-- — `prisma migrate dev`/`validate` can't reach binaries.prisma.sh in
-- this environment (see backend/README.md's "Known verification gaps").

CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'completed', 'declined');

-- Migrate the existing free-text status column to the new enum. Any
-- existing 'completed' value maps directly; anything else (including
-- NULL, which the old column technically allowed despite being
-- application-required) falls back to 'pending' rather than failing the
-- migration outright — a real deployment should audit these rows, but a
-- migration must not error out on already-live data.
ALTER TABLE "reviews" ADD COLUMN "status_new" "ReviewStatus" NOT NULL DEFAULT 'pending';
UPDATE "reviews" SET "status_new" = 'completed' WHERE "status" = 'completed';
UPDATE "reviews" SET "status_new" = 'declined' WHERE "status" = 'declined';
ALTER TABLE "reviews" DROP COLUMN "status";
ALTER TABLE "reviews" RENAME COLUMN "status_new" TO "status";

ALTER TABLE "reviews" ADD COLUMN "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "reviews" ADD COLUMN "due_date" DATE;

-- A reviewer should only be assigned to a given manuscript once —
-- re-inviting is an update to the existing row, not a second one.
-- Existing data could theoretically violate this for hand-seeded rows;
-- a real deployment should dedupe before this migration runs. Not
-- expected here since no real reviews exist yet outside placeholder
-- fixtures (see src/db/seed.ts).
CREATE UNIQUE INDEX "reviews_manuscript_id_reviewer_id_key" ON "reviews"("manuscript_id", "reviewer_id");

ALTER TABLE "users" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
