import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { corsOrigins } from "./config/env.js";
import { prisma } from "./config/db.js";
import { sessionMiddleware } from "./config/session.js";
import { attachUser } from "./middleware/attachUser.js";
import { convertRequestBody } from "./middleware/caseConversion.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { setEmailProvider } from "./lib/email/sendEmail.js";
import { resendEmailProvider } from "./lib/email/resendProvider.js";

import { authRouter } from "./modules/auth/auth.routes.js";
import { publishersRouter, publishersAdminRouter } from "./modules/publishers/publishers.routes.js";
import { publicationsRouter, publicationsAdminRouter } from "./modules/publications/publications.routes.js";
import { volumesRouter, volumesAdminRouter } from "./modules/volumes/volumes.routes.js";
import { issuesRouter, issuesAdminRouter } from "./modules/issues/issues.routes.js";
import { articlesRouter, articlesAdminRouter } from "./modules/articles/articles.routes.js";
import { authorsRouter, authorsAdminRouter } from "./modules/authors/authors.routes.js";
import { editorsRouter, editorsAdminRouter } from "./modules/editors/editors.routes.js";
import {
  reviewersAdminRouter,
  reviewerSelfRouter,
} from "./modules/reviewers-reviews/reviewers-reviews.routes.js";
import { indexingRouter, indexingAdminRouter } from "./modules/indexing/indexing.routes.js";
import { contactRouter, contactAdminRouter } from "./modules/contact/contact.routes.js";
import { submissionsRouter } from "./modules/submissions/submissions.routes.js";
import { usersAdminRouter } from "./modules/users/users.routes.js";
import { searchRouter } from "./modules/search/search.routes.js";
import { uploadsAdminRouter } from "./modules/uploads/uploads.routes.js";
import { importAdminRouter } from "./modules/import/import.routes.js";
import { researchAssistantRouter } from "./modules/research-assistant/research-assistant.routes.js";

// Swappable email abstraction — Resend is wired here, once, per
// BACKEND_HANDOFF.md's instruction to keep it out of every call site.
setEmailProvider(resendEmailProvider);

export function createApp() {
  const app = express();

  // Render sits behind Cloudflare/a proxy — needed for correct
  // secure-cookie behavior and rate-limit IP detection.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true, // required for the httpOnly session cookie to cross the Vercel<->Render split
    }),
  );
  app.use(pinoHttp({ autoLogging: { ignore: (req) => req.url === "/health" } }));
  app.use(express.json({ limit: "2mb" }));
  app.use(sessionMiddleware);
  app.use(convertRequestBody);
  app.use(attachUser);

  // Render's health check (per BACKEND_HANDOFF.md's deployment notes).
  // Deliberately does NOT touch the database — Render's platform health
  // check should reflect "is the Node process alive and serving
  // requests", not "is Postgres reachable right now". A transient Aiven
  // blip shouldn't make Render think the whole service is down and
  // restart/reroute away from it.
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Keep-alive endpoint for external uptime pingers (see README.md's
  // "Keeping the backend and database awake on free tiers" section).
  // Unlike /health above, this DOES touch the database — a single real
  // query, cheap and side-effect-free — so one external ping serves two
  // purposes at once: it's HTTP traffic that resets Render's free-tier
  // inactivity spin-down timer, AND it's real activity against Aiven
  // that counts toward keeping a free-tier Aiven service from being
  // auto-powered-off for inactivity. Point your external pinger (see
  // README) at THIS endpoint, not /health, if you want both benefits.
  app.get("/health/keepalive", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: "ok", database: "reachable" });
    } catch (err) {
      // Still 200, not 500 — this endpoint's job is to generate traffic
      // and attempt DB activity, not to be a strict health gate that
      // could itself trigger alerting/retries. Report the failure in the
      // body so a pinger's logs show it, without escalating severity.
      res.status(200).json({ status: "degraded", database: "unreachable", error: (err as Error).message });
    }
  });

  // ── Public routes ────────────────────────────────────────────────────
  app.use("/api/auth", authRouter);
  app.use("/api", publishersRouter);
  app.use("/api", publicationsRouter);
  app.use("/api", volumesRouter);
  app.use("/api", issuesRouter);
  app.use("/api", articlesRouter);
  app.use("/api", authorsRouter);
  app.use("/api", editorsRouter);
  app.use("/api", indexingRouter);
  app.use("/api", contactRouter);
  app.use("/api", submissionsRouter);
  app.use("/api", searchRouter);
  app.use("/api", researchAssistantRouter);

  // ── Reviewer self-service (any authenticated reviewer) ─────────────────
  app.use("/api/reviewer", reviewerSelfRouter);

  // ── Admin routes (permission-gated per-route, see each router) ────────
  app.use("/api/admin", publishersAdminRouter);
  app.use("/api/admin", publicationsAdminRouter);
  app.use("/api/admin", volumesAdminRouter);
  app.use("/api/admin", issuesAdminRouter);
  app.use("/api/admin", articlesAdminRouter);
  app.use("/api/admin", authorsAdminRouter);
  app.use("/api/admin", editorsAdminRouter);
  app.use("/api/admin", reviewersAdminRouter);
  app.use("/api/admin", indexingAdminRouter);
  app.use("/api/admin", contactAdminRouter);
  app.use("/api/admin", uploadsAdminRouter);
  app.use("/api/admin", importAdminRouter);
  app.use("/api/admin", usersAdminRouter);

  app.use((req, res) => {
    res.status(404).json({ success: false, error: { code: "ROUTE_NOT_FOUND", message: `No route: ${req.method} ${req.path}` } });
  });

  app.use(errorHandler);

  return app;
}
