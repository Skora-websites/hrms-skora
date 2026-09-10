import "server-only";
import { auditLogsService } from "@/lib/hrm/firestore";
import type { AuditLog } from "@/types";

// ── Types ──────────────────────────────────────────────

export type AuditAction =
  | "create_user"
  | "update_user"
  | "delete_user"
  | "update_role"
  | "update_status"
  | "reset_password"
  | "login_disabled"
  | "login_enabled";

export interface CreateAuditLogInput {
  tenantId: string;
  action: AuditAction;
  performedById: string;
  performedByName: string;
  targetUserId: string;
  targetUserEmail: string;
  details: string;
  metadata?: Record<string, unknown>;
}

// ── Service Functions ─────────────────────────────────

/**
 * Record an audit log entry.
 */
export async function recordAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
  return auditLogsService.create({
    tenantId: input.tenantId,
    action: input.action,
    performedById: input.performedById,
    performedByName: input.performedByName,
    targetUserId: input.targetUserId,
    targetUserEmail: input.targetUserEmail,
    details: input.details,
    metadata: input.metadata || {},
  } as any);
}

/**
 * Get audit logs for a tenant, with optional user filter.
 */
export async function getAuditLogs(
  tenantId: string,
  options: {
    targetUserId?: string;
    limit?: number;
  } = {}
): Promise<AuditLog[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [];

  if (options.targetUserId) {
    where.push({ field: "targetUserId", op: "==", value: options.targetUserId });
  }

  return auditLogsService.findManyInTenant(tenantId, {
    where: where.length > 0 ? where : undefined,
    orderByField: "createdAt",
    orderByDirection: "desc",
    limitCount: options.limit || 50,
  });
}

/**
 * Get audit logs for a specific user (for display on user profile).
 */
export async function getAuditLogsForUser(
  tenantId: string,
  targetUserId: string,
  limit = 20
): Promise<AuditLog[]> {
  return getAuditLogs(tenantId, { targetUserId, limit });
}
