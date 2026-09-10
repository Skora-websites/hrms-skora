import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mongo-helper";

/**
 * GET /api/hrm/v2/timesheets
 * - Manager: sees team timesheets for a given date
 * - Employee: sees own timesheets
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const db = await getDb();
    if (!db) return NextResponse.json({ data: [] });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const userId = searchParams.get("userId");

    const query: Record<string, unknown> = {};

    if (auth.role === "employee") {
      query.userId = auth.userId;
    } else if (userId) {
      query.userId = userId;
    }

    if (date) {
      query.date = date;
    }

    const timesheets = await db
      .collection("timesheets")
      .find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(100)
      .toArray();

    const data = timesheets.map((t: any) => ({
      id: t._id?.toString() || "",
      userId: t.userId,
      userName: t.userName || "",
      projectName: t.projectName || "",
      taskTitle: t.taskTitle || "",
      date: t.date || "",
      hours: t.hours || 0,
      notes: t.notes || "",
      billable: t.billable !== false,
      status: t.status || "PENDING",
      createdAt: t.createdAt,
    }));

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/timesheets error:", error);
    return NextResponse.json({ data: [] });
  }
}

/**
 * POST /api/hrm/v2/timesheets
 * Employee submits a timesheet entry
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const db = await getDb();
    if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });

    const body = await request.json();
    const { projectName, taskTitle, date, hours, notes, billable } = body;

    if (!date || !hours) {
      return NextResponse.json({ error: "date and hours are required" }, { status: 400 });
    }

    const doc = {
      userId: auth.userId,
      projectName: projectName || "",
      taskTitle: taskTitle || "",
      date,
      hours: Number(hours),
      notes: notes || "",
      billable: billable !== false,
      status: "PENDING",
      createdAt: new Date(),
      tenantId: auth.tenantId || "default",
    };

    const result = await db.collection("timesheets").insertOne(doc);
    return NextResponse.json({ data: { id: result.insertedId.toString(), ...doc } }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/timesheets error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

/**
 * PATCH /api/hrm/v2/timesheets?id=xxx
 * Manager approves/rejects a timesheet entry
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    if (auth.role === "employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getDb();
    if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const body = await request.json();
    const { ObjectId } = require("mongodb");

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status) updateData.status = body.status;
    if (body.hours !== undefined) updateData.hours = body.hours;

    const result = await db.collection("timesheets").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PATCH /api/hrm/v2/timesheets error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
