import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { logViolation } from "@/services/hrm/tests/attempt-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { id: attemptId } = await context.params;
    const body = await request.json();
    const reason = body.reason || "Window focus lost / tab switched";

    const result = await logViolation(
      auth.tenantId,
      attemptId,
      reason,
      auth.userId
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to log proctoring violation" },
      { status: 400 }
    );
  }
}
