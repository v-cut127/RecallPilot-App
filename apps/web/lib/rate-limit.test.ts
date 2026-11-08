import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("rate limiting", () => {
  it("allows requests under the limit and blocks the next one", () => {
    const key = `test-${Math.random()}`;
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);
    const blocked = checkRateLimit(key, 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keeps independent buckets", () => {
    const first = `test-${Math.random()}`;
    const second = `test-${Math.random()}`;
    expect(checkRateLimit(first, 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit(first, 1, 60_000).allowed).toBe(false);
    expect(checkRateLimit(second, 1, 60_000).allowed).toBe(true);
  });
});
