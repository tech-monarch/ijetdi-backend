import { prisma } from "../../src/config/db.js";

/**
 * These integration tests need a real Postgres database (see
 * docker-compose.yml — `docker compose up -d` gives you one) AND a
 * successfully generated Prisma Client (`npx prisma generate`, then
 * `npx prisma migrate deploy` to apply the schema). Point DATABASE_URL
 * at that database before running `npm test`.
 *
 * They could not be executed inside the sandbox this backend was
 * originally built in — see README.md's "Known verification gaps" for
 * why — but the migration SQL these tests run against was itself
 * verified directly (via psql) against a real local Postgres instance
 * during that build, including the partial-unique-index and full-text
 * search trigger. This suite exercises the same schema through the
 * actual application/Prisma layer once you're able to run it.
 */

// Deletes in FK-safe order (children before parents).
export async function resetDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany(),
    prisma.review.deleteMany(),
    prisma.reviewer.deleteMany(),
    prisma.articleAuthor.deleteMany(),
    prisma.article.deleteMany(),
    prisma.editor.deleteMany(),
    prisma.indexingService.deleteMany(),
    prisma.issue.deleteMany(),
    prisma.volume.deleteMany(),
    prisma.author.deleteMany(),
    prisma.contactMessage.deleteMany(),
    prisma.user.deleteMany(),
    prisma.publication.deleteMany(),
    prisma.publisher.deleteMany(),
  ]);
}
