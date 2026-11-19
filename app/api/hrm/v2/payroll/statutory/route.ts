import { NextRequest, NextResponse } from "next/server";
import {
  getStatutoryConfig,
  updateStatutoryConfig,
  compareTaxRegimes,
  getEmployeeTaxDeclaration,
  submitEmployeeTaxDeclaration,
  verifyTaxDeclaration,
  generateDisbursementBatch,
  getDisbursementBatches,
  calculateDynamicTDS,
  calculateEarnedSalary,
  calculatePF,
  calculateESI,
  calculatePT,
  validateEmployeeBankDetails,
  reconcileDisbursementBatch,
} from "@/services/hrm/payroll/statutory";
import { requireAuth, requireHrLevel, isErrorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "config") {
      const config = await getStatutoryConfig(tenantId);
      return NextResponse.json({ data: config });
    }

    if (type === "compare") {
      const annualGross = Number(searchParams.get("annualGross") || 600000);
      const basic = Number(searchParams.get("basic") || annualGross * 0.5);
      const hra = Number(searchParams.get("hra") || annualGross * 0.2);
      const comparison = compareTaxRegimes(annualGross, basic, hra);
      return NextResponse.json({ data: comparison });
    }

    if (type === "declaration") {
      const targetUserId = searchParams.get("userId") || auth.userId;
      if (auth.role === "employee" && targetUserId !== auth.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const fy = searchParams.get("financialYear") || "2026-2027";
      const declaration = await getEmployeeTaxDeclaration(tenantId, targetUserId!, fy);
      return NextResponse.json({ data: declaration });
    }

    if (type === "batches") {
      const isPrivileged = ["super_admin", "hr_admin", "admin", "finance_admin"].includes(auth.role || "");
      if (!isPrivileged) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const batches = await getDisbursementBatches(tenantId);
      return NextResponse.json({ data: batches });
    }

    const config = await getStatutoryConfig(tenantId);
    return NextResponse.json({ data: config });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/payroll/statutory error:", error);
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

    if (action === "update-config") {
      const isPrivileged = ["super_admin", "hr_admin", "admin", "finance_admin"].includes(auth.role || "");
      if (!isPrivileged) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const updated = await updateStatutoryConfig(tenantId, body.config || body);
      return NextResponse.json({ data: updated });
    }

    if (action === "submit-declaration") {
      const targetUserId = body.userId || auth.userId;
      if (auth.role === "employee" && targetUserId !== auth.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const submitted = await submitEmployeeTaxDeclaration(tenantId, targetUserId, body);
      return NextResponse.json({ data: submitted }, { status: 201 });
    }

    if (action === "verify-declaration") {
      const isPrivileged = ["super_admin", "hr_admin", "admin", "finance_admin"].includes(auth.role || "");
      if (!isPrivileged) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (!body.id || !body.status) {
        return NextResponse.json({ error: "id and status are required" }, { status: 400 });
      }
      const verified = await verifyTaxDeclaration(body.id, body.verifiedBy || auth.userId || "Finance Admin", body.status);
      return NextResponse.json({ data: verified });
    }

    if (action === "generate-batch") {
      const isPrivileged = ["super_admin", "hr_admin", "admin", "finance_admin"].includes(auth.role || "");
      if (!isPrivileged) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (!body.periodMonth) {
        return NextResponse.json({ error: "periodMonth (YYYY-MM) is required" }, { status: 400 });
      }
      const batchResult = await generateDisbursementBatch(
        tenantId,
        body.periodMonth,
        body.bankFormat || "STANDARD_NEFT",
        body.generatedBy || auth.userId || "HR Admin",
        { forceRegenerate: Boolean(body.forceRegenerate) }
      );
      return NextResponse.json({ data: batchResult }, { status: 201 });
    }

    if (action === "reconcile-batch") {
      const isPrivileged = ["super_admin", "hr_admin", "admin", "finance_admin"].includes(auth.role || "");
      if (!isPrivileged) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (!body.batchId || !Array.isArray(body.records)) {
        return NextResponse.json({ error: "batchId and records array are required" }, { status: 400 });
      }
      const result = await reconcileDisbursementBatch(tenantId, body.batchId, body.records);
      return NextResponse.json({ data: result });
    }

    if (action === "calculate-tds") {
      const result = calculateDynamicTDS(body);
      return NextResponse.json({ data: result });
    }

    if (action === "calculate-earned") {
      const result = calculateEarnedSalary(body);
      return NextResponse.json({ data: result });
    }

    if (action === "validate-bank") {
      const result = validateEmployeeBankDetails(body);
      return NextResponse.json({ data: result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/payroll/statutory error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
