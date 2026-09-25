import { env } from "../config/env.js";
import { prisma } from "../config/db.js";
import { backfillMissingPublished } from "../modules/research-assistant/ingestion.service.js";

// Incremental, unattended-safe counterpart to ingest.ts — only processes
// published articles that currently have zero chunks, and a single
// article's failure doesn't fail the whole run (see
// backfillMissingPublished's comment in ingestion.service.ts for why).
//
// This is the one to wire into automatic deploys (e.g. Render's pre-deploy
// command, or folded into the build command on Render's free tier, which
// doesn't support pre-deploy commands). ingest.ts (`npm run ingest`) is the
// deliberate, one-time, fail-fast full backfill you run by hand.
//
// Usage: npm run ingest:missing
//
// Exits 0 even if GEMINI_API_KEY is unset or every article fails — this is
// meant to never block a deploy. Failures are printed clearly so they're
// visible in Render's deploy logs, not swallowed silently.

async function main() {
  if (!env.GEMINI_API_KEY) {
    // eslint-disable-next-line no-console
    console.log("GEMINI_API_KEY is not set — skipping incremental ingestion for this deploy.");
    return;
  }

  const result = await backfillMissingPublished((done, total, title) => {
    // eslint-disable-next-line no-console
    console.log(`[${done}/${total}] ingested: ${title}`);
  });

  if (result.articlesProcessed === 0) {
    // eslint-disable-next-line no-console
    console.log("Nothing to ingest — every published article already has chunks.");
    return;
  }

  // eslint-disable-next-line no-console
  console.log(
    `Done. Ingested ${result.articlesProcessed - result.failures.length}/${result.articlesProcessed} ` +
      `article(s), wrote ${result.chunksWritten} chunk(s) total.`,
  );
  for (const f of result.failures) {
    // eslint-disable-next-line no-console
    console.error(`  FAILED — "${f.title}" (${f.id}): ${f.error}`);
  }
}

main()
  .catch((err) => {
    // A failure here means something is actually broken (DB unreachable,
    // etc.), not just one bad article — that case is caught inside
    // backfillMissingPublished and reported above instead. Still exits 0:
    // this must never be the thing that blocks a deploy.
    // eslint-disable-next-line no-console
    console.error("ingest:missing failed to run (deploy is not blocked):", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
