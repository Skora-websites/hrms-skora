import "server-only";
import { getDb } from "@/lib/db/mongo-helper";
import { hrmUsersService, rolesService, permissionsService, approvalChainsService } from "@/lib/hrm/firestore";
import type { HRMUser, Role, Permission, ApprovalChain } from "@/types";

// ══════════════════════════════════════════════════════════════════
// Auth & RBAC Service
// ══════════════════════════════════════════════════════════════════

// ── Role Hierarchy ─────────────────────────────────────

export const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100,
  admin: 80,
  hr: 60,
  manager: 40,
  employee: 20,
  support_manager: 10,
};

export const ROLE_DEFINITIONS: Record<string, { name: string; displayName: string; description: string; isSystem: boolean }> = {
  super_admin: {
    name: "super_admin",
    displayName: "Super Admin",
    description: "Full system access, manages tenants, bypasses tenant scoping",
    isSystem: true,
  },
  admin: {
    name: "admin",
    displayName: "Admin",
    description: "Full access within a tenant",
    isSystem: true,
  },
  hr: {
    name: "hr",
    displayName: "HR",
    description: "HR operations within a tenant",
    isSystem: true,
  },
  manager: {
    name: "manager",
    displayName: "Manager",
    description: "Team management, approvals",
    isSystem: true,
  },
  employee: {
    name: "employee",
    displayName: "Employee",
    description: "Self-service access",
    isSystem: true,
  },
  support_manager: {
    name: "support_manager",
    displayName: "Support Manager",
    description: "Tenant management only",
    isSystem: true,
  },
};

// ── Permission Tree ────────────────────────────────────

export const DEFAULT_PERMISSION_TREE: { key: string; name: string; group: string; children?: { key: string; name: string; group: string }[] }[] = [
  {
    key: "users",
    name: "Users",
    group: "Employee Management",
    children: [
      { key: "users.view", name: "View Users", group: "Employee Management" },
      { key: "users.create", name: "Create Users", group: "Employee Management" },
      { key: "users.edit", name: "Edit Users", group: "Employee Management" },
      { key: "users.delete", name: "Delete Users", group: "Employee Management" },
    ],
  },
  {
    key: "attendance",
    name: "Attendance",
    group: "Time Management",
    children: [
      { key: "attendance.view", name: "View Attendance", group: "Time Management" },
      { key: "attendance.edit", name: "Edit Attendance", group: "Time Management" },
      { key: "attendance.regularize", name: "Regularize Attendance", group: "Time Management" },
    ],
  },
  {
    key: "leave",
    name: "Leave",
    group: "Time Management",
    children: [
      { key: "leave.view", name: "View Leaves", group: "Time Management" },
      { key: "leave.apply", name: "Apply Leave", group: "Time Management" },
      { key: "leave.approve", name: "Approve Leave", group: "Time Management" },
    ],
  },
  {
    key: "payroll",
    name: "Payroll",
    group: "Finance",
    children: [
      { key: "payroll.view", name: "View Payroll", group: "Finance" },
      { key: "payroll.process", name: "Process Payroll", group: "Finance" },
      { key: "payroll.edit", name: "Edit Salary", group: "Finance" },
    ],
  },
  {
    key: "organization",
    name: "Organization",
    group: "Administration",
    children: [
      { key: "org.view", name: "View Organization", group: "Administration" },
      { key: "org.edit", name: "Edit Organization", group: "Administration" },
      { key: "org.departments", name: "Manage Departments", group: "Administration" },
    ],
  },
  {
    key: "settings",
    name: "Settings",
    group: "Administration",
    children: [
      { key: "settings.view", name: "View Settings", group: "Administration" },
      { key: "settings.edit", name: "Edit Settings", group: "Administration" },
    ],
  },
  {
    key: "reports",
    name: "Reports",
    group: "Analytics",
    children: [
      { key: "reports.view", name: "View Reports", group: "Analytics" },
      { key: "reports.export", name: "Export Reports", group: "Analytics" },
    ],
  },
  {
    key: "assets",
    name: "Assets",
    group: "Operations",
    children: [
      { key: "assets.view", name: "View Assets", group: "Operations" },
      { key: "assets.create", name: "Create Assets", group: "Operations" },
      { key: "assets.assign", name: "Assign Assets", group: "Operations" },
    ],
  },
  {
    key: "documents",
    name: "Documents",
    group: "Operations",
    children: [
      { key: "documents.view", name: "View Documents", group: "Operations" },
      { key: "documents.upload", name: "Upload Documents", group: "Operations" },
    ],
  },
  {
    key: "engage",
    name: "Engage",
    group: "Engagement",
    children: [
      { key: "engage.post", name: "Create Posts", group: "Engagement" },
      { key: "engage.comment", name: "Comment", group: "Engagement" },
    ],
  },
];

// ── Default Role Permissions ───────────────────────────

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"], // All permissions
  admin: [
    "users.view", "users.create", "users.edit", "users.delete",
    "attendance.view", "attendance.edit", "attendance.regularize",
    "leave.view", "leave.apply", "leave.approve",
    "payroll.view", "payroll.process", "payroll.edit",
    "org.view", "org.edit", "org.departments",
    "settings.view", "settings.edit",
    "reports.view", "reports.export",
    "assets.view", "assets.create", "assets.assign",
    "documents.view", "documents.upload",
    "engage.post", "engage.comment",
  ],
  hr: [
    "users.view", "users.create", "users.edit",
    "attendance.view", "attendance.regularize",
    "leave.view", "leave.apply",
    "org.view",
    "reports.view",
    "documents.view",
  ],
  manager: [
    "users.view",
    "attendance.view",
    "leave.view", "leave.apply", "leave.approve",
    "reports.view",
    "engage.post", "engage.comment",
  ],
  employee: [
    "users.view",
    "attendance.view",
    "leave.apply",
    "engage.post", "engage.comment",
    "documents.view",
    "assets.view",
  ],
  support_manager: [
    "org.view",
    "settings.view",
    "users.view",
  ],
};

// ── Helper Functions ───────────────────────────────────

/**
 * Check if a user has a specific permission.
 */
export function hasPermission(userRole: string, permissionKey: string, rolePermissions?: Record<string, string[]>): boolean {
  const permissions = rolePermissions || ROLE_PERMISSIONS;
  const userPerms = permissions[userRole];
  if (!userPerms) return false;
  if (userPerms.includes("*")) return true;
  return userPerms.includes(permissionKey);
}

/**
 * Check if a user has all specified permissions.
 */
export function hasAllPermissions(userRole: string, permissionKeys: string[]): boolean {
  return permissionKeys.every((key) => hasPermission(userRole, key));
}

/**
 * Check if role A has higher or equal hierarchy than role B.
 */
export function hasRoleHierarchy(roleA: string, roleB: string): boolean {
  const a = ROLE_HIERARCHY[roleA] || 0;
  const b = ROLE_HIERARCHY[roleB] || 0;
  return a >= b;
}

/**
 * Get the display name for a role.
 */
export function getRoleDisplayName(role: string): string {
  return ROLE_DEFINITIONS[role]?.displayName || role;
}

// ── Auth Service Functions ─────────────────────────────

/**
 * Get current user with role information.
 */
export async function getCurrentUser(userId: string): Promise<HRMUser | null> {
  return hrmUsersService.findById(userId);
}

/**
 * Check if a user's login is enabled.
 */
export async function isUserLoginEnabled(userId: string): Promise<boolean> {
  const user = await hrmUsersService.findById(userId);
  if (!user) return false;
  return user.loginStatus === "enabled" && user.status === "active";
}

/**
 * Revoke all tokens for a user (triggered on login disable).
 */
export async function revokeUserTokens(userId: string): Promise<void> {
  try {
    const db = await getDb();
    if (db) {
      await db.collection("sessions").deleteMany({ userId });
    }
  } catch (error) {
    console.error("Token revocation error:", error);
  }
}

/**
 * Seed default permissions (call during initial setup).
 */
export async function seedDefaultPermissions(tenantId: string): Promise<void> {
  const existingPermissions = await permissionsService.findManyInTenant(tenantId);
  if (existingPermissions.length > 0) return; // Already seeded

  for (const group of DEFAULT_PERMISSION_TREE) {
    // Create parent permission
    await permissionsService.create({
      key: group.key,
      name: group.name,
      group: group.group,
      tenantId,
    } as any);

    // Create child permissions
    if (group.children) {
      for (const child of group.children) {
        await permissionsService.create({
          ...child,
          parentKey: group.key,
          tenantId,
        } as any);
      }
    }
  }
}

/**
 * Seed default roles with permissions (call during initial setup).
 */
export async function seedDefaultRoles(tenantId: string): Promise<void> {
  const existingRoles = await rolesService.findManyInTenant(tenantId);
  if (existingRoles.length > 0) return; // Already seeded

  for (const [roleName, definition] of Object.entries(ROLE_DEFINITIONS)) {
    await rolesService.create({
      ...definition,
      tenantId,
      guardName: "mongodb",
      permissions: ROLE_PERMISSIONS[roleName] || [],
    } as any);
  }
}

// ── Approval Chain Service ─────────────────────────────

/**
 * Process an approval based on the approval chain configuration.
 */
export async function processApproval(
  chainId: string,
  userId: string,
  action: "approve" | "reject",
  notes?: string
): Promise<{ approved: boolean; status: string }> {
  const chain = await approvalChainsService.findById(chainId);
  if (!chain) {
    throw new Error("Approval chain not found");
  }

  // Simple approval logic: if strategy is "all", all must approve
  // For now, we return the approval decision
  if (action === "reject") {
    return { approved: false, status: "rejected" };
  }

  return { approved: true, status: "approved" };
}

/**
 * Get the next approver in the chain.
 */
export async function getNextApprover(
  chainId: string,
  currentStep: number
): Promise<{ step: number; type: string; userId?: string } | null> {
  const chain = await approvalChainsService.findById(chainId);
  if (!chain || currentStep >= chain.steps.length) return null;

  return { ...chain.steps[currentStep], step: currentStep };
}

// ── Authorization Checks ───────────────────────────────

/**
 * Authorize a user action based on role.
 * Throws if unauthorized.
 */
export function authorize(role: string, requiredPermission: string): void {
  if (!hasPermission(role, requiredPermission)) {
    throw new Error(`Unauthorized: ${role} does not have '${requiredPermission}' permission`);
  }
}

/**
 * Create a permission check function for a specific role.
 */
export function createPermissionChecker(role: string) {
  return {
    can: (permission: string) => hasPermission(role, permission),
    canAll: (permissions: string[]) => hasAllPermissions(role, permissions),
    authorize: (permission: string) => authorize(role, permission),
  };
}
