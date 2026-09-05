import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  // Mock version used a 6-char minimum; docs explicitly flag that as low
  // for production. Using 10 here — a real product decision, revisit as
  // needed.
  password: z.string().min(10, "Password must be at least 10 characters"),
});
