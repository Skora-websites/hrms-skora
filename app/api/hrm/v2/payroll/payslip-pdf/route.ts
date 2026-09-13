import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getEmployeePayrollTransactions } from "@/services/hrm/payroll";
import { getDb } from "@/lib/db/mongo-helper";
import { generatePayslipPdf } from "@/lib/payslip-pdf";

/**
 * GET /api/hrm/v2/payroll/payslip-pdf?id=xxx
 * Renders a payroll transaction as a payslip PDF. Employees can only fetch
 * their own; admins can fetch any transaction's payslip.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id parameter required" }, { status: 400 });

    const tenantId = "default";
    let tx: any = null;

    if (auth.role === "employee") {
      const own = await getEmployeePayrollTransactions(tenantId, auth.userId);
      tx = own.find((t: any) => t.id === id);
      if (!tx) return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
    } else {
      const db = await getDb();
      if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });
      tx = await db.collection("payroll_transactions").findOne({ _id: new (require("mongodb").ObjectId)(id) });
      if (!tx) return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
    }

    const db = await getDb();
    const settingsDoc = db ? await db.collection("settings").findOne({ key: "offer_letter_config" }) : null;
    const cfg = settingsDoc?.settings || {};

    const pdf = await generatePayslipPdf(
      {
        userName: tx.userName || "Employee",
        userEmail: tx.userEmail,
        employeeCode: tx.employeeCode,
        department: tx.department,
        designation: tx.designation,
        periodStart: tx.periodStart,
        periodEnd: tx.periodEnd,
        grossPay: tx.grossPay || 0,
        netPay: tx.netPay || 0,
        earnings: tx.earnings,
        deductions: tx.deductions,
        status: tx.status,
      },
      cfg
    );

    return new NextResponse(new Uint8Array(pdf.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdf.filename}"`,
      },
    });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/payroll/payslip-pdf error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
