import { NextRequest, NextResponse } from "next/server";
import {
  getShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
  getShiftAssignments,
  assignEmployeeToShift,
  deleteShiftAssignment,
} from "@/services/hrm/attendance";
import {
  getShiftRosterGrid,
  batchAssignRoster,
  createShiftSwapRequest,
  respondPeerShiftSwap,
  approveManagerShiftSwap,
  getShiftSwapRequests,
} from "@/services/hrm/attendance/shifts";
import { requireAuth, requireHrLevel, isErrorResponse } from "@/lib/api-auth";

const DEFAULT_SHIFTS = [
  { name: "General Shift", startTime: "10:00", endTime: "19:00", gracePeriod: 30, flexibleDuration: false, halfDayMark: "14:30", color: "#3B82F6", status: "active" as const },
  { name: "Morning Shift", startTime: "07:00", endTime: "16:00", gracePeriod: 15, flexibleDuration: false, halfDayMark: "11:30", color: "#10B981", status: "active" as const },
  { name: "Evening Shift", startTime: "15:00", endTime: "00:00", gracePeriod: 15, flexibleDuration: false, halfDayMark: "19:30", color: "#F59E0B", status: "active" as const },
  { name: "Night Shift", startTime: "23:00", endTime: "08:00", gracePeriod: 15, flexibleDuration: false, halfDayMark: "03:30", color: "#8B5CF6", status: "active" as const },
];

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");
    const userId = searchParams.get("userId") || undefined;

    if (type === "roster") {
      const startDate = searchParams.get("startDate") || new Date().toISOString().slice(0, 10);
      const endDate = searchParams.get("endDate") || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const department = searchParams.get("department") || undefined;
      const roster = await getShiftRosterGrid(tenantId, startDate, endDate, department);
      return NextResponse.json({ data: roster });
    }

    if (type === "swaps") {
      const isManager = ["super_admin", "hr_admin", "admin", "manager"].includes(auth.role || "");
      const swaps = await getShiftSwapRequests(tenantId, userId || auth.userId, isManager);
      return NextResponse.json({ data: swaps });
    }

    if (type === "assignments") {
      const assignments = await getShiftAssignments(tenantId, userId);
      return NextResponse.json({ data: assignments });
    }

    if (id) {
      const shift = await getShiftById(id);
      if (!shift) {
        return NextResponse.json({ error: "Shift not found" }, { status: 404 });
      }
      return NextResponse.json({ data: shift });
    }

    let shifts = await getShifts(tenantId);
    if (!shifts || shifts.length === 0) {
      // Seed default shifts for the tenant
      await Promise.all(DEFAULT_SHIFTS.map((s) => createShift(tenantId, s)));
      shifts = await getShifts(tenantId);
    }

    return NextResponse.json({ data: shifts });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/shifts error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";
    const body = await request.json();

    // 1. Shift Swap actions (accessible to employees & managers)
    if (body.action === "swap-request") {
      if (!body.targetUserId || !body.shiftDate || !body.requesterShiftId) {
        return NextResponse.json({ error: "targetUserId, shiftDate, and requesterShiftId are required" }, { status: 400 });
      }
      const swap = await createShiftSwapRequest(tenantId, {
        requesterId: auth.userId || body.requesterId,
        requesterName: body.requesterName || "Employee",
        requesterShiftId: body.requesterShiftId,
        targetUserId: body.targetUserId,
        targetUserName: body.targetUserName || "Colleague",
        targetShiftId: body.targetShiftId,
        shiftDate: body.shiftDate,
        reason: body.reason || "Personal schedule adjustment",
      });
      return NextResponse.json({ data: swap }, { status: 201 });
    }

    if (body.action === "swap-peer-respond") {
      if (!body.swapId || !body.response) {
        return NextResponse.json({ error: "swapId and response ('accepted' | 'declined') are required" }, { status: 400 });
      }
      const updated = await respondPeerShiftSwap(body.swapId, auth.userId || body.peerUserId, body.response);
      return NextResponse.json({ data: updated });
    }

    if (body.action === "swap-manager-approve") {
      const isManager = ["super_admin", "hr_admin", "admin", "manager"].includes(auth.role || "");
      if (!isManager) {
        return NextResponse.json({ error: "Only managers or HR admins can approve swap requests" }, { status: 403 });
      }
      if (!body.swapId || !body.decision) {
        return NextResponse.json({ error: "swapId and decision ('approved' | 'rejected') are required" }, { status: 400 });
      }
      const updated = await approveManagerShiftSwap(
        body.swapId,
        auth.userId || "manager",
        body.managerName || "Manager",
        body.decision
      );
      return NextResponse.json({ data: updated });
    }

    // 2. Batch Roster assignment (HR / Manager level)
    if (body.action === "roster-batch") {
      const isPrivileged = ["super_admin", "hr_admin", "admin", "manager"].includes(auth.role || "");
      if (!isPrivileged) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      if (!Array.isArray(body.entries)) {
        return NextResponse.json({ error: "entries array required" }, { status: 400 });
      }
      const count = await batchAssignRoster(tenantId, body.entries);
      return NextResponse.json({ success: true, count }, { status: 201 });
    }

    // 3. Single employee shift assignment
    if (body.action === "assign") {
      const isPrivileged = ["super_admin", "hr_admin", "admin", "manager"].includes(auth.role || "");
      if (!isPrivileged) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      if (!body.userId || !body.shiftId) {
        return NextResponse.json({ error: "userId and shiftId are required" }, { status: 400 });
      }
      const assignment = await assignEmployeeToShift(tenantId, {
        userId: body.userId,
        userName: body.userName,
        shiftId: body.shiftId,
        shiftName: body.shiftName,
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      });
      return NextResponse.json({ data: assignment }, { status: 201 });
    }

    // 4. Shift definition creation (HR level)
    const isHr = ["super_admin", "hr_admin", "admin"].includes(auth.role || "");
    if (!isHr) {
      return NextResponse.json({ error: "Only HR or Super Admin can create shift definitions" }, { status: 403 });
    }

    if (!body.name || !body.startTime || !body.endTime) {
      return NextResponse.json({ error: "name, startTime, and endTime are required" }, { status: 400 });
    }

    const shift = await createShift(tenantId, {
      name: body.name,
      startTime: body.startTime,
      endTime: body.endTime,
      gracePeriod: body.gracePeriod || 15,
      flexibleDuration: Boolean(body.flexibleDuration),
      halfDayMark: body.halfDayMark || "14:30",
      color: body.color || "#3B82F6",
      status: body.status || "active",
    });

    return NextResponse.json({ data: shift }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/shifts error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireHrLevel();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    const body = await request.json();
    const updated = await updateShift(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PATCH /api/hrm/v2/shifts error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireHrLevel();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (!id) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    if (type === "assignment") {
      const success = await deleteShiftAssignment(id);
      if (!success) {
        return NextResponse.json({ error: "Assignment not found or deletion failed" }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: "Assignment deleted" });
    }

    const success = await deleteShift(id);
    if (!success) {
      return NextResponse.json({ error: "Shift not found or deletion failed" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Shift deleted" });
  } catch (error: any) {
    console.error("DELETE /api/hrm/v2/shifts error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
