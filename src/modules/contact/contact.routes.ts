import { Router } from "express";
import rateLimit from "express-rate-limit";
import { ok, okPaginated } from "../../lib/envelope.js";
import { requirePermission } from "../../middleware/requireAuth.js";
import { validateBody } from "../../middleware/validate.js";
import { camelQuery } from "../../middleware/caseConversion.js";
import { contactCreateSchema, contactStatusUpdateSchema, contactListQuerySchema } from "./contact.schemas.js";
import * as contactService from "./contact.service.js";

export const contactRouter = Router();
export const contactAdminRouter = Router();

// Public form submission — an obvious spam/abuse target with no auth to
// gate it, so it gets its own tight rate limit (per docs/BACKEND_HANDOFF.md's
// general note to think about abuse on unauthenticated write endpoints).
const contactRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many messages sent. Please try again later." } },
});

// POST /api/contact — Public, rate-limited.
contactRouter.post("/contact", contactRateLimit, validateBody(contactCreateSchema), async (req, res, next) => {
  try {
    ok(res, await contactService.createContactMessage(req.body), 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/contact-messages — Permission: contacts.read.
contactAdminRouter.get("/contact-messages", requirePermission("contacts.read"), async (req, res, next) => {
  try {
    const query = contactListQuerySchema.parse(camelQuery(req));
    const { data, pagination } = await contactService.listContactMessages(query);
    okPaginated(res, data, pagination);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/contact-messages/:id — Permission: contacts.read.
contactAdminRouter.get("/contact-messages/:id", requirePermission("contacts.read"), async (req, res, next) => {
  try {
    ok(res, await contactService.getContactMessageById(req.params.id));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/contact-messages/:id/status — Permission: contacts.manage.
// Path matches docs/API_DOCUMENTATION.md's documented contract (the /status
// suffix distinguishes this from a hypothetical future full-record PATCH).
contactAdminRouter.patch(
  "/contact-messages/:id/status",
  requirePermission("contacts.manage"),
  validateBody(contactStatusUpdateSchema),
  async (req, res, next) => {
    try {
      ok(res, await contactService.updateContactMessageStatus(req.params.id, req.body.status));
    } catch (err) {
      next(err);
    }
  },
);
