import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongo-helper";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const body = await request.json();
    const { role, userId, settings } = body;

    if (!role || !settings) {
      return NextResponse.json({ error: "Missing role or settings" }, { status: 400 });
    }

    // Employees can only update their own settings
    if (auth.role === "employee" && userId !== auth.userId) {
      return NextResponse.json({ error: "Forbidden: you can only update your own settings" }, { status: 403 });
    }

    // Only admins can update system-wide settings (non-user-specific)
    if (!userId && auth.role === "employee") {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    const key = userId ? `${role}_${userId}` : role;
    await db.collection("settings").updateOne(
      { key },
      {
        $set: {
          key,
          role,
          userId: userId || null,
          settings,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    
    // Retroactive update: if workDays changed, update today's attendance for affected employees
    if (settings.officeRules?.workDays) {
      try {
        const today = new Date();
        const dateStr = today.getFullYear() + "-" +
          String(today.getMonth() + 1).padStart(2, "0") + "-" +
          String(today.getDate()).padStart(2, "0");
        const dayOfWeek = today.getDay();
        const isWorkDay = settings.officeRules.workDays.includes(dayOfWeek);

        // Get all employees
        const users = await db.collection("users").find({ role: "employee" }).toArray();
        for (const emp of users) {
          const existing = await db.collection("attendance").findOne({
            userId: emp._id?.toString() || emp.email,
            date: dateStr,
          });
          if (existing && !isWorkDay) {
            // Today was a work day, now it's not — mark as week_off
            await db.collection("attendance").updateOne(
              { _id: existing._id },
              { $set: { status: "week_off", workdayType: "weekly_off", updatedAt: new Date() } }
            );
          } else if (!existing && isWorkDay) {
            // Today was off, now it's a work day — create absent record so they can punch in
            // (No record = they'll create one when they punch in, so no action needed)
          }
        }
      } catch (err) {
        console.warn("Retroactive attendance update failed:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings save error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Save failed" },
      { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const userId = searchParams.get("userId");

    if (!role) {
      return NextResponse.json({ error: "Missing role parameter" }, { status: 400 });
    }

    // Employees can only read their own settings
    if (auth.role === "employee" && userId !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ data: null });
    }

    const key = userId ? `${role}_${userId}` : role;
    const doc = await db.collection("settings").findOne({ key });

    return NextResponse.json({ data: doc?.settings || null });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Fetch failed" },
      { status: 500 }
    );
  }
}
