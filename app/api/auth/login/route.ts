import { NextRequest, NextResponse } from "next/server";
import { createSession, signInWithMongo, signCookieValue, SESSION_COOKIE_OPTIONS, SESSION_EXPIRES_IN_MS } from "@/lib/auth";
import { withErrorHandler, badRequest, ApiError } from "@/lib/api-handler";
import { HRMS_ACCOUNT_ROLES } from "@/lib/constants";
import { checkRateLimit, recordFailure, clearFailures, clientIp, type RateLimitOptions } from "@/lib/rate-limit";

// ── Brute-force protection (in-memory; resets on deploy) ─────────────
// 5 failed attempts per email+IP within 15 minutes → 15-minute lockout.
const LOGIN_LIMITS: RateLimitOptions = {
  max: 5,
  windowMs: 15 * 60 * 1000,
  lockoutMs: 15 * 60 * 1000,
};

function attemptKey(email: string, ip: string): string {
  return `login:${email.toLowerCase().trim()}|${ip}`;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return badRequest("Email and password are required");
  }

  // Brute-force guard (best-effort IP extraction behind proxies).
  const ip = clientIp(request.headers);
  const rateKey = attemptKey(String(email), ip);
  const limit = checkRateLimit(rateKey, LOGIN_LIMITS);
  if (limit.locked) {
    return NextResponse.json(
      {
        error: `Too many failed login attempts. Please try again in ${Math.ceil(limit.retryAfterSec / 60)} minute(s).`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  // Authenticate against MongoDB — catch auth errors and return 401
  let user;
  try {
    user = await signInWithMongo(email, password);
  } catch (authError: any) {
    if (authError instanceof ApiError) throw authError; // 503 via withErrorHandler
    const msg = authError?.message || "Invalid credentials";
    recordFailure(rateKey, LOGIN_LIMITS);
    return NextResponse.json(
      { error: msg },
      { status: 401 }
    );
  }

  clearFailures(rateKey);

  // Create session in MongoDB
  const sessionToken = await createSession(user.id);

  // ── Role-by-email: the authoritative HRMS_ACCOUNT_ROLES map decides the role. ──
  // Self-heal the stored record so API-level permission checks agree with the
  // cookie-driven dashboard routing, then set the cookie from the mapped role.
  const normalizedEmail = email.toLowerCase().trim();
  const mappedAccount = HRMS_ACCOUNT_ROLES[normalizedEmail];
  let effectiveRole = user.role;
  if (mappedAccount && mappedAccount.role !== user.role) {
    effectiveRole = mappedAccount.role;
    try {
      const { getDb } = await import("@/lib/db/mongo-helper");
      const db = await getDb();
      if (db) {
        await db
          .collection("users")
          .updateOne(
            { email: normalizedEmail },
            { $set: { role: effectiveRole, updatedAt: new Date() } }
          );
      }
    } catch {
      // Self-heal is best-effort; the cookie below still routes by the mapped role.
    }
  }

  const response = NextResponse.json({ success: true });
  // Cookies are HMAC-signed (see lib/auth.ts) so middleware can trust the
  // role/status values without a DB round-trip per request.
  response.cookies.set("session", await signCookieValue(sessionToken), {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: SESSION_EXPIRES_IN_MS / 1000,
  });

  response.cookies.set("user_role", await signCookieValue(effectiveRole), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRES_IN_MS / 1000,
  });

  // Mirror the account status into a short-lived cookie so the middleware can
  // fence still-pending registrations without a DB round-trip per request.
  const accountStatus = (user as any).status || "active";
  response.cookies.set("user_status", await signCookieValue(accountStatus), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
  });

  // Check if user must change password on first login
  const mustChange = (user as any).mustChangePassword === true;
  if (mustChange) {
    response.cookies.set("must_change_password", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRES_IN_MS / 1000,
    });
  }

  return response;
}, { label: "Login" });
