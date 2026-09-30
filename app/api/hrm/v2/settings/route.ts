import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongo-helper";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { setSessionTimeoutCache } from "@/lib/session-policy";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const body = await request.json();
    const { role, userId, settings } = body;

    if (!role || !settings) {
      return NextResponse.json({ error: "Missing role or settings" }, { status: 400 });
    }
    const targetRole = String(role);

    // Mirror the CEO's session timeout into the login flow's policy cache so
    // new sessions pick it up without a DB round-trip.
    if (targetRole === "super_admin" && (settings as any)?.sessionTimeout !== undefined) {
      setSessionTimeoutCache(Number((settings as any).sessionTimeout));
    }

    // Namespace isolation — a caller may only write settings for its own role
    // namespace, with two narrow, legacy-UI exceptions:
    //   - admin users operate the shared HR-admin settings page (role=hr_admin);
    //   - HR-level users maintain the system-wide policy document
    //     (role=super_admin + userId="system" — office rules, notifications).
    // Without this, any manager could overwrite the super_admin namespace and
    // silently re-configure office rules for the whole company.
    const ownNamespace = targetRole === auth.role || (auth.role === "admin" && targetRole === "hr_admin");
    const systemPolicy =
      targetRole === "super_admin" &&
      userId === "system" &&
      ["super_admin", "hr_admin", "admin"].includes(auth.role);

    // Employees can only update their own employee-namespace settings
    if (auth.role === "employee") {
      if (userId !== auth.userId || targetRole !== "employee") {
        return NextResponse.json({ error: "Forbidden: you can only update your own settings" }, { status: 403 });
      }
    } else if (!ownNamespace && !systemPolicy) {
      return NextResponse.json({ error: "Forbidden: you can only update settings for your own role" }, { status: 403 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    // Key must stay in lockstep with the GET handler below: the Super Admin
    // settings page saves system-wide rules with userId="system", and every
    // other page reads them back WITHOUT a userId. A previous mismatch
    // ("super_admin_system" vs "super_admin") silently dropped all saves.
    const key = userId && userId !== "system" ? `${role}_${userId}` : role;
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

    
    // Retroactive update: re-evaluate TODAY's already-created attendance rows
    // so rule changes apply immediately, not just to future punch-ins.
    //  - workDays: non-work day → week_off; restored work day → status
    //    re-derived from the punch-in time (no longer stuck at week_off).
    //  - lateAfter: PRESENT/LATE boundary re-derived from the punch-in time.
    // Managers/HR rows are covered too (role filter removed — everyone's
    // attendance follows the same office rules).
    if (settings.officeRules?.workDays || settings.officeRules?.lateAfter !== undefined) {
      try {
        const { calculateAttendanceStatus } = await import("@/lib/db/attendance");
        const today = new Date();
        const dateStr = today.getFullYear() + "-" +
          String(today.getMonth() + 1).padStart(2, "0") + "-" +
          String(today.getDate()).padStart(2, "0");
        const dayOfWeek = today.getDay();
        const workDays: number[] = Array.isArray(settings.officeRules.workDays)
          ? settings.officeRules.workDays
          : [];
        const isWorkDay = workDays.length === 0 || workDays.includes(dayOfWeek);
        const lateAfter = typeof settings.officeRules.lateAfter === "number"
          ? settings.officeRules.lateAfter
          : 10.5;

        const todaysRows = await db.collection("attendance").find({ date: dateStr }).toArray();
        let updated = 0;
        for (const rec of todaysRows) {
          if (!rec || !rec._id) continue;
          const punchIn: string | undefined = rec.punchInTime;
          if (!isWorkDay) {
            // Today became a non-work day → mark week_off (keep punch data).
            if (rec.status !== "week_off" && rec.workdayType !== "weekly_off") {
              await db.collection("attendance").updateOne(
                { _id: rec._id },
                { $set: { status: "week_off", workdayType: "weekly_off", updatedAt: new Date() } }
              );
              updated++;
            }
          } else if (punchIn) {
            // Work day with a punch-in → re-derive status from the punch time.
            const newStatus = calculateAttendanceStatus(new Date(punchIn), lateAfter);
            if (rec.status && rec.status !== newStatus && rec.status !== "week_off") {
              await db.collection("attendance").updateOne(
                { _id: rec._id },
                { $set: { status: newStatus, workdayType: "regular", updatedAt: new Date() } }
              );
              updated++;
            } else if (rec.status === "week_off") {
              await db.collection("attendance").updateOne(
                { _id: rec._id },
                { $set: { status: newStatus, workdayType: "regular", updatedAt: new Date() } }
              );
              updated++;
            }
          }
        }
        if (updated > 0) console.log(`[settings] retroactively re-evaluated ${updated} attendance row(s) for ${dateStr}`);
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
    const targetRole = String(role);

    // Namespace isolation on reads: employees only their own employee
    // namespace, managers only the manager namespace. HR-level staff
    // (CEO/HR/admin) administer system-wide configuration and may read any.
    if (auth.role === "employee" && (targetRole !== "employee" || userId !== auth.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (auth.role === "manager" && targetRole !== "manager") {
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
