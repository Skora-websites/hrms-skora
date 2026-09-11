import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest } from "@/lib/api-handler";
import { getRegularizationRequests, createRegularizationRequest } from "@/services/hrm/attendance";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as never;
  const userId = auth.role === "employee" ? auth.userId : searchParams.get("userId") || undefined;
  const rows = await getRegularizationRequests(auth.tenantId, userId, status);
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
