import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";
import { ok } from "../../lib/envelope.js";
import { validateBody } from "../../middleware/validate.js";
import { researchAssistantQuerySchema } from "./research-assistant.schemas.js";
import * as researchAssistantService from "./research-assistant.service.js";

export const researchAssistantRouter = Router();

// Deliberately separate from and tighter than the contact form's rate
// limit (contact.routes.ts) — this endpoint calls paid external APIs
// (Gemini always, Tavily conditionally) on every request, unlike any
// other endpoint in this API. Window/max are configurable via env (see
// .env.example) rather than hardcoded, so a deployment can tune them
// without a code change.
const researchAssistantRateLimit = rateLimit({
  windowMs: env.RESEARCH_ASSISTANT_RATE_LIMIT_WINDOW_MS,
  limit: env.RESEARCH_ASSISTANT_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many research assistant requests. Please try again shortly." },
  },
});

// POST /api/research-assistant/query — Public (matches the frontend's
// mock-backed chat widget, which has no login requirement), rate-limited.
researchAssistantRouter.post(
  "/research-assistant/query",
  researchAssistantRateLimit,
  validateBody(researchAssistantQuerySchema),
  async (req, res, next) => {
    try {
      ok(res, await researchAssistantService.handleQuery(req.body));
    } catch (err) {
      next(err);
    }
  },
);
