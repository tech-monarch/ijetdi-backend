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
