import type { OnboardingDetails } from "@/types";

// ── PII masking for statutory onboarding data ────────────
// Aadhar, PAN, and bank account numbers are masked everywhere by default.
// HR-level users may reveal a single value at a time via the unmask endpoint,
// and every reveal is written to the audit log.

/** Fields considered sensitive PII in OnboardingDetails. */
export const SENSITIVE_FIELDS = [
  "aadharNo",
  "nomineeAadhar",
  "panNo",
  "bankAccountNumber",
] as const;

export type SensitiveField = (typeof SENSITIVE_FIELDS)[number];

export const isSensitiveField = (field: string): field is SensitiveField =>
  (SENSITIVE_FIELDS as readonly string[]).includes(field);

/** HMAC key for reveal tokens — derived from a deployment secret so tokens
 *  cannot be forged client-side. Fail-closed: in production a missing secret
 *  yields an unusable key (reveal returns 503 upstream), never a public
 *  constant. Dev keeps a stable local fallback so flows work offline. */
function revealSecret(): string {
  const configured =
    process.env.PII_REVEAL_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.RESEND_API_KEY ||
    "";
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    console.error(
      "[security] PII_REVEAL_SECRET (or NEXTAUTH_SECRET) is NOT set in this production environment. " +
        "PII reveal tokens are unusable (fail-closed). Set the variable and redeploy."
    );
    // Empty secret makes hmac() return a value that cannot match any token
    // minted with a real key — reveal effectively disabled, no forgery path.
    return "";
  }
  return "dev-only-insecure-reveal-secret";
}

function hmac(value: string): string {
  const secret = revealSecret();
  if (!secret) return ""; // fail-closed: no secret, no usable token
  // Imported lazily to keep this module edge-safe in type-only contexts.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto") as typeof import("crypto");
  return crypto.createHmac("sha256", secret).update(value).digest("hex").slice(0, 32);
}

/** Mask a sensitive value for display: show only the last 4 characters. */
export function maskSensitiveValue(value: string): string {
  const v = (value || "").trim();
  if (!v) return "";
  const visible = Math.min(4, Math.max(2, Math.floor(v.length / 4)));
  const tail = v.slice(-visible);
  return "•".repeat(Math.max(6, v.length - visible)) + tail;
}

/** Deterministic reveal token for (taskId, field, value). Valid only for the
 *  exact row+field it was issued for, and only while the value is unchanged. */
export function revealToken(taskId: string, field: SensitiveField, value: string): string {
  return hmac(`${taskId}|${field}|${value}`);
}

/**
 * Return a masked copy of the form for UI display. The `revealed` set opts
 * specific fields back into plaintext after a successful unmask call.
 */
export function maskOnboardingDetails(
  details: OnboardingDetails | undefined | null,
  revealed: ReadonlySet<string> = new Set(),
): Partial<OnboardingDetails> {
  if (!details) return {};
  const out: Record<string, unknown> = { ...details };
  for (const field of SENSITIVE_FIELDS) {
    const raw = (details as Record<string, unknown>)[field];
    if (typeof raw !== "string" || !raw) continue;
    const key = `${field}`;
    if (revealed.has(key)) continue; // plaintext already merged in by caller
    out[field] = maskSensitiveValue(raw);
  }
  return out as Partial<OnboardingDetails>;
}

/** Which fields in a details object are sensitive and populated (for the
 *  unmask endpoint's allow-list and the UI's reveal buttons). */
export function populatedSensitiveFields(details: OnboardingDetails | undefined | null): SensitiveField[] {
  if (!details) return [];
  return SENSITIVE_FIELDS.filter((f) => {
    const v = (details as Record<string, unknown>)[f];
    return typeof v === "string" && v.length > 0;
  });
}
