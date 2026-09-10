import "server-only";
import { rolesService, permissionsService, hrmUsersService } from "@/lib/hrm/firestore";
import {
  ROLES,
  ROLE_LABELS,
  ROLE_PERMISSIONS as HARDCODED_PERMISSIONS,
  ROLE_HIERARCHY,
  PERMISSIONS,
  normalizeRole,
  hasPermission,
  type PermissionKey,
  type Role,
} from "@/lib/rbac";
import { recordAuditLog } from "@/services/hrm/audit";
import type { Role as RoleType, AuditLog } from "@/types";

// ── Types ──────────────────────────────────────────────

export interface RoleWithPermissions {
  key: string;
  label: string;
  level: number;
  permissions: string[];
  permissionCount: number;
  isSystem: boolean;
  isCustom: boolean;
  firestoreId?: string;
}

export interface CustomRoleInput {
  tenantId: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
}

export interface PermissionGroup {
  key: string;
  label: string;
  children: PermissionChild[];
}

export interface PermissionChild {
  key: string;
  label: string;
  group: string;
}

// ── Permission Tree Definition ─────────────────────────

/**
 * Hierarchical permission tree definition.
 * Used for UI display and permission grouping.
 */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    children: [{ key: "dashboard.view", label: "View Dashboard", group: "Dashboard" }],
  },
  {
    key: "employees",
    label: "Employee Management",
    children: [
      { key: "employees.view", label: "View Employees", group: "Employee Management" },
      { key: "employees.create", label: "Create Employees", group: "Employee Management" },
      { key: "employees.edit", label: "Edit Employees", group: "Employee Management" },
      { key: "employees.delete", label: "Delete Employees", group: "Employee Management" },
    ],
  },
  {
    key: "attendance",
    label: "Attendance",
    children: [
      { key: "attendance.view", label: "View Attendance", group: "Attendance" },
      { key: "attendance.edit", label: "Edit Attendance", group: "Attendance" },
      { key: "attendance.regularize", label: "Regularize Attendance", group: "Attendance" },
    ],
  },
  {
    key: "leave",
    label: "Leave Management",
    children: [
      { key: "leave.view", label: "View Leaves", group: "Leave Management" },
      { key: "leave.apply", label: "Apply Leave", group: "Leave Management" },
      { key: "leave.approve", label: "Approve Leave", group: "Leave Management" },
    ],
  },
  {
    key: "payroll",
    label: "Payroll",
    children: [
      { key: "payroll.view", label: "View Payroll", group: "Payroll" },
      { key: "payroll.process", label: "Process Payroll", group: "Payroll" },
      { key: "payroll.edit", label: "Edit Payroll", group: "Payroll" },
    ],
  },
  {
    key: "recruitment",
    label: "Recruitment",
    children: [
      { key: "recruitment.view", label: "View Recruitment", group: "Recruitment" },
      { key: "recruitment.create", label: "Create Job Posts", group: "Recruitment" },
      { key: "recruitment.edit", label: "Edit Job Posts", group: "Recruitment" },
      { key: "recruitment.delete", label: "Delete Job Posts", group: "Recruitment" },
    ],
  },
  {
    key: "performance",
    label: "Performance",
    children: [
      { key: "performance.view", label: "View Performance", group: "Performance" },
      { key: "performance.create", label: "Create Reviews", group: "Performance" },
      { key: "performance.edit", label: "Edit Reviews", group: "Performance" },
      { key: "performance.delete", label: "Delete Reviews", group: "Performance" },
    ],
  },
  {
    key: "projects",
    label: "Projects",
    children: [
      { key: "projects.view", label: "View Projects", group: "Projects" },
      { key: "projects.create", label: "Create Projects", group: "Projects" },
      { key: "projects.edit", label: "Edit Projects", group: "Projects" },
      { key: "projects.delete", label: "Delete Projects", group: "Projects" },
    ],
  },
  {
    key: "org",
    label: "Organization",
    children: [
      { key: "org.view", label: "View Organization", group: "Organization" },
      { key: "org.edit", label: "Edit Organization", group: "Organization" },
      { key: "org.departments", label: "Manage Departments", group: "Organization" },
    ],
  },
  {
    key: "departments",
    label: "Departments",
    children: [
      { key: "departments.view", label: "View Departments", group: "Departments" },
      { key: "departments.create", label: "Create Departments", group: "Departments" },
      { key: "departments.edit", label: "Edit Departments", group: "Departments" },
      { key: "departments.delete", label: "Delete Departments", group: "Departments" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    children: [
      { key: "settings.view", label: "View Settings", group: "Settings" },
      { key: "settings.edit", label: "Edit Settings", group: "Settings" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    children: [
      { key: "reports.view", label: "View Reports", group: "Reports" },
      { key: "reports.export", label: "Export Reports", group: "Reports" },
    ],
  },
  {
    key: "assets",
    label: "Assets",
    children: [
      { key: "assets.view", label: "View Assets", group: "Assets" },
      { key: "assets.create", label: "Create Assets", group: "Assets" },
      { key: "assets.assign", label: "Assign Assets", group: "Assets" },
    ],
  },
  {
    key: "documents",
    label: "Documents",
    children: [
      { key: "documents.view", label: "View Documents", group: "Documents" },
      { key: "documents.upload", label: "Upload Documents", group: "Documents" },
    ],
  },
  {
    key: "engage",
    label: "Engage",
    children: [
      { key: "engage.post", label: "Create Posts", group: "Engage" },
      { key: "engage.comment", label: "Comment", group: "Engage" },
    ],
  },
  {
    key: "onboarding",
    label: "Onboarding",
    children: [
      { key: "onboarding.view", label: "View Onboarding", group: "Onboarding" },
      { key: "onboarding.manage", label: "Manage Onboarding", group: "Onboarding" },
    ],
  },
  {
    key: "exit",
    label: "Exit Management",
    children: [
      { key: "exit.view", label: "View Exits", group: "Exit Management" },
      { key: "exit.manage", label: "Manage Exits", group: "Exit Management" },
    ],
  },
  {
    key: "holidays",
    label: "Holidays",
    children: [
      { key: "holidays.view", label: "View Holidays", group: "Holidays" },
      { key: "holidays.manage", label: "Manage Holidays", group: "Holidays" },
    ],
  },
  {
    key: "probation",
    label: "Probation",
    children: [
      { key: "probation.view", label: "View Probation", group: "Probation" },
      { key: "probation.manage", label: "Manage Probation", group: "Probation" },
    ],
  },
  {
    key: "role_management",
    label: "Role Management",
    children: [
      { key: "role_management.view", label: "View Roles", group: "Role Management" },
      { key: "role_management.create", label: "Create Roles", group: "Role Management" },
      { key: "role_management.edit", label: "Edit Roles", group: "Role Management" },
      { key: "role_management.delete", label: "Delete Roles", group: "Role Management" },
    ],
  },
  {
    key: "permission_management",
    label: "Permission Management",
    children: [
      { key: "permission_management.view", label: "View Permissions", group: "Permission Management" },
      { key: "permission_management.edit", label: "Edit Permissions", group: "Permission Management" },
    ],
  },
];

// ── In-Memory Cache ─────────────────────────────────────

let cachedCustomRoles: Record<string, RoleWithPermissions[]> = {};
let cacheTimestamp: Record<string, number> = {};
const CACHE_TTL_MS = 60_000; // 1 minute

// ── Service Functions ──────────────────────────────────

/**
 * Get all roles (both hardcoded system roles and custom Firestore roles)
 * merged with their permissions for a given tenant.
 */
export async function getAllRoles(tenantId: string): Promise<RoleWithPermissions[]> {
  const systemRoles = getSystemRoles();
  const customRoles = await getCustomRolesFromFirestore(tenantId);
  return [...systemRoles, ...customRoles];
}

/**
 * Get the system-defined roles (hardcoded in rbac.ts).
 */
export function getSystemRoles(): RoleWithPermissions[] {
  return (Object.keys(ROLES) as Role[]).map((role) => ({
    key: role,
    label: ROLE_LABELS[role],
    level: ROLE_HIERARCHY[role],
    permissions: [...HARDCODED_PERMISSIONS[role]],
    permissionCount: HARDCODED_PERMISSIONS[role].length,
    isSystem: true,
    isCustom: false,
  }));
}

/**
 * Get custom roles from Firestore, with caching.
 */
export async function getCustomRolesFromFirestore(tenantId: string): Promise<RoleWithPermissions[]> {
  // Check cache
  const cached = cachedCustomRoles[tenantId];
  const timestamp = cacheTimestamp[tenantId] || 0;
  if (cached && Date.now() - timestamp < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const firestoreRoles = await rolesService.findManyInTenant(tenantId);
    const customRoles: RoleWithPermissions[] = firestoreRoles
      .filter((r) => !r.isSystem) // Only non-system roles
      .map((r) => ({
        key: r.name,
        label: r.displayName,
        level: 10, // Custom roles get lowest hierarchy level
        permissions: r.permissions || [],
        permissionCount: (r.permissions || []).length,
        isSystem: false,
        isCustom: true,
        firestoreId: r.id,
      }));

    // Update cache
    cachedCustomRoles[tenantId] = customRoles;
    cacheTimestamp[tenantId] = Date.now();
    return customRoles;
  } catch (err) {
    console.error("[PermissionsService] Failed to fetch custom roles:", err);
    return [];
  }
}

/**
 * Get permissions for a specific role, checking Firestore first then falling back
 * to hardcoded defaults. Super Admin always gets all permissions.
 */
export async function getRolePermissions(
  tenantId: string,
  role: string
): Promise<string[]> {
  // Super Admin always has all permissions
  if (role === "super_admin") {
    return Object.values(PERMISSIONS);
  }

  // Check if it's a system role first
  const normalized = normalizeRole(role);
  if (normalized !== "employee" || role === "employee" || role === "admin") {
    // It's a system role — check if Firestore has overrides
    try {
      const firestoreRole = await rolesService.findOneInTenant(tenantId, "name", role);
      if (firestoreRole && firestoreRole.permissions && firestoreRole.permissions.length > 0) {
        return firestoreRole.permissions;
      }
    } catch {
      // Fall back to hardcoded
    }
    return HARDCODED_PERMISSIONS[normalized] || HARDCODED_PERMISSIONS.employee;
  }

  // Custom role — fetch from Firestore
  try {
    const firestoreRole = await rolesService.findOneInTenant(tenantId, "name", role);
    if (firestoreRole) {
      return firestoreRole.permissions || [];
    }
  } catch {
    // Fall through
  }

  return [];
}

/**
 * Update permissions for a specific role.
 * - For system roles: stores override in Firestore
 * - For custom roles: updates the role document
 * Logs the change in audit logs.
 */
export async function updateRolePermissions(
  tenantId: string,
  roleName: string,
  permissions: string[],
  performedBy: { userId: string; name: string; email: string }
): Promise<{ success: boolean; permissions: string[] }> {
  // Clear cache for this tenant
  delete cachedCustomRoles[tenantId];

  // Check if role exists in Firestore
  let firestoreRole = await rolesService.findOneInTenant(tenantId, "name", roleName);

  if (firestoreRole) {
    // Update existing role
    await rolesService.update(firestoreRole.id, { permissions } as any);
  } else {
    // Create a new role document (for system roles that don't exist in Firestore yet)
    await rolesService.create({
      tenantId,
      name: roleName,
      displayName: ROLE_LABELS[roleName as Role] || roleName,
      guardName: "mongodb",
      isSystem: true,
      permissions,
    } as any);
  }

  // Audit log
  try {
    await recordAuditLog({
      tenantId,
      action: "update_role",
      performedById: performedBy.userId,
      performedByName: performedBy.name,
      targetUserId: performedBy.userId,
      targetUserEmail: performedBy.email,
      details: `Updated permissions for role "${roleName}": ${permissions.length} permissions assigned`,
      metadata: {
        roleName,
        permissionCount: permissions.length,
        permissions,
      },
    });
  } catch (err) {
    console.error("[PermissionsService] Failed to record audit log:", err);
  }

  return { success: true, permissions };
}

/**
 * Create a custom role with specified permissions.
 */
export async function createCustomRole(
  tenantId: string,
  input: CustomRoleInput,
  performedBy: { userId: string; name: string; email: string }
): Promise<RoleWithPermissions> {
  // Clear cache
  delete cachedCustomRoles[tenantId];

  const role = await rolesService.create({
    tenantId,
    name: input.name,
    displayName: input.displayName,
    guardName: "mongodb",
    description: input.description || "",
    isSystem: false,
    permissions: input.permissions,
  } as any);

  // Audit log
  try {
    await recordAuditLog({
      tenantId,
      action: "update_role",
      performedById: performedBy.userId,
      performedByName: performedBy.name,
      targetUserId: performedBy.userId,
      targetUserEmail: performedBy.email,
      details: `Created custom role "${input.displayName}" with ${input.permissions.length} permissions`,
      metadata: {
        roleName: input.name,
        displayName: input.displayName,
        permissionCount: input.permissions.length,
        permissions: input.permissions,
      },
    });
  } catch (err) {
    console.error("[PermissionsService] Failed to record audit log:", err);
  }

  return {
    key: input.name,
    label: input.displayName,
    level: 10,
    permissions: input.permissions,
    permissionCount: input.permissions.length,
    isSystem: false,
    isCustom: true,
    firestoreId: role.id,
  };
}

/**
 * Delete a custom role.
 */
export async function deleteCustomRole(
  tenantId: string,
  roleName: string,
  performedBy: { userId: string; name: string; email: string }
): Promise<boolean> {
  // Clear cache
  delete cachedCustomRoles[tenantId];

  const firestoreRole = await rolesService.findOneInTenant(tenantId, "name", roleName);
  if (!firestoreRole || firestoreRole.isSystem) {
    return false;
  }

  await rolesService.delete(firestoreRole.id);

  // Audit log
  try {
    await recordAuditLog({
      tenantId,
      action: "update_role",
      performedById: performedBy.userId,
      performedByName: performedBy.name,
      targetUserId: performedBy.userId,
      targetUserEmail: performedBy.email,
      details: `Deleted custom role "${roleName}"`,
      metadata: { roleName },
    });
  } catch (err) {
    console.error("[PermissionsService] Failed to record audit log:", err);
  }

  return true;
}

/**
 * Assign a user to a role and log the change.
 */
export async function assignUserRole(
  tenantId: string,
  targetUserId: string,
  targetUserEmail: string,
  newRole: string,
  performedBy: { userId: string; name: string; email: string }
): Promise<void> {
  const normalized = normalizeRole(newRole);

  // Update user role in Firestore
  await hrmUsersService.update(targetUserId, { role: normalized } as any);

  // Audit log
  try {
    await recordAuditLog({
      tenantId,
      action: "update_role",
      performedById: performedBy.userId,
      performedByName: performedBy.name,
      targetUserId,
      targetUserEmail,
      details: `Changed role to "${normalized}"`,
      metadata: { newRole: normalized },
    });
  } catch (err) {
    console.error("[PermissionsService] Failed to record audit log:", err);
  }
}

/**
 * Invalidate the permissions cache for a tenant.
 */
export function invalidatePermissionsCache(tenantId: string): void {
  delete cachedCustomRoles[tenantId];
  delete cacheTimestamp[tenantId];
}

/**
 * Check if a role has a specific permission, considering both
 * Firestore overrides and hardcoded defaults.
 */
export async function checkPermission(
  tenantId: string,
  role: string,
  permission: string
): Promise<boolean> {
  if (role === "super_admin") return true;
  const rolePermissions = await getRolePermissions(tenantId, role);
  return rolePermissions.includes(permission);
}
