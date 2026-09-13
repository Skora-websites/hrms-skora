import { NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getEmployeePayrollTransactions } from "@/services/hrm/payroll";
import { getEmployeeExits } from "@/services/hrm/exit";
import { getDb } from "@/lib/db/mongo-helper";

export interface MyDocument {
  id: string;
  category: "offer_letter" | "payslip" | "experience_letter" | "verification";
  title: string;
  subtitle: string;
  date: string;
  status: string;
  downloadable: boolean;
  downloadUrl: string | null;
  downloadLabel: string;
  note?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * GET /api/hrm/v2/documents/my
 * Everything the signed-in employee can download in one call:
 *  - released offer letters (PDF via the download endpoint)
 *  - payslips (PDF via the payslip-pdf endpoint)
 *  - experience letters (PDF via the exit experience-letter endpoint)
 *  - uploaded verification documents (stored data URLs)
 */
export async function GET() {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";
    const docs: MyDocument[] = [];
    const db = await getDb();

    // ── 1. Offer letters (released only) ──
    if (db) {
      const letters = await db
        .collection("offerLetters")
        .find({ userId: auth.userId, status: "released" })
        .sort({ releasedAt: -1, createdAt: -1 })
        .toArray();
      for (const l of letters) {
        docs.push({
          id: `offer-${l._id}`,
          category: "offer_letter",
          title: "Offer Letter",
          subtitle: l.designation || l.department || "Employment offer",
          date: (l.releasedAt || l.createdAt || new Date()).toString(),
          status: "Released",
          downloadable: true,
          downloadUrl: `/api/hrm/v2/offer-letters/download?id=${l._id}`,
          downloadLabel: "Download (password-protected)",
          note: "Password is shown in the offer email",
        });
      }
    }

    // ── 2. Payslips ──
    try {
      const transactions = await getEmployeePayrollTransactions(tenantId, auth.userId);
      for (const t of transactions as any[]) {
        const start = t.periodStart ? new Date(t.periodStart) : null;
        const end = t.periodEnd ? new Date(t.periodEnd) : null;
        const periodLabel =
          start && end && start.getMonth() === end.getMonth()
            ? `${MONTHS[start.getMonth()]} ${start.getFullYear()}`
            : start
              ? `${MONTHS[start.getMonth()]} ${start.getFullYear()}`
              : "Payroll period";
        docs.push({
          id: `payslip-${t.id || t._id}`,
          category: "payslip",
          title: `Payslip — ${periodLabel}`,
          subtitle: `Net pay: Rs. ${Number(t.netPay || 0).toLocaleString("en-IN")}`,
          date: (t.periodEnd || t.createdAt || new Date()).toString(),
          status: (t.status || "completed").toLowerCase() === "paid" ? "Paid" : "Processed",
          downloadable: true,
          downloadUrl: `/api/hrm/v2/payroll/payslip-pdf?id=${t.id || t._id}`,
          downloadLabel: "Download PDF",
        });
      }
    } catch {
      // Payroll module unavailable — skip payslips without failing the hub.
    }

    // ── 3. Experience letters (completed exits) ──
    try {
      const exits = await getEmployeeExits(tenantId);
      const mine = exits.filter((e: any) => e.userId === auth.userId);
      for (const ex of mine) {
        const lwd = ex.lastWorkingDate ? new Date(ex.lastWorkingDate) : null;
        const completed = ex.status === "completed";
        docs.push({
          id: `experience-${ex.id || (ex as any)._id}`,
          category: "experience_letter",
          title: "Experience Letter",
          subtitle: lwd ? `Last working day: ${lwd.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}` : "Exit record",
          date: (ex.updatedAt || ex.createdAt || new Date()).toString(),
          status: completed ? "Available" : `Exit ${ex.status?.replace(/_/g, " ") || "in progress"}`,
          downloadable: completed,
          downloadUrl: completed ? `/api/hrm/v2/exit/experience-letter?id=${ex.id || (ex as any)._id}` : null,
          downloadLabel: "Download PDF",
          note: completed ? undefined : "Issued automatically once your exit is completed",
        });
      }
    } catch {
      // Exit module unavailable — skip.
    }

    // ── 4. Verification documents (registration / profile uploads) ──
    if (db) {
      const verifications = await db
        .collection("employee_onboarding_tasks")
        .find({ userId: auth.userId, documentName: { $exists: true, $ne: null } })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(10)
        .toArray();
      const seen = new Set<string>();
      for (const v of verifications) {
        const doc: any = v;
        if (!doc.documentName || seen.has(doc.documentName)) continue;
        seen.add(doc.documentName);
        const status = doc.status === "approved" ? "Approved" : doc.status === "rejected" ? "Rejected" : "Under review";
        docs.push({
          id: `verification-${doc._id}`,
          category: "verification",
          title: doc.documentName,
          subtitle: doc.title || "Onboarding verification document",
          date: (doc.updatedAt || doc.createdAt || new Date()).toString(),
          status,
          downloadable: Boolean(doc.documentUrl),
          downloadUrl: doc.documentUrl || null, // stored data URL
          downloadLabel: "Download file",
        });
      }
    }

    docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ data: docs });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/documents/my error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
