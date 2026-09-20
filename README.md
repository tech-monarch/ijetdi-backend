# Journal Platform Backend

Real, from-scratch Node.js/Express + PostgreSQL backend for the
publication/journal platform frontend (Milestone 7 handoff), extended in
this pass with the seven documented API gaps (Part 1 below) and a real
AI Research Assistant backend — actual Gemini embeddings/generation +
Tavily web search + pgvector, not a stub (Parts 3-4 below). Implements
the data model, ~45-endpoint API contract, 7-role/26-permission model,
and 11-transition editorial workflow documented in the frontend repo's
`docs/` folder — see `docs/BACKEND_HANDOFF.md` there for the original
spec, and `docs/AI_RESEARCH_ASSISTANT.md` for the Research Assistant
contract this implements exactly (field names unchanged).

## Stack

- Node.js 20+ / Express, TypeScript
- PostgreSQL + `pgvector` (Prisma ORM, `prisma migrate`), hosted on Aiven
  in production — see "Aiven PostgreSQL notes" below
- Cloudflare R2 (S3-compatible) for file storage — Postgres stores only
  URLs/keys, never file bytes
- Cookie-based sessions (httpOnly, Postgres-backed via `connect-pg-simple`)
  — not a bearer token
- Resend for email, behind a swappable `sendEmail()` abstraction
  (`src/lib/email/`)
- Gemini (embeddings + generation) and Tavily (web search) for the AI
  Research Assistant, called via native `fetch` — no SDK dependency added
- Zod for request validation
- Vitest + Supertest for testing

## Getting started

```bash
cp .env.example .env   # fill in real values, including GEMINI_API_KEY / TAVILY_API_KEY
npm install
npx prisma generate
npx prisma migrate dev  # applies both migrations, including the new AI Research Assistant tables
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD=... npm run seed
npm run ingest           # one-time backfill: embeds every already-published article
npm run dev
```

## Casing convention (read this before wiring up the frontend)

**Correction from an earlier version of this README:** responses are
**camelCase**, not snake_case. The original build session chose
snake_case for the whole JSON boundary (a free choice — the frontend's
`src/services/apiClient.js` has no casing opinion, and
`docs/DATABASE_SCHEMA.md` explicitly leaves this up to whoever builds the
real backend), on the theory that it matched `docs/API_DOCUMENTATION.md`'s
query-param spelling. That was wrong in practice: every mock data file,
service, and component in the frontend repo reads response fields as
camelCase (`publicationId`, `journalSources`, `totalPages`, ...) — verified
directly against that repo. Shipping snake_case responses would have
silently broken every page on cutover, since nothing on the frontend
converts an incoming response back to camelCase.

The actual convention now:

- **Responses are camelCase**, matching the frontend's native shape
  exactly. `src/lib/envelope.ts`'s `ok()`/`okPaginated()` pass data
  through unchanged — no conversion — every route uses these, never a
  raw `res.json()`.
- **Requests can be snake_case or camelCase** — `src/middleware/
  caseConversion.ts`'s `convertRequestBody`/`camelQuery` still convert
  incoming snake_case keys to camelCase before validation. This is
  deliberately left in place: it's a harmless no-op on already-camelCase
  input (the conversion only rewrites keys containing an underscore), and
  keeps `?publication_id=...`-style query params working if anything ever
  sends them that way.
- Internally, all TypeScript (Zod schemas, Prisma models, service
  functions) stays in camelCase, matching Prisma's generated client —
  this part was never in question.

If you want strict snake_case-in-snake_case-out instead (e.g. to match a
non-JS consumer later), reintroduce `camelToSnake()` in `envelope.ts` —
but confirm first that whatever's consuming the response actually expects
that; don't reintroduce it against this frontend.

## Known verification gaps (read before trusting this blindly)

This was built and extended across two sessions in the same kind of
sandboxed environment, with **no outbound network access to**
`binaries.prisma.sh`, `generativelanguage.googleapis.com`, or
`api.tavily.com`. Confirmed directly (not assumed) this session: `curl`
to the Gemini and Tavily hosts returns HTTP 403 with response header
`x-deny-reason: host_not_allowed` — the same egress-proxy block
mechanism that stops `binaries.prisma.sh`, just for different domains.
Concretely:

- `prisma generate` / `prisma validate` still never complete —
  `PrismaClient` is a stub that throws
  `"@prisma/client did not initialize yet"` on construction, and every
  `Prisma.sql`, `Prisma.ArticleWhereInput`, etc. reference is untyped as
  a result. **This is the single root cause of every one of the 36
  current `tsc --noEmit` errors** — confirmed by reading each one: they're
  all either "Property 'X' does not exist on type 'typeof Prisma'" or an
  implicit-`any` on a callback parameter whose type would have come from
  the generated client. None of the 36 reflect an actual logic bug; they're
  the same category of error the original build session already disclosed,
  now appearing in more files because this pass added more Prisma-touching
  code (the AI Research Assistant module).
- Real Gemini and Tavily API calls were **not** made — confirmed blocked,
  not just untried. `src/lib/gemini.ts` and `src/lib/tavily.ts` are
  written against each API's documented REST contract (Gemini's
  `embedContent`/`generateContent`, Tavily's `/search`) but neither has
  been exercised against a live endpoint. **No real embedding, no real
  Gemini-generated answer, and no real Tavily search result has been
  produced or seen by this backend.** Treat the whole
  `research-assistant` module as correctly-structured-but-unexecuted
  until someone runs it with real keys on a machine with real network
  access.

**What *was* possible, and was done, this session:**

- Real local Postgres 16 + pgvector 0.6.0 installed (again) and both
  migrations — the original init migration and the new
  `20260904120000_ai_research_assistant` migration — applied directly via
  `psql`, cleanly, in sequence.
- A real 768-dimension vector was inserted into a real `article_chunks`
  row (`INSERT ... VALUES (..., '[...]'::vector, ...)`), and a real
  cosine-similarity query using the exact `<=>`-operator pattern
  `retrieval.service.ts` uses was run against it and returned a correct,
  sane similarity score. This is the actual SQL shape the retrieval code
  issues, executed for real — not an analogous or simplified stand-in.
- The `ivfflat` index built without error (Postgres's own "little data,
  low recall" notice on an empty table is expected and harmless, not a
  problem — see the migration's comment).
- `tests/unit` — all 42 tests pass (26 pre-existing + 16 new: 4 for the
  search fix's combine/paginate logic, 7 for the article-chunking
  strategy — which caught and fixed a real bug, see below — and 5 for the
  internal-vs-external sufficiency decision).
- `tests/integration` was retried with a real local Postgres + real env
  vars configured (not just missing-env-var failures as before) and now
  fails at exactly one line — `new PrismaClient()` in `src/config/db.ts` —
  confirming, again, that the Prisma client stub is the *only* blocker for
  the integration suite, the same finding as before, re-verified.
- One real bug was found and fixed during this session's own unit
  testing: the article-chunking overlap logic only carried
  previous-chunk words forward on the rare "single paragraph would
  overflow the max-size ceiling" branch, not on the common
  "target-size reached, flush normally" branch — meaning most real
  chunk boundaries would have gotten zero overlap. Caught by
  `tests/unit/chunking.test.ts`, fixed, verified passing.

**What you need to do on a machine with normal internet access:**

1. `npm install && npx prisma generate` — resolves the `PrismaClient`
   stub and, with it, every remaining TypeScript error.
2. Point `DATABASE_URL` at Postgres 16+ with pgvector (Aiven in
   production — see below; `docker compose up -d` for local dev), then
   `npx prisma migrate dev` — both migrations were already proven
   correct above, so this should apply cleanly.
3. Fill in `GEMINI_API_KEY` and `TAVILY_API_KEY` in `.env` (see
   `.env.example` for where to get them).
4. `npm test` — the 42 unit tests will still pass; the integration
   tests should now run for real.
5. `npm run seed`, then `npm run ingest` to backfill embeddings for any
   already-published articles, then `npm run dev`.
6. **Actually send a real question to `POST /api/research-assistant/query`**
   and confirm you get a real answer back with real citations — this is
   the one thing that genuinely cannot be verified without live network
   access, so it deserves a deliberate first real test, not just an
   assumption the code is right because it compiles.

None of this reflects an actual bug found and left in place — it's the
sandbox's network policy, not the code, with one exception (the chunking
overlap bug above), which was found and fixed, not left in place.

## Changing the embedding model

If you swap `GEMINI_EMBEDDING_MODEL` or `GEMINI_EMBEDDING_DIMENSIONS`
after any `ArticleChunk` rows already exist:

1. The old vectors are not comparable to a new model's output space —
   even at the same dimension, a cosine similarity between an old and a
   new embedding is meaningless.
2. If the dimension itself changes, every insert against the existing
   `vector(768)` column fails outright (or every *read* silently starts
   producing wrong results, if you also alter the column width without
   re-ingesting).
3. Required steps: write a migration to alter `article_chunks.embedding`'s
   width if the dimension changed, update `.env`, then run
   `npm run ingest` again for every article — there is no partial or
   incremental path here, it's a full re-embed.

## Aiven PostgreSQL notes

Production runs on Aiven Managed PostgreSQL, not a generic self-hosted
instance:

- **SSL is enforced by default.** `DATABASE_URL` must include
  `sslmode=require` (or `verify-full` with Aiven's CA cert for pinning) —
  see `.env.example` for exact connection-string examples for both local
  dev and Aiven.
- **pgvector is supported**, and the migrations' `CREATE EXTENSION IF NOT
  EXISTS vector;` should succeed for the default `avnadmin` user. If it
  errors with a permission denial, enable the extension first via the
  Aiven console (Service → Extensions) or the `avn service` CLI, then
  re-run the migration.
- **A PgBouncer pooler URI is available** as an alternative connection
  string. Not required at this project's scale; if you do switch to it,
  be aware Prisma's `connection_limit` connection-pool parameter
  interacts with an external pooler — tune deliberately, don't just swap
  the URI.
- **Not tested against a real Aiven instance** in this build environment
  — same category of limitation as the Prisma binary download, disclosed
  the same way. The migration SQL and connection config are believed
  correct per the above, and were verified against a real (non-Aiven)
  Postgres + pgvector instance, but live Aiven connectivity specifically
  was not exercised.

## AI Research Assistant — architecture

Implements `POST /api/research-assistant/query` per
`docs/AI_RESEARCH_ASSISTANT.md`'s contract exactly (see that doc for the
full request/response shape). Summary of the real pipeline:

1. **Ingestion** (`src/modules/research-assistant/`):
   - `chunking.ts` — pure, dependency-free paragraph-based chunking
     (title and abstract each get their own dedicated chunk; body content
     is grouped into ~700-word target chunks, ~1000-word ceiling, ~15%
     word overlap between consecutive body chunks). Fully documented
     rationale in the file's header comment. Unit-tested
     (`tests/unit/chunking.test.ts`).
   - `ingestion.service.ts` — chunks + embeds (via `lib/gemini.ts`) +
     stores each chunk via raw parameterized SQL (Prisma has no native
     `vector` column type). Always deletes existing chunks first, so
     re-ingesting an edited article never leaves stale embeddings mixed
     in with fresh ones.
   - **Trigger points**, hooked directly into the existing transition
     logic rather than duplicating it:
     - `articles.service.ts`'s `updateStatus()` — ingests on transition
       *into* `published`; deletes chunks on transition *out of*
       `published` (unpublish/archive). Both are best-effort/fire-and-forget
       relative to the status change itself — an AI feature being
       temporarily down must never block an editor's publish/unpublish
       action.
     - `articles.service.ts`'s `updateArticle()` — re-ingests only when
       the article is already `published` *and* one of title/abstract/
       content actually changed.
   - `npm run ingest` (`src/db/ingest.ts`) — one-time backfill for
     articles published before this feature existed.
2. **Retrieval** (`retrieval.service.ts` / `retrieval.pure.ts`):
   real pgvector cosine-distance (`<=>`) query, always implicitly scoped
   to `status='published'` server-side regardless of what filters the
   request sends (a client cannot bypass this), with optional
   publication/author/area/year filters applied as additional SQL
   conditions. "Internal results sufficient" is decided by a documented,
   named-constant rule (≥2 chunks at ≥0.75 cosine similarity) — see the
   file's header comment for the full rationale — only falling back to
   Tavily when that bar isn't met.
3. **Citations** (`citations.ts`): per `docs/DATABASE_SCHEMA.md`'s explicit
   instruction, citation metadata is *not* denormalized onto
   `ArticleChunk` — this joins back to `Article` (and its existing
   Author/Volume/Issue relations) at query time to build the documented
   `journalSources` shape.
2. **Synthesis** (`research-assistant.service.ts` + `lib/gemini.ts`): a
   low-temperature (0.1) Gemini generation call, given only the retrieved
   chunks or Tavily results as labeled sources (`[J1]`, `[E1]`, ...) and a
   system prompt that forbids using outside knowledge and requires the
   documented "I don't have information about that in our publications"
   fallback when nothing relevant was found. **Citation enforcement**: if
   the model's answer cites a label that wasn't actually in the provided
   source list, the whole answer is replaced with the safe fallback
   message rather than attempting to surgically edit the generated text —
   a stricter, simpler application of "no citation, no claim" than
   partial-editing would be, documented as a deliberate simplification in
   the code.
3. **Conversation persistence**: `AiConversation`/`AiMessage` round-trip
   `conversationId` across turns; the last few turns of history are
   passed back into the Gemini call for follow-up context.
4. **Rate limiting**: a separate, tighter `express-rate-limit` instance
   from the contact form's (this endpoint calls paid external APIs on
   every request), window/max configurable via env.
5. **Error handling**: Gemini/Tavily failures throw a typed `ApiError`
   (503, `ASSISTANT_UNAVAILABLE`) that the existing `errorHandler.ts`
   turns into a clean envelope response — never a raw stack trace to the
   client.

**Admin controls** (enable/disable, usage limits, allowed external
domains): not built. The task and `docs/AI_RESEARCH_ASSISTANT.md` both
treat these as optional future additions ("if you add any admin
controls..."), not a requirement, and no such controls exist yet
anywhere for this feature — noted here rather than left silently absent.

## Part 1 — gap fixes (this session)

All seven previously-identified gaps are implemented:

1. `GET /api/admin/reviewers/:id`
2. `GET /api/admin/contact-messages/:id`
3. `GET /api/admin/indexing/:id`
4. `GET /api/admin/{publishers,authors,editors,publications}/:id` — raw,
   unenriched single-record fetch by internal id, matching
   `articles.routes.ts`'s existing `GET /api/admin/articles/:id` pattern
5. `GET /api/search` now searches Authors as well as Articles, and
   returns the documented lightweight shape
   `{ type: "article"|"author", id, slug, title }` — confirmed against
   the frontend's `src/services/searchService.js` and `src/pages/Search.jsx`,
   which key off exactly those four fields. Combine/paginate logic
   extracted into `search.pure.ts` and unit-tested.
6. `PATCH /api/admin/contact-messages/:id` → `PATCH
   /api/admin/contact-messages/:id/status`, matching
   `docs/API_DOCUMENTATION.md`'s already-documented contract (chose to
   change the code, not the doc, since the doc was correct).
7. `GET /publications/:id/editors` → `GET
   /publications/:id/editorial-board` (public and admin variants), same
   reasoning as #6.

All seven have unit-test coverage where the fix was pure logic (the
search shape/pagination); the single-record GETs and path renames are
straightforward enough that they're better verified via the integration
suite once a real database connection is available (see "Known
verification gaps" above) than via a unit test asserting on trivial
Prisma pass-through code.

## Keeping the backend and database awake on free tiers

If you're deploying this on Render's free web-service tier with Aiven's
free PostgreSQL plan, two separate inactivity behaviors can bite you:

- **Render** spins down a free web service after ~15 minutes with no
  HTTP traffic. The next request then pays a slow cold-start.
- **Aiven** auto-powers-off a free-tier service after "an extended
  period of inactivity" (Aiven emails a warning first, but doesn't
  publish an exact time threshold — see
  [Aiven's free-tier FAQ](https://aiven.io/free-postgresql-database)).

**The fix for Render is reliable:** a periodic HTTP request to any
endpoint resets its inactivity timer. **The fix for Aiven is a
reasonable mitigation, not a guarantee** — a query against it is real
activity and should help, but since Aiven's exact threshold isn't
public, don't treat this as bulletproof for anything you can't afford to
have pause.

`GET /health/keepalive` is built for exactly this — unlike the plain
`/health` endpoint Render's own platform health check uses (which
deliberately never touches the database, so a transient Aiven blip can't
make Render think the whole service is down), `/health/keepalive` runs a
real `SELECT 1` against Postgres. One external ping there serves both
purposes at once.

**Set up a free external pinger** hitting it every 10-14 minutes (must
be under Render's 15-minute window):

- [cron-job.org](https://cron-job.org) (free, no signup limits) — create
  a job hitting `https://your-app.onrender.com/health/keepalive` every
  10 minutes.
- [UptimeRobot](https://uptimerobot.com) (free tier, 5-minute minimum
  interval) — same idea, with the side benefit of actual uptime
  monitoring/alerting.
- A scheduled GitHub Actions workflow in your own repo (free on public
  repos) running `curl` on a cron schedule — more setup, but keeps it
  entirely within infrastructure you already control.

Don't rely on Render's *own* infrastructure to ping itself — a service
that's spun down can't run a cron job to wake itself up. The pinger has
to be external.

**If this backend needs to be reliably always-on** (a real production
site, not a personal project), the more dependable fix on the Aiven side
is upgrading to Aiven's Developer tier (~$5/month) — Aiven states
explicitly that Developer-tier services are never auto-powered-off
regardless of activity, which removes the guesswork entirely. Render
also offers a paid tier without the spin-down behavior. The keep-alive
ping above is a reasonable free-tier workaround, not a substitute for
paying for either service once this is a real thing people depend on.



See the plan posted in the original handoff conversation — `src/modules/`
has one folder per resource (schemas/service/routes), `src/lib/` holds
shared business rules (permissions, editorial workflow, envelope, case
conversion, and now the Gemini/Tavily clients), `src/middleware/` and
`src/config/` hold cross-cutting infrastructure.

## Rich Text Editor milestone (this session)

The frontend replaced the plain `<textarea>` for `Article.content` with
a real TipTap-based rich text editor, and added a new `content` field to
`Publication` (a journal-level "about this journal" body — didn't exist
before). This session's backend changes support both:

- **New migration** (`prisma/migrations/20260906120000_add_publication_content/`)
  — adds a nullable `content TEXT` column to `publications`. Additive,
  non-destructive.
- **New shared module**: `src/lib/sanitizeContent.ts` — a strict
  `sanitize-html` allowlist matching exactly the TipTap extensions the
  frontend enables (see `src/admin/shared/richTextEditor/` in the
  frontend repo). Wired into both `articles.service.ts` and
  `publications.service.ts`, on every create AND update, independent of
  whatever the frontend's own sanitization pass already did.
- **`chunking.ts` updated**: `Article.content` is now real HTML (it was
  always `null` before this milestone, so the chunking pipeline never
  had to deal with markup). Added a local `htmlToPlainText()` helper
  (deliberately dependency-free, matching this module's existing
  "pure, unit-testable" design) so chunk/citation text stays readable
  instead of containing raw tags.
- **New tests**: `tests/unit/sanitizeContent.test.ts` (8 tests — covers
  real XSS payloads: script tags, `onerror`/`onclick` handlers,
  `javascript:` URLs, `data:` URIs on images, disallowed style
  properties, forced `rel="noopener noreferrer"` on links) and one new
  case in `tests/unit/chunking.test.ts` covering HTML-to-plain-text
  stripping. **58/58 tests pass** (was 49 before this session — 9 new).
  `tsc` unchanged at 36 errors (all pre-existing Prisma-generation
  artifacts, none in any file touched this session).

**What was NOT verified live**: same category of limitation as every
prior session — no real Postgres/Aiven connection was reachable here, so
the new migration was never actually applied to a real database in this
environment. The sanitizer itself (pure Node.js, no database) was
genuinely exercised, including real XSS payloads, not just asserted.

**Not in scope this session** (a separate, later milestone): Word/PDF/
image document upload with content extraction and OCR, to populate the
editor from an existing source file. This session only replaces manual
typing with a real rich text editor — it doesn't add any new import
pipeline.

## Document Import Pipeline & Editorial Team milestone (this session)

Two features, per the milestone spec: (1) a document import pipeline —
upload a Word/PDF/image source file, get back extracted, sanitized
rich-text HTML — and (2) Editorial Team — recording which editor(s)
handled an article, separate from authorship.

### Part 1 — Document Import Pipeline

New module, `src/modules/import/`: `detectFileType.ts` (magic-byte
detection), `docxImporter.ts` (mammoth), `renderPdfPage.ts` (its own
module — see "gotchas" below), `ocr.ts` (Tesseract.js), `pdfImporter.ts`
(pdfjs-dist text-layer extraction + heading heuristic + OCR fallback),
`imageImporter.ts`, `import.service.ts` (orchestration), `import.routes.ts`
(`POST /api/admin/import`, mounted in `app.ts` alongside the existing
uploads router). New dependencies, versions verified against the real
npm registry before installing: `@napi-rs/canvas@^1.0.9`,
`mammoth@^1.12.3`, `pdfjs-dist@^6.3.289`, `tesseract.js@^7.0.0`.

**Fixed while in this area**: `errorHandler.ts` had no `multer.MulterError`
branch — an oversized upload (`LIMIT_FILE_SIZE`) fell through to the
generic 500 handler instead of a clean 400. Confirmed by reading the file
directly (the plan predicted this gap; verified it, not assumed it).
Fixed for both the existing uploads endpoint and this new one.

**Real gotchas found and fixed, beyond what the milestone spec
anticipated** — each confirmed against a real hand-crafted fixture, not
assumed:

1. **pdfjs-dist v6 truncates a very long single-line `Tj` string operand**
   (observed at ~100 characters) in this environment. Found because the
   first hand-built PDF fixture's body text (one long `Tj` call) came
   back cut off mid-word from `getTextContent()`. Not a
   `standardFontDataUrl`/font-metrics issue (tested that theory directly
   — providing `standardFontDataUrl` didn't change the truncation point).
   Worked around by building the fixture the way real PDF generators
   actually do — text wrapped across multiple `Tj`/`Td` operators, one
   per visual line — which real-world PDFs (from Word, LibreOffice, print
   drivers, etc.) already do as a matter of course, so this is unlikely
   to affect real documents. Also used this to improve the heading/
   paragraph heuristic: consecutive wrapped lines with a small Y-gap are
   now merged into one `<p>`, rather than one paragraph per visual line.
2. **tesseract.js v7's `createWorker` has two independent failure paths**
   on worker-init failure (e.g. no network access to fetch language
   data): it rejects the returned promise (catchable) *and* separately
   throws inside an internal message-event listener when no
   `errorHandler` option is configured — an uncaught exception that
   crashes the whole Node process, bypassing any surrounding try/catch
   entirely. Confirmed by watching it actually crash the process before
   the fix. Fixed with a no-op `errorHandler` in `createWorker`'s
   options — the real error still reaches the caller via the rejected
   promise.
3. **Suppressing that crash then let the underlying retry/fetch logic
   hang far longer than useful** (confirmed: a 60-second kill wasn't
   enough) rather than rejecting promptly. Added a 45-second hard
   timeout (`Promise.race`-style wrapper) around both worker
   initialization and recognition in `ocr.ts`, so one stuck OCR pass
   can't hang the whole synchronous import request. Noted as a real,
   secondary finding: even with the timeout firing correctly, the
   underlying worker thread didn't visibly clean up within the test
   process's lifetime — likely fine in a long-lived Express process
   (the worker thread just lingers, doesn't block anything else), but
   flagging it here rather than asserting it's harmless without a real
   long-running server to check against.
4. **One real TypeScript narrowing gotcha** (not an environment gap):
   `Array.prototype.filter`'s type-guard overload only narrows when the
   guarded type is a structural subtype of the array's element type.
   `TextItem | TextMarkedContent`'s real shape (many pdfjs-dist-internal
   fields) doesn't structurally match a minimal local `TextItemLike`, so
   `.filter(hasTransform)` silently fell back to the non-narrowing
   overload. Fixed with a manual loop instead of relying on `.filter`'s
   type-guard narrowing at all.

**Verified for real** (not asserted from docs): `@napi-rs/canvas` —
created a canvas, drew to it, got back real PNG magic bytes.
`pdfjs-dist` — real text-layer extraction (correct strings, correct
per-character position/font-size data) and real page-to-PNG rendering
against a hand-crafted PDF fixture, visually confirmed. `mammoth` — real
DOCX→HTML conversion against a hand-crafted `.docx` (built via Python's
stdlib `zipfile`), including a real mammoth-generated warning for an
undefined referenced style. Tesseract's actual OCR *recognition* pass
specifically could **not** be verified end-to-end — blocked by the same
category of sandboxed-network limitation as Gemini/Tavily/Prisma-binaries
elsewhere in this document (confirmed precisely: a real 403 from
`cdn.jsdelivr.net` fetching language data, not a guess). Everything
around it — worker creation, the timeout wrapper, error propagation, and
the orchestration logic that calls it — was verified for real via the
gotchas above and the mocked-OCR unit tests.

**New tests**: `tests/unit/detectFileType.test.ts` (8),
`tests/unit/docxImporter.test.ts` (3, real mammoth + mocked `uploadToR2`),
`tests/unit/pdfImporter.test.ts` (4, real pdfjs-dist extraction for the
text-based fixture + mocked render/OCR for the scanned-page fixture),
`tests/unit/import.service.test.ts` (6, orchestration — upload-first
ordering, embed-fallback decision both ways, unsupported-type rejection
before upload, image-always-OCR'd). **21 new tests, all passing.**
Fixtures in `tests/fixtures/`: `heading-and-paragraph.pdf` and
`heading-and-paragraph.docx` (hand-crafted, real content, deliberately
well over any usable-text-length threshold — see the milestone spec's
own note on why a too-short fixture is a trap), `blank-no-text.pdf` (an
empty content stream, for the scanned-page-detection path).

### Part 2 — Editorial Team

`Article.editors` / `Editor.articles`, a plain Prisma implicit m2m named
`ArticleEditorialTeam` (no custom join model — unordered, unlike
`ArticleAuthor`). Hand-written migration
(`prisma/migrations/20260918130000_article_editorial_team/`) since
`prisma migrate dev`/`validate` can't reach `binaries.prisma.sh` here
(confirmed with the same 403 pattern as every other Prisma-binaries gap
in this document). `articles.schemas.ts` gained `editorIds` (defaults to
`[]`); `articles.service.ts`'s `enrich()` now includes resolved
`editors[]` for public reads, `getAdminById()` now includes `editorIds`
for the admin edit form, and create/update both wire `editors: { connect
| set }` — update only touches the team when `editorIds` was explicitly
sent (mirrors `authorIds`' own explicit-empty-array-vs-omitted rule).

**Confirmed, traced precisely, not assumed**: exactly one new `tsc`
error, exactly where the milestone spec predicted —
`articles.service.ts`'s `editors.map((e) => e.id)` in `getAdminById()`,
`Parameter 'e' implicitly has an 'any' type` — same root cause
(Prisma client can't regenerate in this sandbox) as every other baseline
error in this file. Diffed the full `tsc` output before/after this
change line-by-line to confirm it's the *only* addition, not assumed
from the error count alone. `tsc` error count: **37 with this one
new error present** — but see below.

### Verification summary

- **Tests**: 79/79 unit tests passing (58 before this session + 21 new).
  The two integration suites (`articles.test.ts`, `auth.test.ts`) still
  can't run in this environment — same pre-existing
  `@prisma/client did not initialize yet` root cause documented above,
  not a regression from this session's changes.
- **`tsc --noEmit`**: **37 errors — 36 baseline + exactly 1 new**, traced
  precisely to `articles.service.ts`'s `editors.map((e) => e.id)` in
  `getAdminById()` (Editorial Team), same root cause as every other
  baseline error (Prisma client can't regenerate in this sandbox) — this
  is the one new error the milestone spec itself predicted. (A separate,
  unrelated `.filter()` type-guard narrowing gotcha turned up in
  `pdfImporter.ts` — gotcha #4 above — and was fixed on its own merits;
  it never contributed to the baseline count either way, since it was
  caught and fixed within the same session before the baseline was ever
  measured with it present.)
- `npm run build` / `tsc --noEmit -p tsconfig.json`: same 36 pre-existing
  Prisma-generation-artifact errors, all in files untouched by this
  session, confirmed by diffing line-by-line against the pre-session
  output, plus the one new Editorial Team error above.
- Ran a real DOCX and a real PDF fixture all the way through
  `import.service.ts` end to end (via the unit test suite) and confirmed
  the final sanitized HTML matches `sanitizeContent.ts`'s allowlist — no
  unexpected stripped content, no leaked disallowed tags.

**What was NOT verified live**: same category of limitation as every
prior session — no real Postgres/Aiven connection, no real R2 credentials,
so the new migration was never applied to a real database, and R2
uploads inside `import.service.ts` are exercised only via the mocked
`uploadToR2` in unit tests, not a real upload. Tesseract's real
recognition pass (as opposed to worker lifecycle/error-handling, which
was genuinely exercised) also couldn't be verified live — see the
gotchas section above for exactly what was and wasn't confirmed.

## Submissions, Peer Review & User Accounts milestone (this session)

Closed three structural gaps flagged after a full platform review (see
the frontend repo's `PROJECT_STATUS.md` for the review itself): no
author-facing manuscript submission path, no working peer-review
assignment/submission workflow despite the data model already existing
for it, and no way to create a staff login without shell access to the
database.

### Part 1 — Manuscript submissions

New module, `src/modules/submissions/`. `POST /api/submissions` (public,
rate-limited 3/hour/IP) — real magic-byte file validation (reusing
`detectImportFileKind` from the Document Import Pipeline), uploads the
original file to R2 **before** anything else so a later failure never
loses it, resolves each author to a real `Author` record (matched by
email, created otherwise), generates a collision-checked slug
(`src/lib/slugify.ts` — new utility; every other model here takes an
admin-typed slug, and a public submission has no admin present to type
one), then creates the Article via the same `createArticle()` an admin's
own form uses, with `status: "submitted"`. Best-effort confirmation/
notification emails, never blocking the submission itself.

### Part 2 — Peer review, for real

The `Review` model already had almost everything needed
(`manuscriptId`, `reviewerId`, `recommendation`, `comments`,
`submittedAt`) — it just had no working create/update endpoints, and its
`status` field was a free-text placeholder with a comment literally
saying "define the real enum when the review-submission workflow is
actually built." That's this session. Added a real `ReviewStatus` enum
(`pending`/`completed`/`declined`), `invitedAt`/`dueDate`, and a
`@@unique([manuscriptId, reviewerId])` constraint so a reviewer can't be
double-assigned. New endpoints: `POST /api/admin/reviews` (assign,
emails the reviewer), `GET /api/admin/reviews[/:id]`, `PATCH
/api/reviewer/reviews/:id` (a reviewer submits their own review —
ownership checked both in the route and again in the service, since
"a reviewer can only touch their own review" is the entire point of that
endpoint existing separately from the admin one).

**A real, previously-invisible bug found while wiring the frontend up to
this**: the reviewer-facing screens (`MyReviews.jsx`,
`ReviewerDetail.jsx`) called `reviewerService.getReviewerById()` and
`articleService.getById()` — both admin-only endpoints requiring
`reviewers.manage`/`articles.update`, permissions a plain `reviewer`
role has never held. Against the mock-data era this never surfaced;
against this real backend it would have been a 403 the first time an
actual reviewer logged in. Fixed with a new, deliberately narrow
endpoint, `GET /api/reviewer/manuscripts/:id`, that returns a minimal
manuscript projection (title, abstract, file, status) **only** when a
`Review` row proves this reviewer is genuinely assigned to it — not a
relaxation of the admin permissions, a purpose-built least-privilege
lookup instead.

A second bug in the same area: `ReviewerList.jsx` read
`reviewer.assignedManuscriptIds?.length` — a field that never existed on
the real `Reviewer` model (a mock-data-era leftover), so that column
silently always rendered 0. Fixed with a real computed count
(`listReviewers()` now includes `_count` on the `reviews` relation).

Also added, since it was a natural (and necessary) extension of the same
area: `POST`/`PATCH /api/admin/reviewers` were already real backend
routes that the frontend never called (`reviewerService.js` was
read-only) — assigning reviewers isn't very useful if there's no way to
add new ones to the pool. Now wired up (`ReviewerDetail.jsx` rebuilt from
a read-only view into a real create/edit form).

### Part 3 — User accounts

New module, `src/modules/users/`. Full admin CRUD, gated by
`users.manage` (super_admin only). **Deliberately never accepts a
password from the admin creating the account** — a random, never-
revealed placeholder is hashed and stored purely to satisfy the `NOT
NULL` constraint, and the new user gets a real "set your password" link
through the exact same single-use token mechanism forgot-password uses
(factored `issuePasswordResetToken` out of `auth.service.ts` specifically
so both flows share it, rather than duplicating the token logic). Added
`User.active` (default `true`) so an account can be revoked without a
real delete — checked in `login()`, where a deactivated account gets the
identical generic error message as a wrong password (distinguishing the
two would itself leak account existence).

### A real, pre-existing bug fixed while adding this — errorHandler.ts

Found while checking how the submissions endpoint's own validation
errors would be formatted: **`errorHandler.ts` had no `ZodError` branch
at all.** A few existing routes (`contact.routes.ts`,
`reviewers-reviews.routes.ts`, `search.routes.ts`) call a schema's
`.parse()` directly on the query string rather than going through
`validate.ts`'s `safeParse`-based middleware — a malformed query string
on any of them would throw a raw `ZodError` that fell through to the
generic 500 handler. Fixed centrally, protecting both those pre-existing
routes and every new one added this session.

### Real Postgres verification — a first for this project

Every prior session in this document has flagged the same limitation:
`prisma generate`/`migrate`/`validate` can't reach
`binaries.prisma.sh` in this sandboxed environment, so migrations could
only ever be reviewed by eye, never actually run. This session, that
changed: `archive.ubuntu.com`/`security.ubuntu.com` (used for Ubuntu
package installation) turned out to be reachable, so a real local
PostgreSQL 16 + the `postgresql-16-pgvector` package were installed and
used to **apply every migration in this project, in order, end to end,
against a real database for the first time.**

This caught a real, previously-undetected bug: migration
`20260905094825_idjeti` tried to `DROP INDEX
"article_chunks_embedding_idx"` — an index the immediately-preceding
migration (`20260905093316_idjeti`) had already dropped. On a fresh
database, `prisma migrate deploy` would have failed outright at that
exact step with "index does not exist." Fixed with `DROP INDEX IF
EXISTS`, confirmed idempotent both ways: a no-op on a fresh deploy, and
identical to the original behavior on any database where this migration
already ran successfully before this fix. Re-ran the entire chain from
scratch on a fresh database afterward — all eight migrations now apply
cleanly in sequence.

With a real, fully-migrated database available, also directly verified
(via raw SQL, since a real generated Prisma Client remains unavailable —
see below) that this session's own new constraints behave exactly as
designed: a duplicate `(manuscript_id, reviewer_id)` insert is genuinely
rejected by the unique index; an invalid `ReviewStatus` value is
genuinely rejected by the enum type; `users.active` genuinely defaults
to `true`; and deleting an `Editor` genuinely cascades to remove the
corresponding `_ArticleEditorialTeam` row. None of this was possible to
confirm in any prior session.

**What real Postgres access did *not* fix**: a working, fully-typed
`@prisma/client` still requires the query engine binary itself (not just
a database to connect to), and that binary is still only fetchable from
`binaries.prisma.sh`, which remains blocked. This was tested directly,
twice, rather than assumed: a plain `prisma generate` still 403s on the
engine download even with `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1`
set; enabling the `driverAdapters` preview feature and installing
`@prisma/adapter-pg` (which lets Prisma execute queries through the
plain `pg` driver at runtime, bypassing the engine binary for query
*execution*) still requires the same blocked binary at `generate` time,
for schema parsing/DMMF generation — confirmed by attempting it, not
assumed from documentation. Checked one more avenue directly: the
`@prisma/engines` npm package (on the npm registry, which *is*
reachable) turned out to be a 95KB installer/fetcher wrapper, not a
bundled binary — inspected its packed contents directly to confirm. Both
experiments (the `driverAdapters` preview feature, the `@prisma/adapter-
pg` dependency) were fully reverted, confirmed byte-identical to the
pre-experiment `schema.prisma` afterward. The two integration test files
(`articles.test.ts`, `auth.test.ts`) that need a real `PrismaClient`
instance still can't run here — this is now a precisely
triple-confirmed limitation, not an assumed one.

### Verification summary

- **Tests**: 113/113 unit tests passing (79 before this session, 34 new:
  5 for `slugify`, 7 for the submissions orchestration, 13 for the
  reviews/reviewers additions, 9 for user account management). The two
  integration suites still can't run — see above.
- **`tsc --noEmit`**: 38 errors — the 36 pre-existing baseline, plus 2
  new, both precisely traced to the same root cause (Prisma client types
  unavailable without real `generate`), not new type-safety gaps: one is
  the milestone-predicted `editors.map` error from the prior session,
  still present; the other is a new `implicitly has an 'any' type` on a
  destructured `_count` in `listReviewers()` — attempted a real fix with
  an explicit type annotation, but that only moved the same root-cause
  error to the surrounding `.map()` callback rather than resolving it
  (also confirmed by directly re-running `tsc` after the attempt, not
  assumed), so kept the simpler, equally-correct code rather than adding
  complexity for no reduction in error count.
- Real Postgres verification, as detailed above — migrations, real
  constraint behavior, cascade behavior.
- Frontend: `npm run build` succeeds; `npx oxlint src` — 9 warnings, 0
  errors, unchanged from baseline (confirmed the same count, not just
  "still passes").

**What still couldn't be verified live**: a real HTTP request against a
running instance of this backend end-to-end (the app still can't boot
without a working `PrismaClient` — real Postgres access doesn't change
that, since the blocker is the query engine binary, not the database
connection); real Resend delivery of any of the five new/reused email
templates; and, as with every session before this one, an actual browser
click-through of any of the new admin screens or the public submission
form.
