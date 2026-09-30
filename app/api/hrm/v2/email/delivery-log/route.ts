import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/api-auth";
import { getEmailDeliveryLog } from "@/lib/email-delivery-log";

/**
 * HR/CEO-visible outbound email delivery history (welcome, payslip, reset).
 * GET-only, admin-gated, metadata rows only.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 100);
    const rows = await getEmailDeliveryLog(limit);
    return NextResponse.json({ data: rows });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/email/delivery-log error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
