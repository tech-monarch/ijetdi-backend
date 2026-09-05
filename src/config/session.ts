import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { env } from "./env.js";

// A real, server-side session store (Postgres-backed, via the same
// database — no extra infra like Redis needed on Render) rather than a
// stateless JWT. This is deliberate: docs/API_DOCUMENTATION.md's Auth
// section requires that POST /api/auth/logout actually invalidate the
// session server-side, which a bare JWT can't do without its own
// blocklist. connect-pg-simple creates and manages its own `session`
// table automatically (see `createTableIfMissing` below) — it is not a
// Prisma model.
const PgSession = connectPgSimple(session);

// This pool is separate from Prisma's own connection (src/config/db.ts)
// — Prisma's Rust query engine parses `sslmode=require` per standard
// libpq semantics (encrypt the connection, don't strictly verify the
// certificate chain) and connects to Aiven fine. The `pg` package here
// goes through a DIFFERENT SSL code path (`pg-connection-string`), and
// in current versions that package now aliases `sslmode=require` to
// `verify-full` (see the startup warning it prints) — which DOES
// strictly verify the cert chain, and fails against Aiven's certificate
// with "self-signed certificate in certificate chain", since Aiven's CA
// isn't in Node's default trusted root store. That failure was
// discovered live: it didn't block login itself (the session write
// still happens over the pool once it does connect) but crashed the
// *next* request whenever connect-pg-simple's createTableIfMissing check
// ran, via an unhandled rejection that raced with the response already
// having been sent (see errorHandler.ts's res.headersSent guard, added
// for the same reason).
//
// The explicit `ssl` option below restores the *actual*, standard
// meaning of sslmode=require — encrypt, don't verify — for this pool
// specifically, bypassing pg-connection-string's aliasing entirely.
// Same practical trust model as before (Aiven's managed network), just
// no longer accidentally stricter than intended. If you want real
// certificate pinning instead, download Aiven's CA cert and pass it as
// `ca` here rather than disabling verification.
//
// IMPORTANT: `sslmode=require` is removed from the connection string
// itself (via URL parsing, not a regex — robust regardless of what
// other query params are present or their order) before it's passed to
// Pool, not just overridden by the explicit `ssl` field alongside it.
// Passing both an ssl-bearing connection string AND an explicit `ssl`
// object to the same Pool call left the strict-verification failure
// happening anyway in practice — found by testing this for real against
// a live Aiven database, not simply reasoning about pg's documented
// precedence rules.
const dbUrl = new URL(env.DATABASE_URL);
const hadSslModeRequire = dbUrl.searchParams.get("sslmode") === "require";
if (hadSslModeRequire) dbUrl.searchParams.delete("sslmode");

const pgPool = new pg.Pool({
  connectionString: dbUrl.toString(),
  ssl: hadSslModeRequire ? { rejectUnauthorized: false } : undefined,
});

export const sessionMiddleware = session({
  store: new PgSession({
    pool: pgPool,
    tableName: "session",
    createTableIfMissing: true,
  }),
  name: "journal_sid",
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: env.SESSION_COOKIE_SECURE,
    // Cross-site (Vercel frontend, Render backend) requires SameSite=None
    // + Secure — browsers reject SameSite=None over plain HTTP, so this
    // only applies when SESSION_COOKIE_SECURE=true (i.e. production,
    // behind HTTPS). Local dev (both false) falls back to "lax", which is
    // fine since local dev is normally same-site (localhost:PORT).
    sameSite: env.SESSION_COOKIE_SECURE ? "none" : "lax",
    domain: env.SESSION_COOKIE_DOMAIN || undefined,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
});

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}
