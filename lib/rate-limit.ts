// ── Rate limiter: Upstash Redis (distributed) with in-memory fallback ────
// When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, counters
// and lockouts live in Redis so ALL serverless instances share one limit —
// a distributed attacker cannot reset their budget by hitting different
// instances, and limits survive deploys. Without those vars (local dev, or
// no Upstash account), the same logic runs against a per-instance Map.
//
// Redis errors fail OPEN (availability over strictness for this control) by
// degrading to the in-memory limiter for that call, so a Redis outage can
// never take login down with it.

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

function upstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function upstashPipeline(commands: (string | number)[][]): Promise<any[] | null> {
  const cfg = upstashConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands.map((c) => c.map(String))),
      // Keep the auth path fast; a slow Redis must not stall logins.
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return Array.isArray(json) ? json : null;
  } catch {
    return null;
  }
}

/** Redis keys: counter for the sliding window, lock for active lockout. */
function redisKeys(key: string) {
  const safe = key.replace(/[^a-zA-Z0-9:_@.|/-]/g, "_");
  return { counter: `rl:c:${safe}`, lock: `rl:l:${safe}` };
}

// ── In-memory core (fallback + shared logic shape) ──────────────────────

function memoryCheck(key: string, opts: RateLimitOptions): { locked: boolean; retryAfterSec: number } {
  const entry = buckets.get(key);
  if (!entry) return { locked: false, retryAfterSec: 0 };
  const now = Date.now();
  if (entry.lockedUntil > now) {
    return { locked: true, retryAfterSec: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  if (now - entry.firstAt > opts.windowMs) {
    buckets.delete(key);
  }
  return { locked: false, retryAfterSec: 0 };
}

function memoryRecord(key: string, opts: RateLimitOptions): void {
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

// ── Public API (async so the Redis path can be awaited transparently) ───

export async function checkRateLimit(
  key: string,
  opts: RateLimitOptions
): Promise<{ locked: boolean; retryAfterSec: number }> {
  const cfg = upstashConfig();
  if (!cfg) return memoryCheck(key, opts);

  const { counter, lock } = redisKeys(key);
  const results = await upstashPipeline([["GET", lock], ["INCR", counter], ["PEXPIRE", counter, Math.ceil(opts.windowMs), "NX"]]);
  // Redis unavailable → degrade to in-memory for this call (fail-open).
  if (!results) return memoryCheck(key, opts);

  if (Number(results[0]?.result) > 0) {
    const ttl = await upstashPipeline([["PTTL", lock]]);
    const ms = ttl ? Number(ttl[0]?.result) : 0;
    return { locked: true, retryAfterSec: ms > 0 ? Math.ceil(ms / 1000) : Math.ceil(opts.lockoutMs / 1000) };
  }
  return { locked: false, retryAfterSec: 0 };
}

export async function recordFailure(key: string, opts: RateLimitOptions): Promise<void> {
  const cfg = upstashConfig();
  if (!cfg) return memoryRecord(key, opts);

  const { counter, lock } = redisKeys(key);
  const results = await upstashPipeline([["INCR", counter], ["PEXPIRE", counter, Math.ceil(opts.windowMs), "NX"]]);
  if (!results) return memoryRecord(key, opts);

  if (Number(results[0]?.result) >= opts.max) {
    // First writer wins the lock window; extend on repeat hits past max.
    await upstashPipeline([["SET", lock, "1", "PX", Math.ceil(opts.lockoutMs), "NX"]]);
  }
}

export async function clearFailures(key: string): Promise<void> {
  if (!upstashConfig()) {
    buckets.delete(key);
    return;
  }
  const { counter, lock } = redisKeys(key);
  await upstashPipeline([["DEL", counter], ["DEL", lock]]);
  // Also clear the local bucket so a same-instance retry is clean after a Redis error.
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
