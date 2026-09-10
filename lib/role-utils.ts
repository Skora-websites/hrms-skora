import type { Role } from "@/lib/rbac";

const ROLE_MAP: Record<string, Role> = {
  super_admin: "super_admin",
  admin: "hr_admin",
  hr_admin: "hr_admin",
  hr: "hr_admin",
  manager: "manager",
  employee: "employee",
  agent: "employee",
  support_manager: "manager",
};

/**
 * Normalize only known roles. Unknown or malformed database values fail closed
 * to employee instead of being cast into a privileged Role type.
 */
export function normalizeRoleStrict(role: string | undefined | null): Role {
  const normalized = String(role ?? "").trim().toLowerCase();
  return ROLE_MAP[normalized] ?? "employee";
}
