import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getTestById, updateTest, deleteTest } from "@/services/hrm/tests/test-service";
import { getQuestions } from "@/services/hrm/tests/question-service";
import { getDb, ObjectId } from "@/lib/db/mysql";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Test ID required" }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const userDoc = await db.collection("users").findOne({
      _id: ObjectId.isValid(auth.userId) ? new ObjectId(auth.userId) : auth.userId,
    });
    const userDept = userDoc?.department || userDoc?.departmentName || "";

    const test = await getTestById(auth.tenantId, id, {
      userId: auth.userId,
      role: auth.role,
      department: userDept,
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Hydrate questions
    const allQuestions = await getQuestions(auth.tenantId);
    const qMap = new Map(allQuestions.map((q) => [q.id, q]));
    const isEmployee = auth.role === "employee";

    const questions = (test.questionIds || [])
      .map((qId) => qMap.get(qId))
      .filter(Boolean)
      .map((q: any) => {
        // Strip answer key for students/employees to prevent inspecting network payload
        if (isEmployee) {
          const { correctOptions, referenceAnswer, ...safeQ } = q;
          return safeQ;
        }
        return q;
      });

    return NextResponse.json({
      success: true,
      data: {
        ...test,
        questions,
      },
    });
  } catch (error: any) {
    const status = error.message?.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to fetch test" },
      { status }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    if (auth.role === "employee") {
      return NextResponse.json(
        { error: "Forbidden: Only managers and administrators can edit tests" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const userDoc = await db.collection("users").findOne({
      _id: ObjectId.isValid(auth.userId) ? new ObjectId(auth.userId) : auth.userId,
    });
    const userDept = userDoc?.department || userDoc?.departmentName || "";

    const updated = await updateTest(
      auth.tenantId,
      id,
      body,
      {
        userId: auth.userId,
        role: auth.role,
        department: userDept,
      }
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    const status = error.message?.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to update test" },
      { status }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    if (auth.role === "employee") {
      return NextResponse.json(
        { error: "Forbidden: Only managers and administrators can delete tests" },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const userDoc = await db.collection("users").findOne({
      _id: ObjectId.isValid(auth.userId) ? new ObjectId(auth.userId) : auth.userId,
    });
    const userDept = userDoc?.department || userDoc?.departmentName || "";

    await deleteTest(auth.tenantId, id, {
      userId: auth.userId,
      role: auth.role,
      department: userDept,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error.message?.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to delete test" },
      { status }
    );
  }
}
