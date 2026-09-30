import "server-only";
import { getDb } from "@/lib/db/mongo-helper";

/**
 * CEO-controlled session lifetime, from the Super Admin → Settings
 * "Session Timeout" field (minutes → session/cookie max-age).
 *
 * Read DB-backed with a 60s per-process cache (same pattern as the password
 * policy) so EVERY serverless instance honors the configured value, not just
 * the one that happened to serve the settings save. Falls back to the
 * historical 5-day default when unset or the DB is unreachable.
 */
const DEFAULT_SESSION_TIMEOUT_MIN = 60 * 24 * 5; // 5 days
const HARD_MAX_MIN = 60 * 24 * 30; // one month cap
const HARD_MIN_MIN = 5;
const SETTINGS_KEY = "super_admin";
const LEGACY_KEY = "super_admin_system";
const CACHE_TTL_MS = 60_000;

let cache: { value: number | null; at: number } | null = null;

function clamp(minutes: number): number {
  return Math.min(HARD_MAX_MIN, Math.max(HARD_MIN_MIN, Math.floor(minutes)));
}

async function readConfiguredTimeout(): Promise<number | null> {
  try {
    const db = await getDb();
    if (db) {
      // Current key wins; the stale legacy doc is only a fallback.
      let doc = await db.collection("settings").findOne({ key: SETTINGS_KEY });
      if (!doc?.settings) {
        const legacy = await db.collection("settings").findOne({ key: LEGACY_KEY });
        if (legacy?.settings) doc = legacy;
      }
      const n = Number(doc?.settings?.sessionTimeout);
      if (Number.isFinite(n) && n > 0) return clamp(n);
    }
  } catch {
    // DB unreachable → default
  }
  return null;
}

/** Session lifetime in ms (settings-driven, 60s cached, default 5 days). */
export async function getSessionTimeoutMs(): Promise<number> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return (cache.value ?? DEFAULT_SESSION_TIMEOUT_MIN) * 60 * 1000;
  }
  const configured = await readConfiguredTimeout();
  cache = { value: configured, at: now };
  return (configured ?? DEFAULT_SESSION_TIMEOUT_MIN) * 60 * 1000;
}

/** Immediate refresh hook — called by the settings API after a save. */
export function setSessionTimeoutCache(minutes: number | null | undefined): void {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) {
    cache = { value: null, at: Date.now() };
    return;
  }
  cache = { value: clamp(n), at: Date.now() };
}
