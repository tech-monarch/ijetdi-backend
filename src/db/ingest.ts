import { env } from "../config/env.js";
import { prisma } from "../config/db.js";
import { backfillAllPublished } from "../modules/research-assistant/ingestion.service.js";

// One-time backfill for content that existed before the AI Research
// Assistant feature did — everything published after this script runs
// gets ingested automatically via the updateStatus() hook in
// articles.service.ts instead.
//
// Usage: npm run ingest
//
// Requires GEMINI_API_KEY to be set (real ingestion calls the real
// Gemini embeddings API — this is not a dry run / mock). Sequential by
// design (see ingestion.service.ts's backfillAllPublished comment) — for
// a journal with many hundreds of published articles this will take a
// while; that's expected for a one-time job, not a bug.

async function main() {
  if (!env.GEMINI_API_KEY) {
    // eslint-disable-next-line no-console
    console.error("GEMINI_API_KEY is not set — cannot run real ingestion. See .env.example.");
    process.exitCode = 1;
    return;
  }

  // eslint-disable-next-line no-console
  console.log("Starting AI Research Assistant backfill for all published articles...");

  const result = await backfillAllPublished((done, total, title) => {
    // eslint-disable-next-line no-console
    console.log(`[${done}/${total}] ingested: ${title}`);
  });

  // eslint-disable-next-line no-console
  console.log(
    `Done. Ingested ${result.articlesProcessed} article(s), wrote ${result.chunksWritten} chunk(s) total.`,
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
