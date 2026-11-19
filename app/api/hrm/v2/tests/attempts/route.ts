import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { startAttempt, getAttemptById } from "@/services/hrm/tests/attempt-service";
import { getDb, ObjectId } from "@/lib/db/mysql";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get("attemptId");

    if (!attemptId) {
      return NextResponse.json({ error: "attemptId required" }, { status: 400 });
    }

    // Only allow candidate to view own attempt unless manager/admin
    const isStaff = auth.role === "super_admin" || auth.role === "hr_admin" || auth.role === "admin" || auth.role === "manager";
    const attempt = await getAttemptById(
      auth.tenantId,
      attemptId,
      isStaff ? undefined : auth.userId
    );

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: attempt });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch attempt" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    if (
      auth.role === "manager" ||
      auth.role === "admin" ||
      auth.role === "super_admin" ||
      auth.role === "hr_admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Managers and administrators cannot take tests. Assessments are created and reviewed by managers, and attempted by team members.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    if (!body.testId) {
      return NextResponse.json({ error: "testId is required" }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const userDoc = await db.collection("users").findOne({
      _id: ObjectId.isValid(auth.userId) ? new ObjectId(auth.userId) : auth.userId,
    });
    const userName = userDoc?.displayName || userDoc?.name || "Candidate";
    const userEmail = userDoc?.email || "";
    const userDept = userDoc?.department || userDoc?.departmentName || "General";

    const attempt = await startAttempt(auth.tenantId, body.testId, {
      userId: auth.userId,
      userName,
      userEmail,
      department: userDept,
    });

    return NextResponse.json({ success: true, data: attempt });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to start test attempt" },
      { status: 400 }
    );
  }
}
