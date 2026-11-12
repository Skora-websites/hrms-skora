import "server-only";
import { cache } from "react";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db/mongo-helper";
import { normalizeRole, hasPermission, type PermissionKey } from "@/lib/rbac";
import { ObjectId } from "@/lib/db/mysql";
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
}

interface SessionInfo {
  userId: string;
  role: string;
  tenantId: string;
}

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "default";

// ΓöÇΓöÇ Session Verification ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Verify the session cookie by looking up the token in MongoDB.
 * Returns null if not authenticated.
 */
const verifySession = cache(async (): Promise<SessionInfo | null> => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;
  if (!sessionToken) return null;

  try {
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
    return { userId: user._id.toString(), role, tenantId };
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
