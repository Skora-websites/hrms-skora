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
    const auth = await requireHrLevel();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";
    const body = await request.json();

    if (body.action === "assign") {
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
