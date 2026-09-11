import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongo-helper";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler } from "@/lib/api-handler";

const DEFAULT_RULES = {
  officeStart: 10,
  officeEnd: 19,
  lateAfter: 10.5,
  workDays: [1, 2, 3, 4, 5],
  halfDayAfter: 14.5,
  requiredHours: 8.5,
  breakAllowance: 30,
  meetingCountsAsWork: true,
};

export const GET = withErrorHandler(async () => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  let officeRules = { ...DEFAULT_RULES };

  try {
    const db = await getDb();
    if (db) {
      const settingsDoc = await db.collection("settings").findOne({ key: "super_admin_system" });
      if (settingsDoc?.settings?.officeRules) {
        officeRules = { ...DEFAULT_RULES, ...settingsDoc.settings.officeRules };
      }
    }
  } catch { /* use defaults */ }

  return NextResponse.json({ officeRules });
}, { label: "Tenant Current" });
