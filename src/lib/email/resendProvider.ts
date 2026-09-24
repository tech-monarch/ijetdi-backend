import { Resend } from "resend";
import { env } from "../../config/env.js";
import type { EmailProvider, EmailTemplate } from "./sendEmail.js";

// `new Resend("")` throws at construction ("Missing API key"), which crashed the
// whole process at import time whenever RESEND_API_KEY was unset — making the
// dev-mode "log instead of sending" fallback in send() below unreachable. The
// placeholder is never used to send: send() returns early when the real key is empty.
const resend = new Resend(env.RESEND_API_KEY || "re_placeholder_unset");

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
    case "submission-received": {
      const name = String(data.name ?? "");
      const title = String(data.title ?? "");
      return {
        subject: "We received your manuscript submission",
        html: `
          <p>Hi ${name},</p>
          <p>Thanks for submitting <strong>${title}</strong>. We've received your manuscript and
          it's now awaiting initial editorial screening. We'll be in touch as it moves through
          review.</p>
        `,
      };
    }
    case "submission-notify-editors": {
      const title = String(data.title ?? "");
      const correspondingAuthor = String(data.correspondingAuthor ?? "");
      const reviewUrl = String(data.reviewUrl ?? "");
      return {
        subject: `New submission: ${title}`,
        html: `
          <p>A new manuscript has been submitted.</p>
          <p><strong>${title}</strong><br>Corresponding author: ${correspondingAuthor}</p>
          <p><a href="${reviewUrl}">Open it in the admin</a> to begin screening.</p>
        `,
      };
    }
    case "review-assigned": {
      const reviewerName = String(data.reviewerName ?? "");
      const title = String(data.title ?? "");
      const dueDate = data.dueDate ? String(data.dueDate) : null;
      return {
        subject: `You've been invited to review: ${title}`,
        html: `
          <p>Hi ${reviewerName},</p>
          <p>You've been invited to review <strong>${title}</strong>.
          ${dueDate ? `We'd appreciate your review by <strong>${dueDate}</strong>.` : ""}</p>
          <p>Log in and open "My Reviews" to view the manuscript and submit your recommendation.</p>
        `,
      };
    }
    case "review-submitted": {
      const reviewerName = String(data.reviewerName ?? "");
      const title = String(data.title ?? "");
      const recommendation = String(data.recommendation ?? "");
      const reviewUrl = String(data.reviewUrl ?? "");
      return {
        subject: `Review submitted: ${title}`,
        html: `
          <p>${reviewerName} has submitted a review for <strong>${title}</strong>
          (recommendation: ${recommendation}).</p>
          <p><a href="${reviewUrl}">Open the manuscript's reviews</a> in the admin.</p>
        `,
      };
    }
    case "user-account-created": {
      const name = String(data.name ?? "");
      const setPasswordUrl = String(data.setPasswordUrl ?? "");
      const hasTemporaryPassword = Boolean(data.hasTemporaryPassword);
      return {
        subject: "Your account has been created",
        html: hasTemporaryPassword
          ? `
          <p>Hi ${name},</p>
          <p>An account has been created for you. An administrator has your temporary
          password — ask them for it, or <a href="${setPasswordUrl}">set your own
          password</a> instead. That link expires in 1 hour.</p>
        `
          : `
          <p>Hi ${name},</p>
          <p>An account has been created for you. <a href="${setPasswordUrl}">Set your
          password</a> to log in. This link expires in 1 hour.</p>
        `,
      };
    }
    case "admin-password-changed": {
      const name = String(data.name ?? "");
      const setPasswordUrl = String(data.setPasswordUrl ?? "");
      return {
        subject: "Your account password was changed",
        html: `
          <p>Hi ${name},</p>
          <p>An administrator changed the password on your account. If you expected
          this, you're all set. If you didn't, or you'd rather choose your own
          password, <a href="${setPasswordUrl}">set a new one here</a> — this link
          expires in 1 hour.</p>
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
