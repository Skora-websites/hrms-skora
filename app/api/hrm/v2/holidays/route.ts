import { NextRequest, NextResponse } from "next/server";
import {
  getHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getHolidayPlans,
  getHolidayPlanById,
  createHolidayPlan,
  updateHolidayPlan,
  deleteHolidayPlan,
  getHolidayDashboard,
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
} from "@/services/hrm/holiday";
import { requireAuth, requireAdmin, isErrorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const planId = searchParams.get("planId");
    const year = searchParams.get("year");
    const type = searchParams.get("type");
    const dashboard = searchParams.get("dashboard");
    const calendar = searchParams.get("calendar");

    if (dashboard === "true") {
      const dashData = await getHolidayDashboard(tenantId);
      return NextResponse.json({ data: dashData });
    }

    if (type === "plans") {
      const plans = await getHolidayPlans(tenantId);
      return NextResponse.json({ data: plans });
    }

    if (type === "plan" && id) {
      const plan = await getHolidayPlanById(id);
      if (!plan) {
        return NextResponse.json({ error: "Holiday plan not found" }, { status: 404 });
      }
      return NextResponse.json({ data: plan });
    }

    if (type === "calendar" && calendar) {
      const [fromStr, toStr] = calendar.split(",");
      const events = await getCalendarEvents(
        tenantId,
        auth.userId,
        new Date(fromStr),
        new Date(toStr)
      );
      return NextResponse.json({ data: events });
    }

    if (id) {
      const holiday = await getHolidayById(id);
      if (!holiday) {
        return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
      }
      return NextResponse.json({ data: holiday });
    }

    const holidays = await getHolidays(
      tenantId,
      planId || undefined,
      year ? parseInt(year) : undefined
    );
    return NextResponse.json({ data: holidays });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/holidays error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const body = await request.json();
    const type = body.type;

    if (type === "plan") {
      if (!body.name || !body.year) {
        return NextResponse.json({ error: "Missing required fields: name, year" }, { status: 400 });
      }
      const plan = await createHolidayPlan(tenantId, body);
      return NextResponse.json({ data: plan }, { status: 201 });
    }

    if (type === "calendar_event") {
      const event = await createCalendarEvent(tenantId, body);
      return NextResponse.json({ data: event }, { status: 201 });
    }

    if (!body.name || !body.date) {
      return NextResponse.json({ error: "Missing required fields: name, date" }, { status: 400 });
    }
    const holiday = await createHoliday(tenantId, body);
    return NextResponse.json({ data: holiday }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/holidays error:", error);
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
    const type = body.type;

    let updated;
    if (type === "plan") {
      updated = await updateHolidayPlan(id, body);
    } else {
      updated = await updateHoliday(id, body);
    }

    if (!updated) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PATCH /api/hrm/v2/holidays error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (!id) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    let deleted;
    if (type === "plan") {
      deleted = await deleteHolidayPlan(id);
    } else if (type === "calendar_event") {
      deleted = await deleteCalendarEvent(id);
    } else {
      deleted = await deleteHoliday(id);
    }

    if (!deleted) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/hrm/v2/holidays error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
