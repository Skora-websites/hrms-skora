import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongo-helper";
import {
  getPayGroups,
  createPayGroup,
  updatePayGroup,
  getPayrollRuns,
  getPayrollRunById,
  processPayroll,
  getPayrollDashboard,
  getPayrollTransactions,
  getEmployeePayrollTransactions,
  getSalaryComponents,
  createSalaryComponent,
  updateSalaryComponent,
  markPayrollTransactionPaid,
} from "@/services/hrm/payroll";
import { requireAuth, requireAdmin, isErrorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");
    const userId = searchParams.get("userId");
    const payGroupId = searchParams.get("payGroupId");
    const dashboard = searchParams.get("dashboard");

    // Payroll is admin+ only (except employees viewing their own transactions)
    if (auth.role === "employee") {
      if (type === "transactions" && userId === auth.userId) {
        const transactions = await getEmployeePayrollTransactions(tenantId, userId);
        return NextResponse.json({ data: transactions });
      }
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    if (dashboard === "true") {
      const dashData = await getPayrollDashboard(tenantId);
      return NextResponse.json({ data: dashData });
    }

    if (type === "runs") {
      if (id) {
        const run = await getPayrollRunById(id);
        if (!run) {
          return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
        }
        return NextResponse.json({ data: run });
      }
      const runs = await getPayrollRuns(tenantId, payGroupId || undefined);
      return NextResponse.json({ data: runs });
    }

    if (type === "transactions") {
      if (userId) {
        const transactions = await getEmployeePayrollTransactions(tenantId, userId);
        return NextResponse.json({ data: transactions });
      }
      if (id) {
        const transactions = await getPayrollTransactions(id);
        return NextResponse.json({ data: transactions });
      }
    }

    if (type === "components") {
      const components = await getSalaryComponents(tenantId);
      return NextResponse.json({ data: components });
    }

    if (type === "pay-groups") {
      const groups = await getPayGroups(tenantId);
      return NextResponse.json({ data: groups });
    }

    const payGroups = await getPayGroups(tenantId);
    return NextResponse.json({ data: payGroups });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/payroll error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const body = await request.json();
    const action = body.action;
    const type = body.type;

    let result;

    if (action === "process") {
      result = await processPayroll(
        tenantId,
        body.payGroupId,
        new Date(body.periodStart),
        new Date(body.periodEnd),
        body.processedBy
      );
      return NextResponse.json({ data: result }, { status: 201 });
    }

    if (type === "pay-group") {
      result = await createPayGroup(tenantId, body);
    } else if (type === "component") {
      result = await createSalaryComponent(tenantId, body);
    } else {
      return NextResponse.json({ error: "Invalid type. Use: pay-group, component" }, { status: 400 });
    }

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/payroll error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    const body = await request.json();
    const type = body.type;

    let result;
    if (body.action === "mark_paid") {
      // Mark a payroll transaction paid and email the payslip PDF to the
      // employee using the shared SMTP transport (best-effort).
      const tx = await markPayrollTransactionPaid(id);
      if (!tx) return NextResponse.json({ error: "Record not found" }, { status: 404 });

      try {
        const db = await getDb();
        const t = tx as any;
        if (db && t.userEmail) {
          const settingsDoc = await db.collection("settings").findOne({ key: "offer_letter_config" });
          const cfg = settingsDoc?.settings || {};
          if (cfg.autoEmailOnRelease !== false) {
            const { generatePayslipPdf } = await import("@/lib/payslip-pdf");
            const { sendPayslipEmail } = await import("@/lib/email");
            const start = new Date(t.periodStart);
            const end = new Date(t.periodEnd);
            const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const periodLabel = start.getMonth() === end.getMonth()
              ? `${MONTHS[start.getMonth()]} ${start.getFullYear()}`
              : `${MONTHS[start.getMonth()]} – ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
            const pdf = await generatePayslipPdf(
              {
                userName: t.userName || "Employee",
                userEmail: t.userEmail,
                employeeCode: t.employeeCode,
                department: t.department,
                designation: t.designation,
                periodStart: t.periodStart,
                periodEnd: t.periodEnd,
                grossPay: t.grossPay || 0,
                netPay: t.netPay || 0,
                earnings: t.earnings,
                deductions: t.deductions,
                status: "paid",
              },
              cfg
            );
            const sent = await sendPayslipEmail({
              to: t.userEmail,
              employeeName: t.userName || "Employee",
              periodLabel,
              netPay: t.netPay || 0,
              companyName: cfg.companyName || "SKORA",
              pdfAttachment: { filename: pdf.filename, content: pdf.buffer },
            });
            const { ObjectId } = await import("mongodb");
            await db.collection("payroll_transactions").updateOne(
              { _id: ObjectId.isValid(id) ? new ObjectId(id) : (id as any) },
              { $set: { emailSent: sent === true, emailSentAt: sent ? new Date() : null } }
            );
          }
        }
      } catch (emailErr) {
        console.warn("Payslip email failed (payment itself succeeded):", emailErr);
      }

      return NextResponse.json({ data: tx });
    }
    if (type === "component") {
      result = await updateSalaryComponent(id, body);
    } else if (type === "pay-group") {
      result = await updatePayGroup(id, body);
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    if (!result) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error("PATCH /api/hrm/v2/payroll error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
