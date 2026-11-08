import { randomBytes, timingSafeEqual } from "node:crypto";
export function generateShareToken() {
    return randomBytes(32).toString("base64url");
}
export function isShareLinkActive(record, now = new Date()) {
    if (record.revokedAt)
        return false;
    const expiry = typeof record.expiresAt === "string" ? new Date(record.expiresAt) : record.expiresAt;
    return expiry.getTime() > now.getTime();
}
export function shareTokenPrefix(token) {
    return token.slice(0, 8);
}
export function safeTokenEquals(a, b) {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    if (bufferA.length !== bufferB.length)
        return false;
    return timingSafeEqual(bufferA, bufferB);
}
//# sourceMappingURL=share-token.js.map