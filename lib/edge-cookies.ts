// Edge-safe signed cookie helpers (HMAC-SHA256 via Web Crypto).
//
// IMPORTANT: this module must stay dependency-free (no node:crypto, no
// mongodb, no "server-only") because it is imported by the Edge middleware.
// lib/auth.ts re-exports these for API routes so the secret and algorithm
// stay in one place.
//
// Secret resolution is fail-closed for the forgeable-values chain: a public
// fallback constant would let anyone mint admin cookies, so only secret-grade
// environment values qualify. In non-production (NODE_ENV !== "production")
// a stable dev-only constant keeps local flows working. In production without
// a secret, signing/verification degrades to "always invalid" — logins and
// role-gated navigation fail closed instead of open (surfaced via console.error
// so the missing deployment config is immediately visible).
const DEV_FALLBACK_SECRET = "skora-dev-only-cookie-secret";
const isProd = process.env.NODE_ENV === "production";
const COOKIE_SIGNING_SECRET = isProd
  ? process.env.SESSION_COOKIE_SECRET || process.env.NEXTAUTH_SECRET || ""
  : process.env.SESSION_COOKIE_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    DEV_FALLBACK_SECRET;

if (isProd && !COOKIE_SIGNING_SECRET) {
  // Loud, once-per-instance signal: cookies cannot be verified without it.
  console.error(
    "[security] SESSION_COOKIE_SECRET (or NEXTAUTH_SECRET) is NOT set in this production environment. " +
      "Session cookies will be REJECTED (fail-closed). Set the variable and redeploy."
  );
}

const cookieEncoder = new TextEncoder();

let hmacKeyPromise: Promise<CryptoKey> | null = null;
function getCookieHmacKey(): Promise<CryptoKey> {
  if (!hmacKeyPromise) {
    hmacKeyPromise = crypto.subtle.importKey(
      "raw",
      cookieEncoder.encode(COOKIE_SIGNING_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }
  return hmacKeyPromise;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Sign a cookie value: returns "<value>.<base64 hmac>". */
export async function signCookieValue(value: string): Promise<string> {
  const key = await getCookieHmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, cookieEncoder.encode(value));
  return `${value}.${bytesToBase64(new Uint8Array(sig))}`;
}

/** Verify a signed cookie value. Returns the payload or null when invalid. */
export async function verifyCookieValue(
  signed: string | undefined | null
): Promise<string | null> {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx <= 0) return null;
  const value = signed.slice(0, idx);
  const sigPart = signed.slice(idx + 1);
  if (!value || !sigPart) return null;
  try {
    const key = await getCookieHmacKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64ToBytes(sigPart),
      cookieEncoder.encode(value)
    );
    return valid ? value : null;
  } catch {
    return null;
  }
}
