import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission, type PermissionKey } from "@/lib/rbac";

// ── Types ───────────────────────────────────────────────

type ApiHandler<T> = (context: { userId: string; role: string }) => Promise<T>;

interface ApiRouteOptions {
  /** Require authentication. Default true. */
  requireAuth?: boolean;
  /** Required permission to access this route. */
  permission?: PermissionKey | string;
}

// ── Route Wrapper ───────────────────────────────────────

/**
 * Wraps an API route handler with authentication, RBAC, and error handling.
 *
 * Usage:
 * ```ts
 * export const GET = apiRoute(async () => {
 *   const leads = await leadsService.findMany();
 *   return leads;
 * });
 *
 * // With permission check:
 * export const POST = apiRoute(
 *   async () => { ... },
 *   { permission: "employees.create" }
 * );
 * ```
 */
export function apiRoute<T>(
  handler: ApiHandler<T>,
  options: ApiRouteOptions = {}
) {
  const { requireAuth = true, permission } = options;

  return async function () {
    try {
      let userId = "";
      let role = "";

      if (requireAuth) {
        const session = await auth();
        if (!session.user) {
          return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }
        userId = session.user.id;
        role = session.user.role;

        // Permission check (RBAC)
        if (permission) {
          const hasAccess = hasPermission(role, permission);
          if (!hasAccess) {
            return NextResponse.json(
              { error: "Forbidden: insufficient permissions" },
              { status: 403 }
            );
          }
        }
      }

      const data = await handler({ userId, role });
      return NextResponse.json(data);
    } catch (error) {
      console.error("API Error:", error);
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }
  };
}

// ── Data Serialization Helpers ──────────────────────────

/**
 * Convert a Firestore Date to ISO string, with a fallback.
 */
export function toISO(
  date: Date | undefined | null,
  fallback?: string
): string {
  return date?.toISOString() ?? fallback ?? new Date().toISOString();
}

/**
 * Create a standard success response.
 */
export function successResponse(data: unknown) {
  return NextResponse.json(data);
}
