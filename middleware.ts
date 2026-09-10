import { NextResponse, type NextRequest } from "next/server";

// ── Role → Dashboard mapping ──────────────────────────────
const ROLE_DASHBOARDS: Record<string, string> = {
  super_admin: "/hrms/superadmin",
  hr_admin: "/hrms/hr-admin",
  admin: "/hrms/hr-admin",
  manager: "/hrms/manager",
  employee: "/hrms/employee",
};

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
  "/hrms/projects",
  "/hrms/recruitment",
  "/hrms/performance",
  "/hrms/onboarding",
  "/hrms/probation",
  "/hrms/exit",
  "/hrms/engage",
  "/hrms/analytics",
  "/hrms/reports",
];

// ── Role-gated route prefixes ─────────────────────────────
// Only the specified roles (and super_admin who can access everything) may visit these.
const ROLE_GATED_ROUTES: Record<string, string[]> = {
  "/hrms/superadmin": ["super_admin"],
  "/hrms/hr-admin": ["hr_admin", "admin"],
  "/hrms/manager": ["manager"],
  "/hrms/employee": ["employee"],
};

// ── Auth routes (redirect logged-in users away) ───────────
const hrmsAuthRoutes = ["/hrms/login", "/hrms/register", "/hrms/forgot-password"];

export function middleware(request: NextRequest) {
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
  const sessionCookie = request.cookies.get("session")?.value;
  const userRole = request.cookies.get("user_role")?.value || "";
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
      if (sessionCookie && !userRole) {
        res.cookies.delete("session");
        res.cookies.delete("user_role");
      }
      return res;
    }
  }

  // ── 2b. Forced password change — redirect to /hrms/force-change-password ──
  const mustChangePw = request.cookies.get("must_change_password")?.value;
  if (hasHrmsSession && userRole && mustChangePw === "1") {
    // Allow the force-change-password page itself through
    if (pathname !== "/hrms/force-change-password") {
      return NextResponse.redirect(new URL("/hrms/force-change-password", request.url));
    }
    // On the force-change-password page, skip other redirects and proceed
    return NextResponse.next();
  }

  // ── 2c. Authenticated user on auth routes → dashboard ───
  if (hasHrmsSession && userRole) {
    const isAuthRoute = hrmsAuthRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );
    if (isAuthRoute) {
      const dashboard = ROLE_DASHBOARDS[userRole] || "/hrms/employee";
      return NextResponse.redirect(new URL(dashboard, request.url));
    }
  }

  // ── 2c. /hrms root → role-specific dashboard or login ────
  if (pathname === "/hrms" || pathname === "/hrms/") {
    if (!hasHrmsSession) {
      const res = NextResponse.redirect(new URL("/hrms/login", request.url));
      if (sessionCookie && !userRole) {
        res.cookies.delete("session");
        res.cookies.delete("user_role");
      }
      return res;
    }
    const dashboard = ROLE_DASHBOARDS[userRole] || "/hrms/employee";
    return NextResponse.redirect(new URL(dashboard, request.url));
  }

  // ── 2d. /hrms/dashboard → role-specific dashboard or login ──
  if (pathname === "/hrms/dashboard") {
    if (!hasHrmsSession) {
      const loginUrl = new URL("/hrms/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      const res = NextResponse.redirect(loginUrl);
      if (sessionCookie && !userRole) {
        res.cookies.delete("session");
        res.cookies.delete("user_role");
      }
      return res;
    }
    const dashboard = ROLE_DASHBOARDS[userRole] || "/hrms/employee";
    return NextResponse.redirect(new URL(dashboard, request.url));
  }

  // ── 2e. Role-gated sub-routes ───────────────────────────
  if (hasHrmsSession && userRole) {
    for (const [prefix, allowedRoles] of Object.entries(ROLE_GATED_ROUTES)) {
      if (pathname === prefix || pathname.startsWith(prefix + "/")) {
        // super_admin can access everything
        if (userRole !== "super_admin" && !allowedRoles.includes(userRole)) {
          return NextResponse.redirect(new URL("/hrms/access-denied", request.url));
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|images/|api/).*)",
  ],
};
