import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest, forbidden, notFound } from "@/lib/api-handler";
import { getRegularizationRequests, createRegularizationRequest, reviewRegularizationRequest } from "@/services/hrm/attendance";

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

async function handleReview(request: NextRequest) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (auth.role === "employee") {
    return forbidden("Only managers and HR administrators can review regularization requests");
  }

  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Request body must be valid JSON");

  const id = body.id || body.requestId;
  if (!id) return badRequest("Regularization ID is required");

  const rawStatus = (body.status || body.action || "").toLowerCase();
  const decision: "approved" | "rejected" =
    rawStatus === "approved" || rawStatus === "approve"
      ? "approved"
      : rawStatus === "rejected" || rawStatus === "reject"
      ? "rejected"
      : ("" as any);

  if (!decision) {
    return badRequest("Valid status ('approved' or 'rejected') is required");
  }

  const notes = body.notes || body.reason || body.rejectionReason || (decision === "approved" ? "Approved by manager" : "Rejected");
  const updated = await reviewRegularizationRequest(id, decision, auth.userId, notes);

  if (!updated) {
    return notFound("Regularization request not found");
  }

  return NextResponse.json({
    success: true,
    data: updated,
    message: `Regularization request ${decision} successfully`,
  });
}

export const PUT = withErrorHandler(handleReview, { label: "Regularization Review PUT" });
export const PATCH = withErrorHandler(handleReview, { label: "Regularization Review PATCH" });

