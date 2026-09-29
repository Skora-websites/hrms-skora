import { NextResponse, type NextRequest } from "next/server";
import { verifyCookieValue } from "@/lib/edge-cookies";

// ── Forced-password-change fence (DB-backed, cached) ────────────────────
// The signed `must_change_password` cookie is the fast path, but it can be
// deleted client-side. When it is missing, the middleware asks the Node
// runtime (which can reach MongoDB) whether the session still requires the
// change. Results are cached per-session for 60s to avoid a DB roundtrip on
// every navigation.
const fenceCache = new Map<string, { required: boolean; at: number }>();
const FENCE_CACHE_TTL_MS = 60_000;

async function fenceRequired(request: NextRequest, sessionCookie: string | undefined): Promise<boolean> {
  if (!sessionCookie) return false;
  const cached = fenceCache.get(sessionCookie);
  const now = Date.now();
  if (cached && now - cached.at < FENCE_CACHE_TTL_MS) return cached.required;
  let required = false;
  try {
    const res = await fetch(new URL("/api/auth/fence-check", request.nextUrl.origin), {
      // attach the caller's cookies so the endpoint can verify the session
      headers: { cookie: `session=${sessionCookie}` },
    });
    if (res.ok) {
      const data = await res.json();
      required = data?.required === true;
    }
  } catch {
    // Fail-open: cookie fence remains as the first line of defence.
    required = false;
  }
  if (fenceCache.size > 5000) fenceCache.clear();
  fenceCache.set(sessionCookie, { required, at: now });
  return required;
}

// ── Role → Dashboard mapping ──────────────────────────────
const ROLE_DASHBOARDS: Record<string, string> = {
  super_admin: "/hrms/superadmin",
  hr_admin: "/hrms/hr-admin",
  admin: "/hrms/hr-admin",
  manager: "/hrms/manager",
  employee: "/hrms/employee",
};

/** Resolve the role dashboard, defaulting to the shared employee hub. */
function dashboardFor(role: string | undefined): string {
  return ROLE_DASHBOARDS[role ?? ""] || "/hrms/employee";
}

// ── Role-staleness gate ───────────────────────────────────
// The signed `user_role` cookie routes dashboards without a DB round-trip,
// but it goes stale when the CEO changes the user's role mid-session (the
// role action in PATCH /api/hrm/v2/users only updates MongoDB). A stale
// cookie sends the user to their OLD dashboard where every manager/HR API
// call 403s. When a protected route's required role disagrees with the
// cookie role, we ask the Node runtime (DB-fresh, 60s per-session cache)
// what the role actually is and bounce to the correct dashboard.
const PROTECTED_PREFIX_ROLES: [string, string[]][] = [
  ["/hrms/superadmin", ["super_admin"]],
  ["/hrms/hr-admin", ["hr_admin", "admin"]],
  ["/hrms/manager", ["manager"]],
];

async function freshRoleRequired(request: NextRequest, sessionCookie: string | undefined): Promise<string | null> {
  if (!sessionCookie) return null;
  const cached = roleCache.get(sessionCookie);
  const now = Date.now();
  if (cached && now - cached.at < ROLE_CACHE_TTL_MS) return cached.role;
  let role: string | null = null;
  try {
    const res = await fetch(new URL("/api/auth/fence-check", request.nextUrl.origin), {
      headers: { cookie: `session=${sessionCookie}` },
    });
    if (res.ok) {
      const data = await res.json();
      role = typeof data?.role === "string" && data.role ? data.role : null;
    }
  } catch {
    role = null; // fail-open: cookie value remains authoritative
  }
  if (roleCache.size > 5000) roleCache.clear();
  roleCache.set(sessionCookie, { role, at: now });
  return role;
}

async function roleStalenessRedirect(
  request: NextRequest,
  pathname: string,
  userRole: string,
  sessionCookie: string | undefined
): Promise<NextResponse | null> {
  // Which prefix (if any) is the user trying to visit, and which roles may?
  let required: string[] | null = null;
  for (const [prefix, roles] of PROTECTED_PREFIX_ROLES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      required = roles;
      break;
    }
  }
  if (!required) return null;
  if (userRole === "super_admin" || required.includes(userRole)) return null;
  // Cookie disagrees with the route's role gate — verify against the DB.
  const freshRole = await freshRoleRequired(request, sessionCookie);
  if (freshRole && (freshRole === "super_admin" || required.includes(freshRole))) {
    // The cookie is stale but the account legitimately holds this role →
    // let the navigation proceed; API-level checks use the live session.
    return null;
  }
  // Genuinely not allowed (or DB unreachable) → correct dashboard target.
  return NextResponse.redirect(new URL(dashboardFor(freshRole || userRole), request.url));
}

const roleCache = new Map<string, { role: string | null; at: number }>();
const ROLE_CACHE_TTL_MS = 60_000;

// ── Routes that require authentication ────────────────────
const protectedHrmsRoutes = [
  "/hrms/dashboard",
  "/hrms/superadmin",
  "/hrms/hr-admin",
  "/hrms/manager",
  "/hrms/employee",
  "/hrms/leads",
  "/hrms/customers",
  "/hrms/contacts",
  "/hrms/pipeline",
  "/hrms/tasks",
  "/hrms/tickets",
  "/hrms/employees",
  "/hrms/attendance",
  "/hrms/leaves",
  "/hrms/payroll",
  "/hrms/assets",
  "/hrms/holidays",
  "/hrms/documents",
  "/hrms/organization",
  "/hrms/settings",
  "/hrms/recruitment",
  "/hrms/performance",
  "/hrms/onboarding",
  "/hrms/probation",
  "/hrms/exit",
  "/hrms/engage",
  "/hrms/analytics",
  "/hrms/reports",
  "/hrms/force-change-password",
  "/hrms/access-denied",
];

// ── Role-gated route prefixes (see roleStalenessRedirect below) ──

// ── Auth routes (redirect logged-in users away) ───────────
const hrmsAuthRoutes = ["/hrms/login", "/hrms/register", "/hrms/forgot-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ════════════════════════════════════════════════════════════
  // 1. ADMIN PORTAL (unchanged)
  // ════════════════════════════════════════════════════════════
  if (pathname === "/admin" || (pathname.startsWith("/admin/") && pathname !== "/admin/login")) {
    const hasAdminSession = request.cookies.has("admin_session");
    if (!hasAdminSession) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (pathname === "/admin/login") {
    const hasAdminSession = request.cookies.has("admin_session");
    if (hasAdminSession) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // ════════════════════════════════════════════════════════════
  // 2. HRMS PORTAL
  // ════════════════════════════════════════════════════════════
  // Security: role/status cookies are HMAC-signed by lib/auth.ts. A forged
  // cookie header (e.g. user_role=super_admin without a signature) does not
  // unlock privileged dashboards — unsigned values are treated as blank.
  const rawSession = request.cookies.get("session")?.value;
  const rawRole = request.cookies.get("user_role")?.value;
  const rawStatus = request.cookies.get("user_status")?.value;

  const [sessionCookie, userRole, userStatus] = await Promise.all([
    verifyCookieValue(rawSession),
    verifyCookieValue(rawRole),
    verifyCookieValue(rawStatus),
  ]);
  const hasHrmsSession = Boolean(sessionCookie && userRole);

  // ── 2a. Unauthenticated → redirect to login ─────────────
  if (!hasHrmsSession) {
    const isProtected = protectedHrmsRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );
    if (isProtected) {
      const loginUrl = new URL("/hrms/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      const res = NextResponse.redirect(loginUrl);
      if (rawSession && !rawRole) {
        res.cookies.delete("session");
        res.cookies.delete("user_role");
      }
      return res;
    }
  }

  // ── 2b. Forced password change — redirect to /hrms/force-change-password ──
  // Cookie is the fast path; if it was deleted client-side we verify against
  // the database (cached 60s) so the fence cannot be skipped by cookie surgery.
  const mustChangePwCookie = request.cookies.get("must_change_password")?.value;
  const mustChangePw =
    mustChangePwCookie === "1" ||
    (hasHrmsSession && userRole && (await fenceRequired(request, rawSession)));
  if (hasHrmsSession && userRole && mustChangePw) {
    // Allow the force-change-password page itself through
    if (pathname !== "/hrms/force-change-password") {
      return NextResponse.redirect(new URL("/hrms/force-change-password", request.url));
    }
    // On the force-change-password page, skip other redirects and proceed
    return NextResponse.next();
  }

  // ── 2b-2. Pending verification — fence to a narrow route set ─────────────
  // Registered-but-not-yet-approved accounts may only browse their own
  // employee hub, settings, and the onboarding status pages. (The bare
  // /hrms path is intentionally NOT allowed — it redirects to the role
  // dashboard, which the fence would otherwise contradict.)
  if (hasHrmsSession && userStatus === "pending_verification") {
    const allowedPrefixes = ["/hrms/employee", "/hrms/settings", "/hrms/onboarding"];
    const isAllowed = allowedPrefixes.some(
      (r) => pathname === r || pathname.startsWith(r + "/")
    );
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/hrms/employee", request.url));
    }
  }

  // ── 2c. Session-refresh bounce page — always allowed through ──
  // (The stale-role recovery flow needs a same-origin landing page that can
  // re-issue signed cookies before the user continues to their dashboard.)
  if (pathname === "/hrms/session-refresh") {
    return NextResponse.next();
  }

  // ── 2d. Authenticated user on auth routes → dashboard ───
  if (hasHrmsSession && userRole) {
    const isAuthRoute = hrmsAuthRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );
    if (isAuthRoute) {
      return NextResponse.redirect(new URL(dashboardFor(userRole), request.url));
    }
  }

  // ── 2e. Role-staleness gate — check BEFORE redirecting anywhere ──
  // If the signed role cookie disagrees with a role-gated dashboard prefix,
  // verify against the database (fresh role) instead of serving the old
  // dashboard full of 403s after a mid-session role change.
  if (hasHrmsSession && userRole && userStatus !== "pending_verification") {
    const stale = await roleStalenessRedirect(request, pathname, userRole, rawSession);
    if (stale) return stale;
  }

  // ── 2f. /hrms root, /hrms/dashboard → role-specific dashboard or login ──
  if (pathname === "/hrms" || pathname === "/hrms/" || pathname === "/hrms/dashboard") {
    if (!hasHrmsSession) {
      const loginUrl = new URL("/hrms/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      const res = NextResponse.redirect(loginUrl);
      if (rawSession && !rawRole) {
        res.cookies.delete("session");
        res.cookies.delete("user_role");
      }
      return res;
    }
    return NextResponse.redirect(new URL(dashboardFor(userRole || undefined), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|images/|api/).*)",
  ],
};
