import type { EmailAdapter } from "./types";
import { ConsoleEmailAdapter } from "./console";
import { ResendEmailAdapter } from "./resend";

let adapter: EmailAdapter | null = null;

export function getEmailAdapter(): EmailAdapter {
  if (adapter) return adapter;
  const provider = process.env.EMAIL_PROVIDER ?? "console";
  adapter = provider === "resend" ? new ResendEmailAdapter() : new ConsoleEmailAdapter();
  return adapter;
}

export function resetEmailAdapterForTests(): void {
  adapter = null;
}

export type { EmailAdapter, EmailAttachment, EmailMessage, EmailSendResult } from "./types";
