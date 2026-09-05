import { Router } from "express";
import { ok } from "../../lib/envelope.js";
import { validateBody } from "../../middleware/validate.js";
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from "./auth.schemas.js";
import * as authService from "./auth.service.js";

export const authRouter = Router();

// POST /api/auth/login — Public.
authRouter.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await authService.login(email, password);
    req.session.userId = user.id;
    // Cookie-based session (see docs/API_DOCUMENTATION.md's Auth
    // section) — no token in the body needed; Set-Cookie does the work.
    ok(res, { user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout — Authenticated.
authRouter.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      next(err);
      return;
    }
    res.clearCookie("journal_sid");
    ok(res, null);
  });
});

// GET /api/auth/me — returns null rather than 401 when unauthenticated;
// AuthContext.jsx on the frontend calls this unconditionally on every
// app load to restore/check session state.
authRouter.get("/me", async (req, res, next) => {
  try {
    const user = await authService.getMe(req.session.userId);
    ok(res, user);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password — Public. Always returns success,
// regardless of whether the email exists.
authRouter.post("/forgot-password", validateBody(forgotPasswordSchema), async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body.email);
    ok(res, null);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password — Public (authenticated by the token in
// the body, not a session).
authRouter.post("/reset-password", validateBody(resetPasswordSchema), async (req, res, next) => {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    ok(res, null);
  } catch (err) {
    next(err);
  }
});
