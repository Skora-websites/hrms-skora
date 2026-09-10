"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingFallback } from "@/components/shared/error-boundary";

interface RouteGuardProps {
  children: React.ReactNode;
  /** If true, redirects super_admin to dashboard (for auth pages like login) */
  redirectIfAuthenticated?: boolean;
}

/**
 * RouteGuard — client-side route protection component.
 *
 * Wraps page content and checks if the current user's role can access
 * the current route. If not, redirects to `/access-denied`.
 *
 * Usage:
 * ```tsx
 * <RouteGuard>
 *   <YourPage />
 * </RouteGuard>
 * ```
 */
export function RouteGuard({
  children,
  redirectIfAuthenticated = false,
}: RouteGuardProps) {
  const { user, loading, canAccess } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(`/hrms/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    // If route is for unauthenticated users only (login/register), redirect to dashboard
    if (redirectIfAuthenticated) {
      router.replace("/hrms/dashboard");
      return;
    }

    // Check if user can access the current route
    const isAuthorized = canAccess(pathname);
    if (!isAuthorized) {
      router.replace("/hrms/access-denied");
    }
  }, [user, loading, pathname, canAccess, router, redirectIfAuthenticated]);

  // Show loading while checking auth or redirecting
  if (loading || !user) {
    return <LoadingFallback label={loading ? "Verifying access..." : "Redirecting to login..."} />;
  }

  // Check access for non-redirect scenarios
  if (!redirectIfAuthenticated && !canAccess(pathname)) {
    return null; // Will be redirected by the useEffect
  }

  return <>{children}</>;
}
