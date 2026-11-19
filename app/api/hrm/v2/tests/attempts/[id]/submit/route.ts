import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { submitAttempt } from "@/services/hrm/tests/attempt-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { id: attemptId } = await context.params;

    const result = await submitAttempt(
      auth.tenantId,
      attemptId,
      auth.userId
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to submit attempt" },
      { status: 400 }
    );
  }
}
