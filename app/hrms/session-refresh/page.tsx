"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function SessionRefreshPage() {
  return (
    <Suspense fallback={null}>
      <RefreshAndRoute />
    </Suspense>
  );
}

function RefreshAndRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "";
  const [note, setNote] = useState("Refreshing your session…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // This endpoint reads the user fresh from MongoDB and returns the
        // canonical role — used below to route to the correct dashboard.
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data?.user) {
          const role = String(data.user.role || "employee");
          // Explicit next destination wins (used after role changes).
          if (next && next.startsWith("/hrms")) {
            window.location.assign(next);
            return;
          }
          // Role-based routing mirrors ROLE_DASHBOARDS in middleware.ts.
          const dashboards: Record<string, string> = {
            super_admin: "/hrms/superadmin",
            hr_admin: "/hrms/hr-admin",
            admin: "/hrms/hr-admin",
            manager: "/hrms/manager",
            employee: "/hrms/employee",
          };
          const target = dashboards[role] || "/hrms/employee";
          setNote("Session up to date — taking you to your dashboard…");
          window.location.assign(target);
        } else {
          setNote("Session could not be refreshed. Redirecting to sign-in…");
          window.location.assign("/hrms/login");
        }
        return;
      } catch {
        if (!cancelled) {
          setNote("Session could not be refreshed. Redirecting to sign-in…");
          window.location.assign("/hrms/login");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [next, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400">{note}</p>
      </div>
    </div>
  );
}
