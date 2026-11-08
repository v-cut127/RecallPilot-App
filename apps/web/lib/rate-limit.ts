const buckets = new Map<string, number[]>();

export function checkRateLimit(key: string, limit = 10, windowMs = 10 * 60 * 1000): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = (buckets.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);
  if (existing.length >= limit) {
    const oldest = existing[0] ?? now;
    return { allowed: false, retryAfterSeconds: Math.ceil((windowMs - (now - oldest)) / 1000) };
  }
  existing.push(now);
  buckets.set(key, existing);
  if (buckets.size > 5_000) {
    for (const [bucketKey, timestamps] of buckets) {
      if (timestamps.every((timestamp) => now - timestamp >= windowMs)) buckets.delete(bucketKey);
    }
  }
  return { allowed: true, retryAfterSeconds: 0 };
}
