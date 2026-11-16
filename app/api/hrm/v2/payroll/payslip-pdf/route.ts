import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getEmployeePayrollTransactions } from "@/services/hrm/payroll";
import { getDb } from "@/lib/db/mongo-helper";
import { ObjectId } from "@/lib/db/mysql";
import { generatePayslipPdf } from "@/lib/payslip-pdf";

async function isDirectReport(managerId: string, employeeId: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const employee = await db.collection("users").findOne({ _id: new ObjectId(employeeId) });
    const rm = (employee as any)?.reportingManager;
    if (!rm) return false;
    if (rm === managerId) return true;
    const manager = await db.collection("users").findOne({ _id: new ObjectId(managerId) });
    return !!manager && rm === (manager as any).displayName;
  } catch {
    return false;
  }
}

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

    // Non-CEO callers are limited to the last three months of payroll
    // history, including individual payslip downloads.
    const threeMonthWindow = auth.role !== "super_admin";
    const cutoff = new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1);

    if (auth.role === "employee") {
      const own = await getEmployeePayrollTransactions(tenantId, auth.userId);
      tx = own.find((t: any) => t.id === id);
      if (!tx) return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
    } else {
      const db = await getDb();
      if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });
      if (!ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid payslip ID" }, { status: 400 });
      }
      tx = await db.collection("payroll_transactions").findOne({ _id: new ObjectId(id) });
      if (!tx) return NextResponse.json({ error: "Payslip not found" }, { status: 404 });

      // IDOR guard: Managers may only download their own payslip or their direct reports' payslips
      if (auth.role === "manager") {
        const txUserId = String(tx.userId || "");
        if (txUserId !== auth.userId && !(await isDirectReport(auth.userId, txUserId))) {
          return NextResponse.json({ error: "Forbidden: you can only view your direct reports' payslips" }, { status: 403 });
        }
      }
    }
    if (threeMonthWindow && tx.createdAt && new Date(tx.createdAt) < cutoff) {
      return NextResponse.json({ error: "Payslips older than three months are available from HR" }, { status: 403 });
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
