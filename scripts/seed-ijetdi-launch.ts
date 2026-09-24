// Seeds the real IJETDI publication plus its launch content: an inaugural
// editorial article, credited to the developer as its author, and the
// developer's Editorial Board entry.
//
// Deliberately NOT a fake research article — no invented data, methods, or
// findings. An editorial is genuine, permanent content a new journal
// legitimately publishes first; fabricating a study and presenting it as
// real scholarship on a live academic platform is a different thing
// entirely, and this script doesn't do that.
//
// Idempotent: every record is upserted by its slug/email, so running this
// more than once updates the same rows rather than duplicating them.
//
// Usage:  npx tsx scripts/seed-ijetdi-launch.ts
import { prisma } from "../src/config/db.js";
import { sanitizeRichTextContent } from "../src/lib/sanitizeContent.js";

// --- What to double check before running against a real database ----------
// 1. PUBLISHER_NAME below is a placeholder ("IJETDI Editorial Office") — I
//    don't know your real publishing body/affiliation, so I didn't invent
//    one. Rename it via /admin/publishers once this has run, if it should
//    be something else (a university, a society, etc).
// 2. EDITOR_ROLE is set to "editor_in_chief" — my best guess for someone
//    being credited as the source of the journal's own launch editorial.
//    Change it on the Editors screen if a different title is more accurate
//    (managing_editor / associate_editor / section_editor / board_member /
//    guest_editor are the other options this app supports).
// 3. The exact spelling/capitalization of the credited name — I've used
//    "Omijeh David Odianonsen" (surname first). Fix it on the Author and
//    Editor screens if that's not exactly right.
// ---------------------------------------------------------------------------

const PUBLISHER_SLUG = "ijetdi-editorial-office";
const PUBLISHER_NAME = "IJETDI Editorial Office";

const PUBLICATION_SLUG = "ijetdi"; // MUST match CURRENT_PUBLICATION_SLUG in frontend/src/config/currentPublication.js
const PUBLICATION_NAME = "International Journal of Embedded AI, Telecommunication and Digital Innovations";
const PUBLICATION_SHORT_NAME = "IJETDI";

const EDITOR_SLUG = "omijeh-david-odianonsen";
const EDITOR_NAME = "Omijeh David Odianonsen";
const EDITOR_ROLE = "editor_in_chief" as const;
const EDITOR_INSTITUTION = "University of Port Harcourt";
const EDITOR_COUNTRY = "Nigeria";

const AUTHOR_SLUG = "omijeh-david-odianonsen";

// These match frontend/src/data/journal.js's scopeAreas exactly — that file
// is the one place the site's real scope is already defined, so this
// reuses it rather than inventing a second, possibly-drifting list.
const SUBJECT_AREA_IDS = ["embedded-ai", "telecom", "iot", "digital-innovation", "security", "data-systems"];

const ABOUT_HTML = sanitizeRichTextContent(`
  <p>${PUBLICATION_NAME} (IJETDI) publishes original research at the intersection of embedded systems,
  artificial intelligence, telecommunications, and applied digital innovation — work that moves ideas from
  the lab bench onto real, resource-constrained, connected devices.</p>
  <h2>Scope</h2>
  <ul>
    <li>Embedded &amp; edge AI — on-device machine learning, model compression, real-time inference</li>
    <li>Telecommunication systems — wireless networks, 5G/6G architectures, signal processing</li>
    <li>IoT &amp; embedded systems — sensor networks, microcontroller design, firmware, RTOS</li>
    <li>Digital innovation &amp; applications — cyber-physical systems, smart infrastructure</li>
    <li>Security &amp; reliability — embedded security, fault-tolerant design, trustworthy AI</li>
    <li>Data &amp; signal systems — sensor data pipelines, distributed and edge computing</li>
  </ul>
  <h2>Review process</h2>
  <p>Submissions go through a structured double-blind peer review guided by an editorial board active in
  embedded systems and telecommunications research.</p>
  <h2>Access</h2>
  <p>Published research is open access by default — freely readable, with no barrier between the work and
  the researchers who need it.</p>
`);

const EDITORIAL_HTML = sanitizeRichTextContent(`
  <p>Welcome to ${PUBLICATION_NAME}. This first editorial exists to say plainly what this journal is for
  and what we're asking of the researchers who submit to it.</p>

  <h2>Why this journal</h2>
  <p>Embedded AI, telecommunications, and digital innovation are usually covered separately — an AI venue
  here, a networking venue there, an IoT-systems venue somewhere else. A lot of the most interesting current
  work sits across those boundaries: models compressed to run on a microcontroller, inference pipelines that
  have to share a radio link's power budget, security assumptions that break the moment a device leaves a lab
  bench. IJETDI exists for that work specifically — research that has to justify itself against real
  constraints, not just against a benchmark.</p>

  <h2>Scope</h2>
  <p>We're reading submissions across six connected areas: embedded and edge AI; telecommunication systems;
  IoT and embedded systems; digital innovation and applications; security and reliability; and data and
  signal systems. A paper doesn't need to touch all six — most won't — but we'd rather see work that's honest
  about which constraints it's actually operating under than work that's broad but shallow.</p>

  <h2>What we're asking of authors</h2>
  <p>Report your methodology in enough detail that someone else could actually attempt to reproduce it.
  State your limitations as plainly as your results. If your evaluation was done under specific hardware,
  power, or network conditions, say so explicitly rather than letting a reader assume it generalizes.</p>

  <h2>Review process</h2>
  <p>Every submission goes through double-blind peer review before a publication decision is made. We think
  this is worth the extra time it costs, both for authors and for readers who will build on what we publish.</p>

  <h2>An invitation</h2>
  <p>If your work sits in the space this journal covers, we'd like to read it. Submission guidelines and the
  current call for papers are linked from the site's navigation.</p>

  <p>— ${EDITOR_NAME}, Editor-in-Chief</p>
`);

async function main() {
  const publisher = await prisma.publisher.upsert({
    where: { slug: PUBLISHER_SLUG },
    update: {},
    create: { slug: PUBLISHER_SLUG, name: PUBLISHER_NAME, status: "active" },
  });

  const publication = await prisma.publication.upsert({
    where: { slug: PUBLICATION_SLUG },
    update: {
      name: PUBLICATION_NAME,
      shortName: PUBLICATION_SHORT_NAME,
      subjectAreaIds: SUBJECT_AREA_IDS,
      content: ABOUT_HTML,
    },
    create: {
      slug: PUBLICATION_SLUG,
      publisherId: publisher.id,
      name: PUBLICATION_NAME,
      shortName: PUBLICATION_SHORT_NAME,
      tagline: "Embedded AI, telecommunications, and digital innovation research.",
      subjectAreaIds: SUBJECT_AREA_IDS,
      status: "active",
      content: ABOUT_HTML,
    },
  });

  const editorBio =
    `Editor-in-Chief of ${PUBLICATION_SHORT_NAME}. Overseeing the journal's editorial direction, review ` +
    `process, and scope across embedded AI, telecommunications, and digital innovation research.`;

  const editor = await prisma.editor.upsert({
    where: { slug: EDITOR_SLUG },
    update: { name: EDITOR_NAME, publicationId: publication.id, status: "active" },
    create: {
      slug: EDITOR_SLUG,
      name: EDITOR_NAME,
      role: EDITOR_ROLE,
      publicationId: publication.id,
      institution: EDITOR_INSTITUTION,
      country: EDITOR_COUNTRY,
      bio: editorBio,
      researchInterests: [],
      displayOrder: 1,
      status: "active",
    },
  });

  const [firstName, ...rest] = EDITOR_NAME.split(" ");
  const author = await prisma.author.upsert({
    where: { slug: AUTHOR_SLUG },
    update: { fullName: EDITOR_NAME },
    create: {
      slug: AUTHOR_SLUG,
      firstName,
      lastName: rest.join(" "),
      fullName: EDITOR_NAME,
      institution: EDITOR_INSTITUTION,
      country: EDITOR_COUNTRY,
      bio: editorBio,
    },
  });

  const year = new Date().getFullYear();
  const volume = await prisma.volume.upsert({
    where: { publicationId_number: { publicationId: publication.id, number: 1 } },
    update: {},
    create: { publicationId: publication.id, number: 1, year, status: "active" },
  });
  const existingIssue = await prisma.issue.findFirst({ where: { volumeId: volume.id, number: 1 } });
  const issue = existingIssue
    ? existingIssue
    : await prisma.issue.create({
        data: {
          publicationId: publication.id,
          volumeId: volume.id,
          number: 1,
          label: "Volume 1, Issue 1",
          publicationDate: new Date(),
          status: "current",
        },
      });

  const existingArticle = await prisma.article.findUnique({ where: { slug: "welcome-to-ijetdi" } });
  const article = existingArticle
    ? await prisma.article.update({
        where: { id: existingArticle.id },
        data: { content: EDITORIAL_HTML },
      })
    : await prisma.$transaction(async (tx) => {
        const created = await tx.article.create({
          data: {
            slug: "welcome-to-ijetdi",
            title: `Welcome to ${PUBLICATION_SHORT_NAME}`,
            abstract:
              "An inaugural editorial introducing the journal's scope, review process, and call for " +
              "submissions across embedded AI, telecommunications, and digital innovation research.",
            content: EDITORIAL_HTML,
            publicationId: publication.id,
            volumeId: volume.id,
            issueId: issue.id,
            articleType: "Editorial",
            keywords: ["editorial", "embedded ai", "telecommunications", "digital innovation", "journal launch"],
            area: "Digital Innovation & Applications",
            status: "published",
            publishedDate: new Date(),
          },
        });
        await tx.articleAuthor.create({ data: { articleId: created.id, authorId: author.id, position: 0 } });
        await tx.article.update({ where: { id: created.id }, data: { editors: { connect: { id: editor.id } } } });
        return created;
      });

  console.log("Publisher:  ", publisher.slug);
  console.log("Publication:", publication.slug, `(id ${publication.id})`);
  console.log("Volume/Issue:", `v${volume.number}, ${issue.label}`);
  console.log("Editor:     ", editor.slug, `— ${EDITOR_ROLE}`);
  console.log("Author:     ", author.slug);
  console.log("Article:    ", article.slug, `— status "${article.status}"`);
  console.log("\nDone. Reload the site — the landing page should resolve \"ijetdi\" now.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
