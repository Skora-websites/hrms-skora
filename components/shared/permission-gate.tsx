"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { hasPermission, canAccessRoute, type PermissionKey } from "@/lib/rbac";

interface PermissionGateProps {
  /** The permission key required to see the children. */
  permission?: PermissionKey | string;
  /** The route path required to access the children. */
  route?: string;
  /** React children to render if authorized. */
  children: React.ReactNode;
  /** Optional fallback to render when unauthorized. */
  fallback?: React.ReactNode;
}

/**
 * A client-side component that conditionally renders its children
 * based on the current user's role permissions.
 *
 * Usage:
 * ```tsx
 * <PermissionGate permission="employees.create">
 *   <Button>Add Employee</Button>
 * </PermissionGate>
 *
 * <PermissionGate route="/settings">
 *   <SettingsPanel />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  permission,
  route,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { user } = useAuth();
  const role = user?.role;

  if (!role) return fallback;

  let authorized = false;

  if (permission) {
    authorized = hasPermission(role, permission);
  } else if (route) {
    authorized = canAccessRoute(role, route);
  } else {
    // No access check specified — allow by default
    authorized = true;
  }

  return authorized ? <>{children}</> : <>{fallback}</>;
}

/**
 * Higher-order component — wraps a component with a permission check.
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: PermissionKey | string
) {
  return function WrappedWithPermission(props: P) {
    return (
      <PermissionGate permission={permission}>
        <Component {...props} />
      </PermissionGate>
    );
  };
}
