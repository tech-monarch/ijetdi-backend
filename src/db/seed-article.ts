import { prisma } from "../config/db.js";

// Dev/testing helper ONLY — not for production. BACKEND_HANDOFF.md is
// explicit that real content (ISSNs, publisher/editor names, articles)
// should come from the real admin UI, not fabricated seed data. This
// script exists purely so there's something real to run `npm run ingest`
// against and exercise the AI Research Assistant end-to-end without
// waiting for real editorial content to exist yet.
//
// The article body below is deliberately substantive (not lorem ipsum) —
// several real paragraphs on an actual topic — so chunking.ts's
// paragraph-grouping and overlap logic has enough material to visibly
// produce more than one chunk, and so a query against it produces a
// meaningful, checkable answer rather than nonsense.
//
// Idempotent: re-running this upserts the same records by slug rather
// than creating duplicates, so it's safe to run more than once.
//
// Usage: npm run seed:article

const ARTICLE_CONTENT = `
Coral reefs occupy less than one percent of the ocean floor, yet they support an estimated quarter of all marine species at some stage of their life cycle. This disproportionate concentration of biodiversity makes reefs one of the most closely watched indicators of ocean health, and one of the most vulnerable to a warming climate.

Thermal stress is the primary driver of coral bleaching. When sea surface temperatures rise even one to two degrees Celsius above the local summer maximum for several consecutive weeks, the symbiotic algae living within coral tissue — zooxanthellae — are expelled. Since these algae supply the coral host with the majority of its energy through photosynthesis, their loss leaves the coral visibly white and metabolically starved. A bleached coral is not dead, but it is under severe stress, and prolonged bleaching events sharply increase mortality.

Recovery patterns vary considerably by species and by the frequency of bleaching events. Fast-growing branching corals such as Acropora tend to bleach earlier and more severely than massive, slow-growing corals such as Porites, but branching species can also recolonize damaged reef area more quickly if conditions stabilize. Repeated bleaching events with insufficient recovery time between them, however, produce a cumulative decline that favors weedy, opportunistic species over the structurally complex corals that provide habitat for fish and invertebrates.

Local management interventions cannot lower global sea temperatures, but the evidence increasingly suggests they can meaningfully affect a reef's resilience. Reducing nutrient runoff and sedimentation, limiting anchor damage and destructive fishing practices, and maintaining herbivorous fish populations that keep algal overgrowth in check all appear to improve a reef's odds of recovering between thermal stress events. Marine protected areas with strong enforcement consistently show higher coral cover and faster recovery than comparable unprotected sites nearby.

Restoration efforts, including coral gardening and assisted gene flow between heat-tolerant populations, have expanded substantially over the past decade. Early results are promising at small scales, but the areas restored remain a tiny fraction of degraded reef globally, and long-term survival data for outplanted colonies under real bleaching conditions is still limited. Most researchers in the field describe restoration as a valuable complement to emissions reduction and local protection, not a substitute for either.

Monitoring methodology has also shifted over the past fifteen years. Manual line-intercept transect surveys, long the standard for estimating live coral cover, are increasingly supplemented or replaced by structure-from-motion photogrammetry, in which divers capture overlapping photographs that are later stitched into a three-dimensional reef model. This approach preserves far more structural detail than a transect line alone, allowing researchers to track changes in reef rugosity and colony-level growth or mortality across repeated surveys of the same plot, rather than relying solely on percent-cover estimates that can mask which specific colonies are declining.

Satellite-derived sea surface temperature products, particularly NOAA's Coral Reef Watch program, now provide near-real-time bleaching alert levels for reef regions worldwide, based on accumulated thermal stress relative to a location's historical maximum monthly mean. These products have become a standard reference point in the bleaching literature, allowing researchers to compare bleaching severity across widely separated reef systems using a consistent thermal-stress metric rather than raw temperature alone, which does not account for a given reef's typical seasonal range or its corals' acclimatization to it.

Genetic and physiological research into coral thermal tolerance has identified substantial variation both between and within species, some of it linked to the specific clade of zooxanthellae a colony hosts. Colonies harboring more heat-tolerant algal symbionts, such as certain members of the genus Durusdinium, often bleach less severely under equivalent thermal stress than colonies of the same coral species hosting more sensitive symbiont types, though this tolerance can come with a measurable cost to the coral's growth rate under normal, non-stressed conditions. This tradeoff has become a central consideration in assisted evolution proposals, since selecting purely for heat tolerance risks producing reefs that recover from bleaching but grow too slowly to keep pace with other forms of reef degradation.
`.trim();

async function main() {
  const publisher = await prisma.publisher.upsert({
    where: { slug: "sample-marine-science-press" },
    update: {},
    create: {
      slug: "sample-marine-science-press",
      name: "Sample Marine Science Press",
      status: "active",
    },
  });

  const publication = await prisma.publication.upsert({
    where: { slug: "sample-journal-of-marine-ecology" },
    update: {},
    create: {
      slug: "sample-journal-of-marine-ecology",
      publisherId: publisher.id,
      name: "Sample Journal of Marine Ecology",
      shortName: "SJME",
      status: "active",
    },
  });

  const volume = await prisma.volume.upsert({
    where: { publicationId_number: { publicationId: publication.id, number: 1 } },
    update: {},
    create: {
      publicationId: publication.id,
      number: 1,
      year: 2026,
      status: "active",
    },
  });

  // Issue has no natural unique key exposed on the schema besides id, so
  // find-then-create keeps this idempotent without a compound unique constraint.
  let issue = await prisma.issue.findFirst({ where: { volumeId: volume.id, number: 1 } });
  if (!issue) {
    issue = await prisma.issue.create({
      data: {
        volumeId: volume.id,
        publicationId: publication.id,
        number: 1,
        label: "Issue 1",
        status: "published",
      },
    });
  }

  const author = await prisma.author.upsert({
    where: { slug: "sample-author-j-reyes" },
    update: {},
    create: {
      slug: "sample-author-j-reyes",
      firstName: "J.",
      lastName: "Reyes",
      fullName: "J. Reyes",
      institution: "Sample Institute of Marine Studies",
    },
  });

  const article = await prisma.article.upsert({
    where: { slug: "sample-coral-bleaching-thermal-stress-recovery" },
    update: {
      title: "Thermal Stress, Bleaching, and Recovery Dynamics in Coral Reef Ecosystems",
      abstract:
        "This article reviews the mechanisms of coral bleaching under thermal stress, patterns of species-level recovery, and the evidence for local management interventions improving reef resilience in the face of repeated bleaching events.",
      content: ARTICLE_CONTENT,
      status: "published",
      publishedDate: new Date("2026-01-15"),
    },
    create: {
      slug: "sample-coral-bleaching-thermal-stress-recovery",
      title: "Thermal Stress, Bleaching, and Recovery Dynamics in Coral Reef Ecosystems",
      abstract:
        "This article reviews the mechanisms of coral bleaching under thermal stress, patterns of species-level recovery, and the evidence for local management interventions improving reef resilience in the face of repeated bleaching events.",
      content: ARTICLE_CONTENT,
      publicationId: publication.id,
      volumeId: volume.id,
      issueId: issue.id,
      articleType: "research",
      status: "published",
      publishedDate: new Date("2026-01-15"),
      area: "Marine Ecology",
      doi: "10.9999/sjme.2026.0001",
    },
  });

  await prisma.articleAuthor.upsert({
    where: { articleId_authorId: { articleId: article.id, authorId: author.id } },
    update: {},
    create: { articleId: article.id, authorId: author.id, position: 0 },
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded published article: "${article.title}" (slug: ${article.slug})`);
  // eslint-disable-next-line no-console
  console.log("Note: this article was upserted with status='published' directly, which does NOT");
  // eslint-disable-next-line no-console
  console.log("go through updateStatus()'s ingestion hook (that only fires on a transition through");
  // eslint-disable-next-line no-console
  console.log("the API, not a raw DB write). Run `npm run ingest` next to actually chunk + embed it.");
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
