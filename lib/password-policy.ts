import "server-only";
import { getDb } from "@/lib/db/mongo-helper";

/**
 * CEO-controlled password policy, read live from the system settings document
 * (key `super_admin`, maintained by the Super Admin → Settings page).
 *
 * Everything falls back to the historical floor (8 chars) when the setting is
 * absent or the DB is unreachable, so login/reset flows never break because of
 * a missing config row. The floor is also a hard minimum: the CEO cannot
 * configure a weaker policy than 8 characters.
 *
 * Result is cached for 60s per process — password changes are rare and this
 * keeps every login/register/reset request from hitting the DB for config.
 */
const SETTINGS_KEY = "super_admin";
const HARD_FLOOR = 8;
const CACHE_TTL_MS = 60_000;

let cache: { value: number; at: number } | null = null;

export async function getMinPasswordLength(): Promise<number> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.value;
  let value = HARD_FLOOR;
  try {
    const db = await getDb();
    if (db) {
      // Current key wins; the stale legacy doc is only a fallback.
      let doc = await db.collection("settings").findOne({ key: SETTINGS_KEY });
      if (!doc?.settings) {
        const legacy = await db.collection("settings").findOne({ key: SETTINGS_KEY + "_system" });
        if (legacy?.settings) doc = legacy;
      }
      const configured = Number(doc?.settings?.passwordMinLength);
      if (Number.isFinite(configured) && configured > 0) {
        value = Math.max(HARD_FLOOR, Math.min(128, Math.floor(configured)));
      }
    }
  } catch {
    // DB unreachable → keep the floor; never block auth flows on config reads.
  }
  cache = { value, at: now };
  return value;
}

/** Validate a candidate password against the configured policy. Returns an error message or null. */
export async function validatePasswordPolicy(password: string): Promise<string | null> {
  const min = await getMinPasswordLength();
  if (!password || password.length < min) {
    return `Password must be at least ${min} characters`;
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must contain at least one letter and one number";
  }
  return null;
}
