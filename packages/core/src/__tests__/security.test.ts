import { describe, expect, it } from "vitest";
import { generateShareToken, isShareLinkActive, shareTokenPrefix } from "../share-token";
import { hashPassword, verifyPassword } from "../password";

describe("share tokens", () => {
  it("generates unguessable, URL-safe tokens of consistent length", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateShareToken()));
    expect(tokens.size).toBe(100);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(token.length).toBeGreaterThanOrEqual(40);
    }
    expect(shareTokenPrefix(generateShareToken())).toHaveLength(8);
  });

  it("expires and revokes links", () => {
    const now = new Date("2026-11-08T10:00:00Z");
    expect(isShareLinkActive({ expiresAt: new Date("2026-12-08T10:00:00Z"), revokedAt: null }, now)).toBe(true);
    expect(isShareLinkActive({ expiresAt: new Date("2026-11-07T10:00:00Z"), revokedAt: null }, now)).toBe(false);
    expect(
      isShareLinkActive({ expiresAt: new Date("2026-12-08T10:00:00Z"), revokedAt: new Date("2026-11-08T09:00:00Z") }, now)
    ).toBe(false);
  });
});

describe("password hashing", () => {
  it("hashes and verifies passwords without storing plaintext", () => {
    const hash = hashPassword("DemoPass123!");
    expect(hash).not.toContain("DemoPass123!");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("DemoPass123!", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
    expect(verifyPassword("", null)).toBe(false);
  });

  it("rejects short passwords", () => {
    expect(() => hashPassword("short")).toThrow(/at least 8/);
  });
});
