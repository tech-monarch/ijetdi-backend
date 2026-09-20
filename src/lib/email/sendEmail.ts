// Swappable email abstraction. Every call site in this app imports
// `sendEmail` from here — never a provider SDK directly — so switching
// providers later (per the handoff instructions: "keep it swappable, not
// hard-wired into every call site") only means changing which provider
// implementation is wired up in `getEmailProvider()` below.

export type EmailTemplate =
  | "password-reset"
  | "contact-received"
  | "submission-received"
  | "submission-notify-editors"
  | "review-assigned"
  | "review-submitted"
  | "user-account-created";

export interface EmailProvider {
  send(params: { to: string; template: EmailTemplate; data: Record<string, unknown> }): Promise<void>;
}

let provider: EmailProvider | undefined;

export function setEmailProvider(p: EmailProvider): void {
  provider = p;
}

export async function sendEmail(params: {
  to: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
}): Promise<void> {
  if (!provider) {
    throw new Error(
      "No email provider configured — call setEmailProvider() during app startup (see src/app.ts).",
    );
  }
  await provider.send(params);
}
