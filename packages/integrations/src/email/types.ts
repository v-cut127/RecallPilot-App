export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}

export interface EmailSendResult {
  id: string;
  provider: "console" | "resend";
}

export interface EmailAdapter {
  send(message: EmailMessage): Promise<EmailSendResult>;
}
