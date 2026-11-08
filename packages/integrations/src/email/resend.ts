import type { EmailAdapter, EmailMessage, EmailSendResult } from "./types";

export class ResendEmailAdapter implements EmailAdapter {
  private readonly apiKey: string;
  private readonly from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("EMAIL_PROVIDER=resend requires RESEND_API_KEY.");
    this.apiKey = apiKey;
    this.from = process.env.EMAIL_FROM ?? "RecallPilot <audit@recallpilot.com>";
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content.toString("base64"),
        })),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Resend rejected the email (${response.status}): ${detail}`);
    }
    const data = (await response.json()) as { id?: string };
    return { id: data.id ?? "resend-unknown", provider: "resend" };
  }
}
