import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getTestCandidateProgress, grantRetake } from "@/services/hrm/tests/test-service";
import { getDb, ObjectId } from "@/lib/db/mysql";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    if (auth.role === "employee") {
      return NextResponse.json(
        { error: "Forbidden: Candidates cannot access management progress" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Assessment ID required" }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const userDoc = await db.collection("users").findOne({
      _id: ObjectId.isValid(auth.userId) ? new ObjectId(auth.userId) : auth.userId,
    });
    const userDept = userDoc?.department || userDoc?.departmentName || "";

    const candidates = await getTestCandidateProgress(auth.tenantId, id, {
      userId: auth.userId,
      role: auth.role,
      department: userDept,
    });

    return NextResponse.json({ success: true, data: candidates });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch candidate progress" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    if (auth.role === "employee") {
      return NextResponse.json(
        { error: "Forbidden: Only managers and admins can grant retakes" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    if (body.action === "grant_retake") {
      if (!body.userId) {
        return NextResponse.json({ error: "Target userId is required" }, { status: 400 });
      }

      const db = await getDb();
      if (!db) {
        return NextResponse.json({ error: "Database not available" }, { status: 503 });
      }

      const userDoc = await db.collection("users").findOne({
        _id: ObjectId.isValid(auth.userId) ? new ObjectId(auth.userId) : auth.userId,
      });
      const userDept = userDoc?.department || userDoc?.departmentName || "";

      const res = await grantRetake(auth.tenantId, id, body.userId, {
        userId: auth.userId,
        role: auth.role,
        department: userDept,
      });

      return NextResponse.json({ success: true, data: res });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process candidate retake request" },
      { status: 500 }
    );
  }
}
