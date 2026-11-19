import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { saveAnswerDraft } from "@/services/hrm/tests/attempt-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { id: attemptId } = await context.params;
    const body = await request.json();

    if (!body.questionId) {
      return NextResponse.json({ error: "questionId is required" }, { status: 400 });
    }

    await saveAnswerDraft(
      auth.tenantId,
      attemptId,
      body.questionId,
      {
        selectedOptions: body.selectedOptions || [],
        descriptiveText: body.descriptiveText || "",
      },
      auth.userId
    );

    return NextResponse.json({ success: true, savedAt: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save answer draft" },
      { status: 400 }
    );
  }
}
