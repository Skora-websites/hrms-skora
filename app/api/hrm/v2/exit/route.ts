import { NextRequest, NextResponse } from "next/server";
import {
  getEmployeeExits,
  getEmployeeExitById,
  initiateExit,
  updateExitStatus,
  updateExitClearance,
  addExitInterview,
  getExitSettings,
  updateExitSettings,
  getEmployeeNoticePeriod,
  initiateNoticePeriod,
  waiveNoticePeriod,
  extendNoticePeriod,
  getExitDashboard,
} from "@/services/hrm/exit";
import { requireAuth, requireAdmin, isErrorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const dashboard = searchParams.get("dashboard");
    const settings = searchParams.get("settings");
    const noticePeriod = searchParams.get("noticePeriod");

    if (dashboard === "true") {
      if (auth.role === "employee") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const dashData = await getExitDashboard(tenantId);
      return NextResponse.json({ data: dashData });
    }

    if (settings === "true") {
      const exitSettings = await getExitSettings(tenantId);
      return NextResponse.json({ data: exitSettings });
    }

    if (noticePeriod === "true" && userId) {
      const period = await getEmployeeNoticePeriod(userId);
      return NextResponse.json({ data: period });
    }

    if (id) {
      const exit = await getEmployeeExitById(id);
      if (!exit) {
        return NextResponse.json({ error: "Exit record not found" }, { status: 404 });
      }
      return NextResponse.json({ data: exit });
    }

    const exits = await getEmployeeExits(tenantId, (status as any) || undefined);
    return NextResponse.json({ data: exits });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/exit error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const body = await request.json();
    const action = body.action;

    if (action === "initiate") {
      const exit = await initiateExit(tenantId, {
        userId: body.userId,
        resignationDate: new Date(body.resignationDate),
        lastWorkingDate: new Date(body.lastWorkingDate),
        reason: body.reason,
        exitType: body.exitType,
      });
      return NextResponse.json({ data: exit }, { status: 201 });
    }

    if (action === "clearance") {
      const updated = await updateExitClearance(body.exitId, body.clearanceId, body.clearedBy, body.notes);
      if (!updated) {
        return NextResponse.json({ error: "Exit record not found" }, { status: 404 });
      }
      return NextResponse.json({ data: updated });
    }

    if (action === "interview") {
      const updated = await addExitInterview(body.exitId, body.interview);
      if (!updated) {
        return NextResponse.json({ error: "Exit record not found" }, { status: 404 });
      }
      return NextResponse.json({ data: updated });
    }

    if (action === "notice_period") {
      const period = await initiateNoticePeriod(tenantId, {
        userId: body.userId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        remainingDays: body.remainingDays,
      });
      return NextResponse.json({ data: period }, { status: 201 });
    }

    if (action === "waive_notice") {
      const period = await waiveNoticePeriod(body.noticePeriodId, body.waivedById);
      if (!period) {
        return NextResponse.json({ error: "Notice period not found" }, { status: 404 });
      }
      return NextResponse.json({ data: period });
    }

    if (action === "extend_notice") {
      const period = await extendNoticePeriod(body.noticePeriodId, body.extendedDays, body.reason);
      if (!period) {
        return NextResponse.json({ error: "Notice period not found" }, { status: 404 });
      }
      return NextResponse.json({ data: period });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/exit error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    const body = await request.json();
    const action = body.action;

    let updated;
    if (action === "status") {
      updated = await updateExitStatus(id, body.status);
    } else if (action === "settings") {
      updated = await updateExitSettings(id, body);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PATCH /api/hrm/v2/exit error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
