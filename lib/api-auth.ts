import "server-only";
import { cache } from "react";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db/mongo-helper";
import { verifyCookieValue } from "@/lib/edge-cookies";
import { normalizeRole, hasPermission, type PermissionKey } from "@/lib/rbac";
import { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface AuthenticatedRequest {
  userId: string;
  role: string;
  isAuthenticated: true;
}

export interface ApiAuthResult {
  userId: string;
  role: string;
  tenantId: string;
  /** Raw session token — lets handlers revoke sessions (e.g. on password change). */
  token: string;
}

interface SessionInfo {
  userId: string;
  role: string;
  tenantId: string;
  token: string;
}

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "default";

// ΓöÇΓöÇ Session Verification ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Verify the session cookie by looking up the token in MongoDB.
 * Returns null if not authenticated.
 */
const verifySession = cache(async (): Promise<SessionInfo | null> => {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get("session")?.value;
  if (!rawCookie) return null;

  try {
    // The cookie is "<token>.<hmac>" — verify the signature, then look up the
    // RAW token. A direct comparison against the signed blob never matches,
    // which used to 401 every authenticated API request.
    const sessionToken = await verifyCookieValue(rawCookie);
    if (!sessionToken) return null;

    const db = await getDb();
    if (!db) return null;

    // Find session in MongoDB
    const session = await db.collection("sessions").findOne({
      token: sessionToken,
      expiresAt: { $gt: new Date() },
    });
    if (!session) return null;

    // Look up user
    const user = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    });
    if (!user) return null;

    const role = normalizeRole(user.role);
    const tenantId = user.tenantId
      ? String(user.tenantId)
      : session.tenantId
        ? String(session.tenantId)
        : DEFAULT_TENANT_ID;
    return { userId: user._id.toString(), role, tenantId, token: sessionToken };
  } catch (e) {
    logger.error("[api-auth] verifySession failed", e);
    return null;
  }
});

// ΓöÇΓöÇ Route Wrappers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Require authentication for an API route.
 * Returns 401 if not authenticated.
 */
export async function requireAuth(): Promise<ApiAuthResult | NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

/**
 * Require authentication AND a specific permission.
 */
export async function requirePermission(
  permission: PermissionKey | string
): Promise<ApiAuthResult | NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.role, permission)) {
    return NextResponse.json(
      { error: "Forbidden: insufficient permissions" },
      { status: 403 }
    );
  }

  return session;
}

/**
 * Require authentication AND admin-level role.
 */
export async function requireAdmin(): Promise<ApiAuthResult | NextResponse> {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;
  if (auth.role === "employee") {
    return NextResponse.json(
      { error: "Forbidden: insufficient permissions" },
      { status: 403 }
    );
  }
  return auth;
}

/**
 * Require authentication AND super_admin role.
 */
export async function requireSuperAdmin(): Promise<ApiAuthResult | NextResponse> {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;
  if (auth.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: only Super Admin can perform this action" },
      { status: 403 }
    );
  }
  return auth;
}

/**
 * Check if a result from requireAuth is an error response.
 */
export function isErrorResponse(
  result: ApiAuthResult | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
