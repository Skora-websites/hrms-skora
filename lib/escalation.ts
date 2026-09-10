/**
 * Attendance Escalation Routing
 * 
 * Core rules:
 * - Employee attendance → Manager + HR Admin
 * - Manager attendance → Super Admin
 * - HR Admin attendance → Super Admin
 * - Super Admin attendance → Self (no escalation needed)
 */

import { normalizeRole, type Role } from "@/lib/rbac";

export type EscalationLevel = "none" | "manager_hr" | "super_admin";

/**
 * Determine the escalation level for a user's attendance record.
 */
export function getEscalationLevel(role: string): EscalationLevel {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case "employee":
      return "manager_hr";
    case "manager":
      return "super_admin";
    case "hr_admin":
    case "admin":
      return "super_admin";
    case "super_admin":
      return "none";
    default:
      return "manager_hr";
  }
}

/**
 * Get who should be notified for a given user's attendance.
 */
export function getAttendanceRecipients(
  role: string,
  managerId?: string,
  hrAdminIds?: string[]
): {
  managers: string[];
  hrAdmins: string[];
  superAdmins: string[];
} {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case "employee":
      return {
        managers: managerId ? [managerId] : [],
        hrAdmins: hrAdminIds || [],
        superAdmins: [],
      };
    case "manager":
      return {
        managers: [],
        hrAdmins: [],
        superAdmins: ["super_admin"], // All super admins
      };
    case "hr_admin":
    case "admin":
      return {
        managers: [],
        hrAdmins: [],
        superAdmins: ["super_admin"],
      };
    case "super_admin":
      return {
        managers: [],
        hrAdmins: [],
        superAdmins: [],
      };
    default:
      return {
        managers: managerId ? [managerId] : [],
        hrAdmins: hrAdminIds || [],
        superAdmins: [],
      };
  }
}

/**
 * Check if a user can view another user's attendance data.
 * Super Admin can view everyone.
 * HR Admin can view all employees + managers.
 * Manager can view their team.
 * Employee can only view their own.
 */
export function canViewAttendance(
  viewerRole: string,
  viewerId: string,
  targetRole: string,
  targetManagerId?: string
): boolean {
  const normalizedViewer = normalizeRole(viewerRole);
  const normalizedTarget = normalizeRole(targetRole);

  // Super Admin can see everything
  if (normalizedViewer === "super_admin") return true;

  // HR Admin can see all employees and managers
  if (normalizedViewer === "hr_admin" || normalizedViewer === "admin") {
    return normalizedTarget !== "super_admin";
  }

  // Manager can see their team (employees only)
  if (normalizedViewer === "manager") {
    return normalizedTarget === "employee" && targetManagerId === viewerId;
  }

  // Employee can only see their own
  return false;
}

/**
 * Get the display label for escalation level.
 */
export function getEscalationLabel(level: EscalationLevel): string {
  switch (level) {
    case "none":
      return "Self (No Escalation)";
    case "manager_hr":
      return "Manager + HR";
    case "super_admin":
      return "Super Admin";
    default:
      return "Unknown";
  }
}
