import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getResults, getResultById } from "@/services/hrm/tests/result-service";
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
    const id = searchParams.get("id");
    const testId = searchParams.get("testId") || undefined;
    const search = searchParams.get("search") || undefined;

    if (id) {
      const result = await getResultById(auth.tenantId, id, {
        userId: auth.userId,
        role: auth.role,
        department: userDept,
      });

      if (!result) {
        return NextResponse.json({ error: "Result not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: result });
    }

    const results = await getResults(
      auth.tenantId,
      {
        userId: auth.userId,
        role: auth.role,
        department: userDept,
      },
      { testId, search }
    );

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    const status = error.message?.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to fetch test results" },
      { status }
    );
  }
}
