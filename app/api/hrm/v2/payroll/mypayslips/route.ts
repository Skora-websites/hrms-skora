import { NextRequest, NextResponse } from "next/server";
import { getEmployeePayrollTransactions } from "@/services/hrm/payroll";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";
    const transactions = await getEmployeePayrollTransactions(tenantId, auth.userId);

    const payslips = transactions.map((t: any) => {
      const pStart = t.periodStart ? new Date(t.periodStart) : new Date();
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      return {
        _id: t.id || t._id,
        id: t.id || t._id,
        payrollRunId: t.payrollRunId,
        month: monthNames[pStart.getMonth()],
        year: pStart.getFullYear(),
        periodStart: t.periodStart,
        periodEnd: t.periodEnd,
        grossPay: t.grossPay || 0,
        deductions: t.totalDeductions || t.deductionsAmount || 0,
        netPay: t.netPay || 0,
        earnings: t.earnings || {},
        deductionsDetail: t.deductions || {},
        status: t.status === "completed" ? "Paid" : (t.status || "Paid"),
        generatedAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
      };
    });

    return NextResponse.json({ data: payslips });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/payroll/mypayslips error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
