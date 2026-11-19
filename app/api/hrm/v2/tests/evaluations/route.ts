import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import {
  getPendingEvaluations,
  gradeDescriptiveAnswer,
  finalizeEvaluation,
} from "@/services/hrm/tests/evaluation-service";
import { getDb, ObjectId } from "@/lib/db/mysql";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    if (auth.role === "employee") {
      return NextResponse.json(
        { error: "Forbidden: Only managers and administrators can evaluate tests" },
        { status: 403 }
      );
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const userDoc = await db.collection("users").findOne({
      _id: ObjectId.isValid(auth.userId) ? new ObjectId(auth.userId) : auth.userId,
    });
    const userDept = userDoc?.department || userDoc?.departmentName || "";

    const list = await getPendingEvaluations(auth.tenantId, {
      userId: auth.userId,
      role: auth.role,
      department: userDept,
    });

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch pending evaluations" },
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
        { error: "Forbidden: Only managers and administrators can grade tests" },
        { status: 403 }
      );
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const userDoc = await db.collection("users").findOne({
      _id: ObjectId.isValid(auth.userId) ? new ObjectId(auth.userId) : auth.userId,
    });
    const userName = userDoc?.displayName || userDoc?.name || "Evaluator";
    const userDept = userDoc?.department || userDoc?.departmentName || "";

    const body = await request.json();
    const { action, attemptId } = body;

    if (!attemptId) {
      return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
    }

    if (action === "grade_question") {
      if (!body.questionId || body.marksAwarded === undefined) {
        return NextResponse.json(
          { error: "questionId and marksAwarded are required" },
          { status: 400 }
        );
      }

      await gradeDescriptiveAnswer(
        auth.tenantId,
        {
          attemptId,
          questionId: body.questionId,
          marksAwarded: Number(body.marksAwarded),
          feedback: body.feedback,
        },
        {
          userId: auth.userId,
          userName,
          role: auth.role,
        }
      );

      return NextResponse.json({ success: true, message: "Question grade recorded" });
    } else if (action === "finalize") {
      const result = await finalizeEvaluation(auth.tenantId, attemptId, {
        userId: auth.userId,
        userName,
        role: auth.role,
        department: userDept,
      });

      return NextResponse.json({
        success: true,
        message: "Attempt evaluated and result released",
        data: result,
      });
    }

    return NextResponse.json({ error: "Invalid action. Use 'grade_question' or 'finalize'" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process evaluation" },
      { status: 500 }
    );
  }
}
