import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getQuestions, createQuestion } from "@/services/hrm/tests/question-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as any;
    const topic = searchParams.get("topic") || undefined;
    const status = searchParams.get("status") as any;
    const search = searchParams.get("search") || undefined;

    const questions = await getQuestions(auth.tenantId, {
      type,
      topic,
      status,
      search,
    });

    return NextResponse.json({ success: true, data: questions });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    if (auth.role === "employee") {
      return NextResponse.json(
        { error: "Forbidden: Only managers and administrators can add questions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    if (!body.text?.trim()) {
      return NextResponse.json({ error: "Question text is required" }, { status: 400 });
    }

    if (body.type === "MCQ" && (!body.options || body.options.length < 2)) {
      return NextResponse.json(
        { error: "MCQ questions must have at least 2 options" },
        { status: 400 }
      );
    }

    const question = await createQuestion(auth.tenantId, body, auth.userId);
    return NextResponse.json({ success: true, data: question }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create question" },
      { status: 500 }
    );
  }
}
