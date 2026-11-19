import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { createTest, getTests } from "@/services/hrm/tests/test-service";
import { getDb, ObjectId } from "@/lib/db/mysql";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const userDoc = await db.collection("users").findOne({
      _id: ObjectId.isValid(auth.userId) ? new ObjectId(auth.userId) : auth.userId,
    });
    const userDept = userDoc?.department || userDoc?.departmentName || "";

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as any;
    const search = searchParams.get("search") || "";

    const tests = await getTests(
      auth.tenantId,
      {
        userId: auth.userId,
        role: auth.role,
        department: userDept,
      },
      { status, search }
    );

    return NextResponse.json({ success: true, data: tests });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch tests" },
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
        { error: "Forbidden: Only managers and administrators can author tests" },
        { status: 403 }
      );
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const body = await request.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Test title is required" }, { status: 400 });
    }
    if (!body.questionIds || body.questionIds.length === 0) {
      return NextResponse.json({ error: "Select at least one question for the test" }, { status: 400 });
    }

    const userDoc = await db.collection("users").findOne({
      _id: ObjectId.isValid(auth.userId) ? new ObjectId(auth.userId) : auth.userId,
    });
    const userName = userDoc?.displayName || userDoc?.name || "Staff";
    const userDept = userDoc?.department || userDoc?.departmentName || "";

    const test = await createTest(
      auth.tenantId,
      {
        title: body.title.trim(),
        description: body.description || "",
        department: body.department || userDept,
        category: body.category || "General",
        durationMinutes: Number(body.durationMinutes || 30),
        passPercentage: Number(body.passPercentage || 60),
        questionIds: body.questionIds,
        assignedUserIds: body.assignedUserIds || [],
        assignedDepartment: body.assignedDepartment || body.department || "",
        plannedDate: body.plannedDate,
        proctoring: body.proctoring,
      },
      {
        userId: auth.userId,
        userName,
        role: auth.role,
        department: userDept,
      }
    );

    return NextResponse.json({ success: true, data: test }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create test" },
      { status: 500 }
    );
  }
}
