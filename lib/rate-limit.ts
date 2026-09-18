// ── Shared in-memory rate limiter (per server instance) ─────────────────
// Used by login, registration, and password-reset. Resets on deploy; this is
// intentional (a distributed limiter would need Redis, which this deployment
// does not run). The per-instance limiter still stops credential stuffing and
// email-bombing from a single source, which is the realistic threat here.

type Bucket = { count: number; firstAt: number; lockedUntil: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Failures allowed inside the window before lockout. */
  max: number;
  /** Sliding window in ms. */
  windowMs: number;
  /** Lockout duration in ms once max is hit. */
  lockoutMs: number;
}

export function checkRateLimit(
  key: string,
  opts: RateLimitOptions
): { locked: boolean; retryAfterSec: number } {
  const entry = buckets.get(key);
  if (!entry) return { locked: false, retryAfterSec: 0 };
  const now = Date.now();
  if (entry.lockedUntil > now) {
    return { locked: true, retryAfterSec: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  if (now - entry.firstAt > opts.windowMs) {
    buckets.delete(key);
    return { locked: false, retryAfterSec: 0 };
  }
  return { locked: false, retryAfterSec: 0 };
}

export function recordFailure(key: string, opts: RateLimitOptions): void {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now - entry.firstAt > opts.windowMs) {
    buckets.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
    return;
  }
  entry.count += 1;
  if (entry.count >= opts.max) {
    entry.lockedUntil = now + opts.lockoutMs;
  }
}

export function clearFailures(key: string): void {
  buckets.delete(key);
}

/** Extract the best-effort client IP behind proxies. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
