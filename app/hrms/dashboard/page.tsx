"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingFallback } from "@/components/shared/error-boundary";

/**
 * /hrms/dashboard is now a pure redirect.
 * Middleware handles routing to role-specific dashboards.
 * This page is a client-side fallback for cases where middleware
 * doesn't intercept (e.g., SPA navigation after initial load).
 */
const ROLE_DASHBOARDS: Record<string, string> = {
  super_admin: "/hrms/superadmin",
  hr_admin: "/hrms/hr-admin",
  admin: "/hrms/hr-admin",
  manager: "/hrms/manager",
  employee: "/hrms/employee",
};

export default function DashboardRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user?.role) {
      const target = ROLE_DASHBOARDS[user.role] || "/hrms/employee";
      router.replace(target);
    }
  }, [user, loading, router]);

  return <LoadingFallback label="Redirecting to your dashboard..." />;
}
