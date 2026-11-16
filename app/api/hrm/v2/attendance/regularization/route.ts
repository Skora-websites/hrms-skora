import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest } from "@/lib/api-handler";
import { getRegularizationRequests, createRegularizationRequest } from "@/services/hrm/attendance";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as never;
  const requestedUserId = searchParams.get("userId") || undefined;
  const userId = auth.role === "employee" ? auth.userId : requestedUserId;
  let rows = await getRegularizationRequests(auth.tenantId, userId, status);

  if (auth.role === "manager") {
    const { getDb } = await import("@/lib/db/mongo-helper");
    const { ObjectId } = await import("@/lib/db/mysql");
    const db = await getDb();
    if (db) {
      const mgr = await db.collection("users").findOne({ _id: new ObjectId(auth.userId) });
      const dept = mgr?.department || mgr?.departmentName;
      const deptUsers = dept ? await db.collection("users").find({
        $or: [{ department: dept }, { departmentName: dept }, { reportingManager: auth.userId }, ...(mgr?.displayName ? [{ reportingManager: mgr.displayName }] : [])],
      }).project({ _id: 1 }).toArray() : [];
      const allowedIds = new Set([auth.userId, ...deptUsers.map((u: any) => u._id.toString())]);
      rows = rows.filter((r: any) => allowedIds.has(String(r.userId)));
    }
  }

  return NextResponse.json({ data: rows });
}, { label: "Regularization List" });

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;
  const body = await request.json();
  if (!body.date || !body.reason) return badRequest("date and reason are required");
  const row = await createRegularizationRequest(auth.tenantId, {
    userId: auth.userId,
    attendanceId: body.attendanceId || "",
    type: body.type || "full_day",
    date: body.date,
    reason: body.reason,
    requestedCheckIn: body.requestedCheckIn,
    requestedCheckOut: body.requestedCheckOut,
  } as any);
  return NextResponse.json({ data: row }, { status: 201 });
}, { label: "Regularization Create" });
