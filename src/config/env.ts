import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  CORS_ORIGINS: z.string().default("http://localhost:5173"),

  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be a long random string"),
  SESSION_COOKIE_SECURE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  SESSION_COOKIE_DOMAIN: z.string().optional().default(""),

  R2_ACCOUNT_ID: z.string().default(""),
  R2_ACCESS_KEY_ID: z.string().default(""),
  R2_SECRET_ACCESS_KEY: z.string().default(""),
  R2_BUCKET_NAME: z.string().default("journal-platform-uploads"),
  R2_PUBLIC_BASE_URL: z.string().default(""),

  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default("IJETDI <noreply@ijetdi.example>"),
  // Where "new submission" / "review submitted" staff-facing notifications
  // go. Empty by default (not required — the same "log instead of throw"
  // dev-mode fallback the Resend provider already uses for
  // RESEND_API_KEY applies here too, via submissions/reviews services
  // simply skipping the send when this is unset).
  EDITOR_NOTIFICATION_EMAIL: z.string().default(""),

  FRONTEND_BASE_URL: z.string().default("http://localhost:5173"),

  // ── AI Research Assistant (Gemini + Tavily) ──────────────────────────
  // Keys default to "" rather than being required so the rest of the
  // backend boots and is fully testable without them; the
  // research-assistant module itself checks for their presence at
  // request time and returns a clean 503 (see
  // research-assistant.service.ts) rather than crashing the whole
  // process at startup over an optional feature's missing credentials.
  GEMINI_API_KEY: z.string().default(""),
  TAVILY_API_KEY: z.string().default(""),
  // Model names are configurable, not hardcoded, per the feature spec —
  // swap either independently (e.g. when Google ships a new embedding
  // generation) without a code change. If you change
  // GEMINI_EMBEDDING_MODEL after chunks already exist, you must
  // re-ingest everything: the new model's output dimension may not
  // match the pgvector column's fixed dimension (see prisma/schema.prisma
  // ArticleChunk.embedding and README.md's "Changing the embedding model"
  // section).
  //
  // Defaults picked 2026-09-04: text-embedding-004 was deprecated by
  // Google on 2026-01-14, so the default here is its replacement,
  // gemini-embedding-001 (output truncated to 768 dims via
  // output_dimensionality — see gemini.ts — to keep the pgvector column a
  // manageable size while still following Google's own recommended
  // truncation points of 768/1536/3072). gemini-2.5-flash is Google's
  // current lower-cost generation tier; it's slated for retirement on
  // 2026-10-16, so this WILL need updating before then — check
  // https://ai.google.dev/gemini-api/docs/models for the current list.
  GEMINI_EMBEDDING_MODEL: z.string().default("gemini-embedding-001"),
  GEMINI_GENERATION_MODEL: z.string().default("gemini-2.5-flash"),
  // Must exactly match GEMINI_EMBEDDING_MODEL's actual output size (after
  // any output_dimensionality truncation) — see gemini.ts. Also drives the
  // pgvector column width in the migration; changing this requires both a
  // new migration AND re-ingesting every chunk.
  GEMINI_EMBEDDING_DIMENSIONS: z.coerce.number().default(768),

  // ── Research Assistant rate limiting ─────────────────────────────────
  // Deliberately separate from and tighter than the contact form's limit
  // (contact.routes.ts) — this endpoint calls paid external APIs
  // (Gemini, and conditionally Tavily) on every request.
  RESEARCH_ASSISTANT_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RESEARCH_ASSISTANT_RATE_LIMIT_MAX: z.coerce.number().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast and loud at boot rather than surfacing confusing errors later.
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
