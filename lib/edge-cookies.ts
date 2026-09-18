// Edge-safe signed cookie helpers (HMAC-SHA256 via Web Crypto).
//
// IMPORTANT: this module must stay dependency-free (no node:crypto, no
// mongodb, no "server-only") because it is imported by the Edge middleware.
// lib/auth.ts re-exports these for API routes so the secret and algorithm
// stay in one place.

const COOKIE_SIGNING_SECRET =
  process.env.SESSION_COOKIE_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "skora-dev-secret-change-me-in-production";

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
