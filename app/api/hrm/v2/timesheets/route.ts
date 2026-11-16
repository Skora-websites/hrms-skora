import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mongo-helper";
import { ObjectId } from "@/lib/db/mysql";

async function isDirectReport(managerId: string, employeeId: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const employee = await db.collection("users").findOne({ _id: new ObjectId(employeeId) });
    const rm = (employee as any)?.reportingManager;
    if (!rm) return false;
    if (rm === managerId) return true;
    const manager = await db.collection("users").findOne({ _id: new ObjectId(managerId) });
    return !!manager && rm === (manager as any).displayName;
  } catch {
    return false;
  }
}

async function getDirectReportIds(managerId: string): Promise<string[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    const manager = await db.collection("users").findOne({ _id: new ObjectId(managerId) });
    const managerName = (manager as any)?.displayName || "";
    const users = await db.collection("users").find({
      $or: [
        { reportingManager: managerId },
        ...(managerName ? [{ reportingManager: managerName }] : []),
      ],
    }).project({ _id: 1 }).toArray();
    return users.map((u: any) => u._id.toString());
  } catch {
    return [];
  }
}

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
    } else if (auth.role === "manager") {
      if (userId) {
        if (userId !== auth.userId && !(await isDirectReport(auth.userId, userId))) {
          return NextResponse.json({ error: "Forbidden: you can only view your direct reports' timesheets" }, { status: 403 });
        }
        query.userId = userId;
      } else {
        const reportIds = await getDirectReportIds(auth.userId);
        query.userId = { $in: [auth.userId, ...reportIds] };
      }
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
    if (error instanceof SyntaxError || error?.message?.includes("JSON")) {
      return NextResponse.json({ error: "Invalid or empty JSON payload" }, { status: 400 });
    }
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

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid timesheet ID" }, { status: 400 });
    }

    const timesheet = await db.collection("timesheets").findOne({ _id: new ObjectId(id) });
    if (!timesheet) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
    }

    if (auth.role === "manager") {
      if (timesheet.userId === auth.userId) {
        return NextResponse.json({ error: "Forbidden: you cannot approve your own timesheet" }, { status: 403 });
      }
      if (!(await isDirectReport(auth.userId, String(timesheet.userId)))) {
        return NextResponse.json({ error: "Forbidden: you can only approve timesheets for your direct reports" }, { status: 403 });
      }
    }

    const body = await request.json();

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
    if (error instanceof SyntaxError || error?.message?.includes("JSON")) {
      return NextResponse.json({ error: "Invalid or empty JSON payload" }, { status: 400 });
    }
    console.error("PATCH /api/hrm/v2/timesheets error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
