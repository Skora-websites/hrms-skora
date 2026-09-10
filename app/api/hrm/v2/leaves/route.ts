import { NextRequest, NextResponse } from "next/server";
import {
  getLeaveRequests,
  getLeaveRequestById,
  applyLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getLeaveDashboard,
  getLeavePlans,
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  getLeaveBalances,
} from "@/services/hrm/leave";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const planId = searchParams.get("planId");
    const dashboard = searchParams.get("dashboard");

    if (dashboard === "true") {
      if (auth.role === "employee") {
        return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
      }
      const dashData = await getLeaveDashboard(tenantId);
      return NextResponse.json({ data: dashData });
    }

    if (type === "balances" && userId) {
      if (auth.role === "employee" && userId !== auth.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const balances = await getLeaveBalances(tenantId, userId);
      return NextResponse.json({ data: balances });
    }

    if (type === "plans") {
      const plans = await getLeavePlans(tenantId);
      return NextResponse.json({ data: plans });
    }

    if (type === "types") {
      const types = await getLeaveTypes(tenantId, planId || undefined);
      return NextResponse.json({ data: types });
    }

    if (id) {
      const requestData = await getLeaveRequestById(id);
      if (!requestData) {
        return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
      }
      return NextResponse.json({ data: requestData });
    }

    const requests = await getLeaveRequests(tenantId, {
      userId: userId || undefined,
      status: status as any || undefined,
    });

    // Employees can only view their own leave requests
    if (auth.role === "employee") {
      const filtered = requests.filter((r) => r.userId === auth.userId);
      return NextResponse.json({ data: filtered });
    }

    return NextResponse.json({ data: requests });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/leaves error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const body = await request.json();
    const action = body.action;

    if (action === "apply") {
      // Employees can only apply for themselves
      const userId = body.userId === "current" ? auth.userId : (body.userId || auth.userId);
      const result = await applyLeave(tenantId, {
        userId: userId,
        leaveTypeId: body.leaveTypeId,
        fromDate: new Date(body.fromDate),
        toDate: new Date(body.toDate),
        reason: body.reason,
        attachmentURL: body.attachmentURL,
      });
      return NextResponse.json({ data: result }, { status: 201 });
    }

    if (action === "approve" || action === "reject") {
      if (auth.role === "employee") {
        return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
      }
      if (action === "approve") {
        const result = await approveLeave(body.id, body.approvedById);
        if (!result) {
          return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
        }
        return NextResponse.json({ data: result });
      } else {
        const result = await rejectLeave(body.id, body.approvedById, body.reason);
        if (!result) {
          return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
        }
        return NextResponse.json({ data: result });
      }
    }

    if (action === "cancel") {
      const result = await cancelLeave(body.id);
      if (!result) {
        return NextResponse.json({ error: "Leave request not found or cannot be cancelled" }, { status: 400 });
      }
      return NextResponse.json({ data: result });
    }

    // ── Leave Type CRUD ──────────────────────────────────
    if (action === "create_type") {
      const { id: _id, tenantId: _t, createdAt: _c, updatedAt: _u, deletedAt: _d, ...data } = body;
      const result = await createLeaveType(tenantId, data as any);
      return NextResponse.json({ data: result }, { status: 201 });
    }

    if (action === "update_type") {
      const { id, action: _a, ...data } = body;
      const result = await updateLeaveType(id, data as any);
      if (!result) {
        return NextResponse.json({ error: "Leave type not found" }, { status: 404 });
      }
      return NextResponse.json({ data: result });
    }

    if (action === "delete_type") {
      const success = await deleteLeaveType(body.id);
      if (!success) {
        return NextResponse.json({ error: "Leave type not found" }, { status: 404 });
      }
      return NextResponse.json({ data: { success: true } });
    }

    return NextResponse.json({ error: "Invalid action. Use: apply, approve, reject, cancel, create_type, update_type, delete_type" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/leaves error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
