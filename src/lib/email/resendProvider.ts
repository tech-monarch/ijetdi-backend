import { Resend } from "resend";
import { env } from "../../config/env.js";
import type { EmailProvider, EmailTemplate } from "./sendEmail.js";

const resend = new Resend(env.RESEND_API_KEY);

function renderTemplate(template: EmailTemplate, data: Record<string, unknown>): { subject: string; html: string } {
  switch (template) {
    case "password-reset": {
      const resetUrl = String(data.resetUrl ?? "");
      return {
        subject: "Reset your password",
        html: `
          <p>We received a request to reset your password.</p>
          <p><a href="${resetUrl}">Click here to reset your password</a>. This link expires in 1 hour.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      };
    }
    case "contact-received": {
      const name = String(data.name ?? "");
      return {
        subject: "We received your message",
        html: `
          <p>Hi ${name},</p>
          <p>Thanks for reaching out — we've received your message and will respond soon.</p>
        `,
      };
    }
    default: {
      const _exhaustive: never = template;
      throw new Error(`Unknown email template: ${_exhaustive}`);
    }
  }
}

export const resendEmailProvider: EmailProvider = {
  async send({ to, template, data }) {
    const { subject, html } = renderTemplate(template, data);
    if (!env.RESEND_API_KEY) {
      // No API key configured (e.g. local dev without Resend set up) —
      // log instead of throwing, so auth flows are still testable without
      // real email delivery. Never do this in production.
      // eslint-disable-next-line no-console
      console.warn(`[email:dev-mode] Would send "${subject}" to ${to}`);
      return;
    }
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });
  },
};
