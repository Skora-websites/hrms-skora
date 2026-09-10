import { NextResponse } from "next/server";
import { requireSuperAdmin, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest, notFound, forbidden } from "@/lib/api-handler";
import {
  ROLES,
  ROLE_LABELS,
  ROLE_HIERARCHY,
  ROUTE_PERMISSIONS,
  PERMISSIONS,
  normalizeRole,
} from "@/lib/rbac";
import { hrmUsersService } from "@/lib/hrm/firestore";
import {
  getAllRoles,
  getSystemRoles,
  updateRolePermissions,
  createCustomRole,
  deleteCustomRole,
  assignUserRole,
  PERMISSION_GROUPS,
} from "@/services/hrm/permissions";
import { recordAuditLog, getAuditLogs } from "@/services/hrm/audit";

// ── GET Handler — Fetch all roles, permissions tree, and audit logs ──

export const GET = withErrorHandler(async () => {
  const auth = await requireSuperAdmin();
  if (isErrorResponse(auth)) return auth;

  const tenantId = auth.tenantId;

  // Get all roles (system + custom) from the service
  const roles = await getAllRoles(tenantId);

  // Build permission tree from the centralized definition
  const permissionTree = PERMISSION_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    children: group.children.map((child) => ({
      key: child.key,
      label: child.label,
    })),
  }));

  // Build route-to-permission access summary
  const routeAccess = Object.entries(ROUTE_PERMISSIONS).map(([route, perms]) => ({
    route,
    permission: perms[0],
  }));

  // Get recent audit logs for role/permission changes
  let auditLogs: unknown[] = [];
  try {
    auditLogs = await getAuditLogs(tenantId, { limit: 50 });
  } catch {
    // Audit logs are optional for the response
  }

  return NextResponse.json({
    data: {
      roles,
      permissionTree,
      allPermissions: Object.values(PERMISSIONS),
      permissionGroups: PERMISSION_GROUPS,
      routeAccess,
      auditLogs,
      systemRoles: Object.keys(ROLES),
    },
  });
}, { label: "Permissions" });

// ── PATCH Handler — Update permissions for a specific role ──

export const PATCH = withErrorHandler(async (request: Request) => {
  const auth = await requireSuperAdmin();
  if (isErrorResponse(auth)) return auth;

  const body = await request.json();
  const { role, permissions } = body;

  if (!role) {
    return badRequest("role is required");
  }

  if (!Array.isArray(permissions)) {
    return badRequest("permissions must be an array of permission keys");
  }

  // Super Admin permissions cannot be modified
  if (role === "super_admin") {
    return forbidden("Super Admin permissions cannot be modified");
  }

  // Validate all permission keys exist in our permissions map
  const validPermissions = Object.values(PERMISSIONS);
  const invalidPerms = permissions.filter((p: string) => !validPermissions.includes(p as any));
  if (invalidPerms.length > 0) {
    return badRequest(`Invalid permissions: ${invalidPerms.join(", ")}`);
  }

  const result = await updateRolePermissions(
    auth.tenantId,
    role,
    permissions,
    {
      userId: auth.userId,
      name: "", // Name would require fetching user — optional for audit
      email: "", // Email not available from session directly
    }
  );

  return NextResponse.json({ data: result });
}, { label: "Permissions" });

// ── POST Handler — Create a custom role or assign user role ──

export const POST = withErrorHandler(async (request: Request) => {
  const auth = await requireSuperAdmin();
  if (isErrorResponse(auth)) return auth;

  const body = await request.json();
  const { action, ...data } = body;

  if (action === "create_role") {
    // Create a custom role
    const { name, displayName, description, permissions } = data;
    if (!name || !displayName) {
      return badRequest("name and displayName are required");
    }

    // Check for duplicate role name
    const existing = await getAllRoles(auth.tenantId);
    if (existing.some((r) => r.key === name)) {
      return badRequest(`Role "${name}" already exists`);
    }

    const newRole = await createCustomRole(
      auth.tenantId,
      {
        tenantId: auth.tenantId,
        name,
        displayName,
        description,
        permissions: permissions || [],
      },
      {
        userId: auth.userId,
        name: "",
        email: "",
      }
    );

    return NextResponse.json({ data: newRole }, { status: 201 });
  }

  if (action === "delete_role") {
    // Delete a custom role
    const { role } = data;
    if (!role) return badRequest("role is required");

    // Cannot delete system roles
    const systemRoles = Object.keys(ROLES);
    if (systemRoles.includes(role)) {
      return forbidden("System roles cannot be deleted");
    }

    const deleted = await deleteCustomRole(
      auth.tenantId,
      role,
      {
        userId: auth.userId,
        name: "",
        email: "",
      }
    );

    if (!deleted) {
      return notFound(`Custom role "${role}" not found`);
    }

    return NextResponse.json({ data: { deleted: true, role } });
  }

  if (action === "assign_role") {
    // Assign a role to a user
    const { userId, role, userEmail } = data;
    if (!userId || !role) {
      return badRequest("userId and role are required");
    }

    const normalizedRole = normalizeRole(role);

    // Update role in MongoDB with audit logging
    await assignUserRole(
      auth.tenantId,
      userId,
      userEmail || userId,
      normalizedRole,
      {
        userId: auth.userId,
        name: "",
        email: "",
      }
    );

    return NextResponse.json({
      data: {
        userId,
        role: normalizedRole,
        updated: true,
      },
    });
  }

  return badRequest("Unknown action. Use: create_role, delete_role, or assign_role");
}, { label: "Permissions" });

// ── PUT Handler — Legacy: Update a user's role ──

export const PUT = withErrorHandler(async (request: Request) => {
  const auth = await requireSuperAdmin();
  if (isErrorResponse(auth)) return auth;

  const body = await request.json();
  const { userId, role, userEmail } = body;

  if (!userId || !role) {
    return badRequest("userId and role are required");
  }

  const normalizedRole = normalizeRole(role);

  // Update role in MongoDB with audit logging
  await assignUserRole(
    auth.tenantId,
    userId,
    userEmail || userId,
    normalizedRole,
    {
      userId: auth.userId,
      name: "",
      email: "",
    }
  );

  return NextResponse.json({
    data: {
      userId,
      role: normalizedRole,
      updated: true,
    },
  });
}, { label: "Permissions" });
