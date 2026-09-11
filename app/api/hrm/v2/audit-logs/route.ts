import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler } from "@/lib/api-handler";
import { getAuditLogs } from "@/services/hrm/audit";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;
  if (auth.role === "employee") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit")) || 50;
  const logs = await getAuditLogs(auth.tenantId, { limit });
  return NextResponse.json({ data: logs });
}, { label: "AuditLogs List" });
