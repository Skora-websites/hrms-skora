"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { usePathname } from "next/navigation";
import {
  hasPermission as rbacHasPermission,
  hasRoleLevel,
  canAccessRoute as rbacCanAccessRoute,
  getRoleLabel,
  normalizeRole,
  type PermissionKey,
  type Role,
} from "@/lib/rbac";

// ── Types ───────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: string;
  department?: string | null;
  status?: string | null;
  employeeCode?: string | null;
  onboardingStatus?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  /** Check if the current user has a specific permission. */
  can: (permission: PermissionKey | string) => boolean;
  /** Check if the current user has at least the specified role level. */
  hasRole: (minimumRole: Role) => boolean;
  /** Check if the current user can access a specific route. */
  canAccess: (path: string) => boolean;
  /** Get the display label for the current user's role. */
  roleLabel: string;
}

// ── Context ──────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const initialRender = useRef(true);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial mount: fetch session with loading spinner
  useEffect(() => {
    refresh();
  }, []);

  // Silent re-fetch on route changes — no loading flash.
  // Skips the initial mount (handled by the effect above).
  // This handles the login -> dashboard transition where the AuthProvider
  // is already mounted with stale state (user: null after login page fetch)
  // but a fresh session cookie has been set by the login API.
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    refresh(true);
  }, [pathname, refresh]);

  // Refresh on window focus to keep session in sync
  useEffect(() => {
    const handleFocus = () => {
      refresh();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refresh]);

  // Compute RBAC helpers based only on user role
  const role = useMemo(() => normalizeRole(user?.role), [user?.role]);

  const value = useMemo<AuthContextType>(() => {
    return {
      user,
      loading,
      refresh,
      setUser,
      can: (permission: PermissionKey | string) => rbacHasPermission(role, permission),
      hasRole: (minimumRole: Role) => hasRoleLevel(role, minimumRole),
      canAccess: (path: string) => rbacCanAccessRoute(role, path),
      roleLabel: getRoleLabel(role),
    };
  }, [user, loading, refresh, role]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
