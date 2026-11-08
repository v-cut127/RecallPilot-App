import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { resolveFromRepoRoot } from "../env";
import type { EmailAdapter, EmailMessage, EmailSendResult } from "./types";

export class ConsoleEmailAdapter implements EmailAdapter {
  private readonly outbox: string;

  constructor(outbox = process.env.EMAIL_OUTBOX_DIR ?? ".outbox") {
    this.outbox = resolveFromRepoRoot(outbox);
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const id = randomUUID();
    await fs.mkdir(this.outbox, { recursive: true });
    const base = path.join(this.outbox, `${new Date().toISOString().replace(/[:.]/g, "-")}-${id}`);
    await fs.writeFile(`${base}.html`, message.html, "utf8");
    const attachments = [];
    for (const attachment of message.attachments ?? []) {
      const attachmentPath = `${base}-${attachment.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      await fs.writeFile(attachmentPath, attachment.content);
      attachments.push({ filename: attachment.filename, path: attachmentPath, size: attachment.content.byteLength });
    }
    await fs.writeFile(
      `${base}.json`,
      JSON.stringify(
        {
          id,
          to: message.to,
          subject: message.subject,
          text: message.text,
          htmlPath: `${base}.html`,
          attachments,
          sentAt: new Date().toISOString(),
        },
        null,
        2
      ),
      "utf8"
    );
    const redactedTo = message.to.replace(/^(.).*(@.*)$/, "$1***$2");
    console.log(`[email:console] to=${redactedTo} subject="${message.subject}" outbox=${base}.html`);
    return { id, provider: "console" };
  }
}
