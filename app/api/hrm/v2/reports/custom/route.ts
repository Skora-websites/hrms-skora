import { NextRequest, NextResponse } from "next/server";
import {
  REPORT_DOMAINS_SCHEMA,
  getReportDefinitions,
  createReportDefinition,
  updateReportDefinition,
  deleteReportDefinition,
  executeCustomReport,
} from "@/services/hrm/reports/custom";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "schema") {
      return NextResponse.json({ data: REPORT_DOMAINS_SCHEMA });
    }

    const reports = await getReportDefinitions(tenantId);
    return NextResponse.json({ data: reports });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/reports/custom error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";
    const body = await request.json();
    const action = body.action;

    if (action === "execute") {
      const result = await executeCustomReport(tenantId, body.reportDef || body);
      return NextResponse.json({ data: result });
    }

    const isPrivileged = ["super_admin", "hr_admin", "admin", "manager", "auditor"].includes(auth.role || "");
    if (!isPrivileged) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (action === "save") {
      const saved = await createReportDefinition(tenantId, body);
      return NextResponse.json({ data: saved }, { status: 201 });
    }

    if (action === "update") {
      if (!body.id) return NextResponse.json({ error: "Report id is required" }, { status: 400 });
      const updated = await updateReportDefinition(body.id, body.data || body);
      return NextResponse.json({ data: updated });
    }

    if (action === "delete") {
      if (!body.id) return NextResponse.json({ error: "Report id is required" }, { status: 400 });
      const deleted = await deleteReportDefinition(body.id);
      return NextResponse.json({ success: deleted });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/reports/custom error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
