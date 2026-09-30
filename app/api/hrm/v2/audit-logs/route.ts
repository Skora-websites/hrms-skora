import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler } from "@/lib/api-handler";
import { getAuditLogs } from "@/services/hrm/audit";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;
  // Audit logs expose security-relevant events — HR-level and above only.
  // Managers must not see org-wide audit history; the CEO page is the
  // only consumer in the UI (nav-gated to super_admin).
  if (!["super_admin", "hr_admin", "admin"].includes(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit")) || 50;
  const logs = await getAuditLogs(auth.tenantId, { limit });
  return NextResponse.json({ data: logs });
}, { label: "AuditLogs List" });
