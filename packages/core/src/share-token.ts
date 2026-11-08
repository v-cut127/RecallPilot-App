import { randomBytes, timingSafeEqual } from "node:crypto";

export interface ShareTokenRecord {
  expiresAt: string | Date;
  revokedAt: string | Date | null;
}

export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isShareLinkActive(record: ShareTokenRecord, now: Date = new Date()): boolean {
  if (record.revokedAt) return false;
  const expiry = typeof record.expiresAt === "string" ? new Date(record.expiresAt) : record.expiresAt;
  return expiry.getTime() > now.getTime();
}

export function shareTokenPrefix(token: string): string {
  return token.slice(0, 8);
}

export function safeTokenEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
