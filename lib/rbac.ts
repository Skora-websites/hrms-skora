// ══════════════════════════════════════════════════════════════════
// Role-Based Access Control (RBAC)
// ══════════════════════════════════════════════════════════════════

import { SUPER_ADMIN_EMAILS } from "@/lib/constants";

// ── Role Types ─────────────────────────────────────────

export type Role = "super_admin" | "admin" | "hr_admin" | "manager" | "employee";

export const ROLES = {
  SUPER_ADMIN: "super_admin" as const,
  ADMIN: "admin" as const,
  HR_ADMIN: "hr_admin" as const,
  MANAGER: "manager" as const,
  EMPLOYEE: "employee" as const,
} as const;

/**
 * Maps legacy roles (from the old system) to the canonical RBAC system.
 */
export const LEGACY_ROLE_MAP: Record<string, Role> = {
  super_admin: "super_admin",
  admin: "hr_admin",
  hr_admin: "hr_admin",
  hr: "hr_admin",
  manager: "manager",
  employee: "employee",
  agent: "employee",
  support_manager: "manager",
};

/** Normalize arbitrary stored/legacy role values to a known role. */
export function normalizeRole(role: string | undefined | null): Role {
  const normalized = String(role ?? "").trim().toLowerCase();
  if ((ROLES as Record<string, string>)[normalized]) return normalized as Role;
  return LEGACY_ROLE_MAP[normalized] ?? "employee";
}

export const ROLE_HIERARCHY: Record<Role, number> = {
  super_admin: 100,
  hr_admin: 80,
  admin: 80,
  manager: 50,
  employee: 20,
};

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "CEO",
  hr_admin: "HR Admin",
  admin: "HR Admin",
  manager: "Manager",
  employee: "Employee",
};

// ── Permission Keys ─────────────────────────────────────

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  EMPLOYEES_VIEW: "employees.view",
  EMPLOYEES_CREATE: "employees.create",
  EMPLOYEES_EDIT: "employees.edit",
  EMPLOYEES_DELETE: "employees.delete",
  ATTENDANCE_VIEW: "attendance.view",
  ATTENDANCE_EDIT: "attendance.edit",
  ATTENDANCE_REGULARIZE: "attendance.regularize",
  LEAVE_VIEW: "leave.view",
  LEAVE_APPLY: "leave.apply",
  LEAVE_APPROVE: "leave.approve",
  PAYROLL_VIEW: "payroll.view",
  PAYROLL_PROCESS: "payroll.process",
  PAYROLL_EDIT: "payroll.edit",
  ORG_VIEW: "org.view",
  ORG_EDIT: "org.edit",
  ORG_DEPARTMENTS: "org.departments",
  SETTINGS_VIEW: "settings.view",
  SETTINGS_EDIT: "settings.edit",
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
  ASSETS_VIEW: "assets.view",
  ASSETS_CREATE: "assets.create",
  ASSETS_ASSIGN: "assets.assign",
  DOCUMENTS_VIEW: "documents.view",
  DOCUMENTS_UPLOAD: "documents.upload",
  ENGAGE_POST: "engage.post",
  ENGAGE_COMMENT: "engage.comment",
  ONBOARDING_VIEW: "onboarding.view",
  ONBOARDING_MANAGE: "onboarding.manage",
  EXIT_VIEW: "exit.view",
  EXIT_MANAGE: "exit.manage",
  HOLIDAYS_VIEW: "holidays.view",
  HOLIDAYS_MANAGE: "holidays.manage",
  PROBATION_VIEW: "probation.view",
  PROBATION_MANAGE: "probation.manage",
  LEADS_VIEW: "leads.view",
  LEADS_CREATE: "leads.create",
  LEADS_EDIT: "leads.edit",
  LEADS_DELETE: "leads.delete",
  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_CREATE: "customers.create",
  CUSTOMERS_EDIT: "customers.edit",
  CUSTOMERS_DELETE: "customers.delete",
  CONTACTS_VIEW: "contacts.view",
  CONTACTS_CREATE: "contacts.create",
  CONTACTS_EDIT: "contacts.edit",
  CONTACTS_DELETE: "contacts.delete",
  DEALS_VIEW: "deals.view",
  DEALS_CREATE: "deals.create",
  DEALS_EDIT: "deals.edit",
  DEALS_DELETE: "deals.delete",
  TASKS_VIEW: "tasks.view",
  TASKS_CREATE: "tasks.create",
  TASKS_EDIT: "tasks.edit",
  TASKS_DELETE: "tasks.delete",
  ACTIVITIES_VIEW: "activities.view",
  ACTIVITIES_CREATE: "activities.create",
  ACTIVITIES_EDIT: "activities.edit",
  ACTIVITIES_DELETE: "activities.delete",
  ANALYTICS_VIEW: "analytics.view",
  RECRUITMENT_VIEW: "recruitment.view",
  RECRUITMENT_CREATE: "recruitment.create",
  RECRUITMENT_EDIT: "recruitment.edit",
  RECRUITMENT_DELETE: "recruitment.delete",
  PERFORMANCE_VIEW: "performance.view",
  PERFORMANCE_CREATE: "performance.create",
  PERFORMANCE_EDIT: "performance.edit",
  PERFORMANCE_DELETE: "performance.delete",
  TASKS_HRM_VIEW: "tasks_hrm.view",
  TASKS_HRM_CREATE: "tasks_hrm.create",
  TASKS_HRM_EDIT: "tasks_hrm.edit",
  TASKS_HRM_DELETE: "tasks_hrm.delete",
  TASKS_HRM_ASSIGN: "tasks_hrm.assign",
  TASKS_HRM_REASSIGN: "tasks_hrm.reassign",
  TICKETS_VIEW: "tickets.view",
  TICKETS_CREATE: "tickets.create",
  TICKETS_EDIT: "tickets.edit",
  TICKETS_DELETE: "tickets.delete",
  TICKETS_ASSIGN: "tickets.assign",
  TICKETS_REPLY: "tickets.reply",
  PROJECTS_VIEW: "projects.view",
  PROJECTS_CREATE: "projects.create",
  PROJECTS_EDIT: "projects.edit",
  PROJECTS_DELETE: "projects.delete",
  DEPARTMENTS_VIEW: "departments.view",
  DEPARTMENTS_CREATE: "departments.create",
  DEPARTMENTS_EDIT: "departments.edit",
  DEPARTMENTS_DELETE: "departments.delete",
  ROLE_MANAGEMENT_VIEW: "role_management.view",
  ROLE_MANAGEMENT_CREATE: "role_management.create",
  ROLE_MANAGEMENT_EDIT: "role_management.edit",
  ROLE_MANAGEMENT_DELETE: "role_management.delete",
  PERMISSION_MANAGEMENT_VIEW: "permission_management.view",
  PERMISSION_MANAGEMENT_EDIT: "permission_management.edit",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROUTE_PERMISSIONS: Record<string, PermissionKey[]> = {
  "/dashboard": [PERMISSIONS.DASHBOARD_VIEW],
  "/employees": [PERMISSIONS.EMPLOYEES_VIEW],
  "/attendance": [PERMISSIONS.ATTENDANCE_VIEW],
  "/leaves": [PERMISSIONS.LEAVE_VIEW],
  "/payroll": [PERMISSIONS.PAYROLL_VIEW],
  "/organization": [PERMISSIONS.ORG_VIEW],
  "/settings": [PERMISSIONS.SETTINGS_VIEW],
  "/reports": [PERMISSIONS.REPORTS_VIEW],
  "/assets": [PERMISSIONS.ASSETS_VIEW],
  "/documents": [PERMISSIONS.DOCUMENTS_VIEW],
  "/engage": [PERMISSIONS.ENGAGE_POST],
  "/onboarding": [PERMISSIONS.ONBOARDING_VIEW],
  "/exit": [PERMISSIONS.EXIT_VIEW],
  "/holidays": [PERMISSIONS.HOLIDAYS_VIEW],
  "/probation": [PERMISSIONS.PROBATION_VIEW],
  "/leads": [PERMISSIONS.LEADS_VIEW],
  "/customers": [PERMISSIONS.CUSTOMERS_VIEW],
  "/contacts": [PERMISSIONS.CONTACTS_VIEW],
  "/deals": [PERMISSIONS.DEALS_VIEW],
  "/pipeline": [PERMISSIONS.DEALS_VIEW],
  "/tasks": [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_HRM_VIEW],
  "/tickets": [PERMISSIONS.TICKETS_VIEW],
  "/activities": [PERMISSIONS.ACTIVITIES_VIEW],
  "/analytics": [PERMISSIONS.ANALYTICS_VIEW],
  "/recruitment": [PERMISSIONS.RECRUITMENT_VIEW],
  "/performance": [PERMISSIONS.PERFORMANCE_VIEW],
  "/projects": [PERMISSIONS.PROJECTS_VIEW],
  "/departments": [PERMISSIONS.DEPARTMENTS_VIEW],
  "/role-management": [PERMISSIONS.ROLE_MANAGEMENT_VIEW],
  "/permission-management": [PERMISSIONS.PERMISSION_MANAGEMENT_VIEW],
};

export const ROLE_PERMISSIONS: Record<Role, PermissionKey[]> = {
  super_admin: Object.values(PERMISSIONS),
  hr_admin: Object.values(PERMISSIONS).filter((p) => !p.startsWith("role_management") && !p.startsWith("permission_management")),
  admin: Object.values(PERMISSIONS).filter((p) => !p.startsWith("role_management") && !p.startsWith("permission_management")),
  manager: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.EMPLOYEES_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.LEAVE_VIEW,
    PERMISSIONS.LEAVE_APPLY,
    PERMISSIONS.LEAVE_APPROVE,
    PERMISSIONS.PERFORMANCE_VIEW,
    PERMISSIONS.PERFORMANCE_CREATE,
    PERMISSIONS.TASKS_HRM_VIEW,
    PERMISSIONS.TASKS_HRM_CREATE,
    PERMISSIONS.TASKS_HRM_EDIT,
    PERMISSIONS.TASKS_HRM_ASSIGN,
    PERMISSIONS.PROJECTS_VIEW,
    PERMISSIONS.PROJECTS_CREATE,
    PERMISSIONS.PROJECTS_EDIT,
    PERMISSIONS.TICKETS_VIEW,
    PERMISSIONS.TICKETS_REPLY,
    PERMISSIONS.HOLIDAYS_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
  ],
  employee: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.LEAVE_APPLY,
    PERMISSIONS.ASSETS_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.ENGAGE_POST,
    PERMISSIONS.ENGAGE_COMMENT,
    PERMISSIONS.HOLIDAYS_VIEW,
    PERMISSIONS.TASKS_HRM_VIEW,
    PERMISSIONS.TICKETS_VIEW,
    PERMISSIONS.TICKETS_CREATE,
    PERMISSIONS.TICKETS_REPLY,
  ],
};

export const ROUTE_ACCESS: Record<string, Role[]> = {
  // ── Role-gated areas — MUST mirror middleware.ts ROLE_GATED_ROUTES ──
  "/hrms/superadmin": ["super_admin"],
  "/hrms/hr-admin": ["hr_admin", "admin"],
  "/hrms/manager": ["manager"],
  // NOTE: /hrms/employee is intentionally open to all roles — it hosts the
  // shared GPS punch card every dashboard embeds (mirrors middleware.ts).
  "/hrms/employee": ["super_admin", "hr_admin", "admin", "manager", "employee"],

  // ── Shared pages — middleware protects them (session required) but does
  //    not role-gate them, so every role may pass the client guard too. ──
  "/hrms/dashboard": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/employees": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/attendance": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/leaves": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/payroll": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/organization": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/documents": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/assets": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/holidays": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/onboarding": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/probation": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/exit": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/engage": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/tasks": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/tickets": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/projects": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/recruitment": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/performance": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/reports": ["super_admin", "hr_admin", "admin", "manager", "employee"],
  "/hrms/settings": ["super_admin", "hr_admin", "admin", "manager", "employee"],
};

export function hasPermission(userRole: string, permissionKey: string, rolePermissions?: Record<string, string[]>): boolean {
  const role = normalizeRole(userRole);
  const permissions = rolePermissions || ROLE_PERMISSIONS;
  const userPerms = permissions[role];
  if (!userPerms) return false;
  if (userPerms.includes("*" as any)) return true;
  return userPerms.includes(permissionKey as PermissionKey);
}

export function hasAllPermissions(userRole: string, permissionKeys: string[]): boolean {
  return permissionKeys.every((key) => hasPermission(userRole, key));
}

export function hasRoleHierarchy(roleA: string, roleB: string): boolean {
  const a = ROLE_HIERARCHY[normalizeRole(roleA)] || 0;
  const b = ROLE_HIERARCHY[normalizeRole(roleB)] || 0;
  return a >= b;
}

export function getRoleDisplayName(role: string): string {
  const canonical = normalizeRole(role);
  return ROLE_LABELS[canonical] || canonical;
}

export function isSuperAdminEmail(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

// ── Additional RBAC helpers ─────────────────────────────────────

/**
 * Check if a role can access a given route.
 */
export function canAccessRoute(
  role: string | undefined | null,
  path: string
): boolean {
  if (!role) return false;
  const normalized = normalizeRole(role);
  if (normalized === "super_admin") return true;

  // Exact match first
  const exact = ROUTE_ACCESS[path];
  if (exact) return exact.includes(normalized);

  // Longest-prefix match so e.g. /hrms/employee/leaves is governed by
  // the /hrms/employee rule.
  const matches = Object.keys(ROUTE_ACCESS)
    .filter((route) => path.startsWith(route + "/"))
    .sort((a, b) => b.length - a.length);
  if (matches.length > 0) {
    return ROUTE_ACCESS[matches[0]].includes(normalized);
  }

  // Not listed: middleware is the authoritative server-side gate and already
  // allowed this navigation, so the client guard must not be stricter.
  return true;
}

/**
 * Get the display label for a role.
 */
export function getRoleLabel(role: string): string {
  const canonical = normalizeRole(role);
  return ROLE_LABELS[canonical] || canonical;
}

/**
 * Check if a role is at least a certain level (hierarchy check).
 */
export function hasRoleLevel(role: string, minimumRole: Role): boolean {
  const userLevel = ROLE_HIERARCHY[normalizeRole(role)] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 0;
  return userLevel >= requiredLevel;
}
