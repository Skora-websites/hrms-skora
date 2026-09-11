import { getDb } from "./mongo-helper";

export type AttendanceStatus = "PRESENT" | "LATE" | "HALF_DAY" | "ABSENT";
export type AUXState = "active" | "on_break" | "meeting";
export interface AUXEntry { state: AUXState; startTime: string; endTime?: string; }
export interface AttendanceRecord { _id?: string; tenantId?: string; userId: string; userName: string; userEmail: string; employeeCode?: string; date: string; punchInTime: string; punchOutTime?: string; location?: string; status: AttendanceStatus; workHours?: number; managerId?: string; createdAt?: string; auxState?: AUXState; auxHistory?: AUXEntry[]; totalBreakMinutes?: number; effectiveWorkMinutes?: number; }

/**
 * Date key used to bucket attendance records. Attendance is keyed by the
 * calendar date in the office timezone (Asia/Kolkata, IST) so that a punch-in
 * at e.g. 09:55 IST or 22:30 IST lands on the same day the employee and the
 * dashboard consider "today", regardless of the server's UTC clock.
 */
export const ATTENDANCE_TIMEZONE = "Asia/Kolkata";

export function attendanceDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ATTENDANCE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Current time-of-day in IST as decimal hours (e.g. 10:30 -> 10.5). */
export function istHour(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ATTENDANCE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  const [h, m] = parts.split(":").map(Number);
  return h + m / 60;
}

// Status thresholds in IST: on/before 10:30 PRESENT, by 14:30 LATE, else HALF_DAY.
export function calculateAttendanceStatus(punchInDate: Date): AttendanceStatus {
  const h = istHour(punchInDate);
  if (h <= 10.5) return "PRESENT";
  if (h <= 14.5) return "LATE";
  return "HALF_DAY";
}
export function calculateEffectiveWorkMinutes(auxHistory: AUXEntry[]): number { let totalMs = 0; const now = Date.now(); for (const e of auxHistory) if (e.state === "active" || e.state === "meeting") totalMs += new Date(e.endTime || new Date(now).toISOString()).getTime() - new Date(e.startTime).getTime(); return Math.max(0, Math.round(totalMs / 60000)); }
export function calculateBreakMinutes(auxHistory: AUXEntry[]): number { let totalMs = 0; const now = Date.now(); for (const e of auxHistory) if (e.state === "on_break") totalMs += new Date(e.endTime || new Date(now).toISOString()).getTime() - new Date(e.startTime).getTime(); return Math.max(0, Math.round(totalMs / 60000)); }

/** Normalize any auxHistory shape coming back from Mongo (dates may be strings or Date objects). */
function normalizeAuxHistory(raw: unknown): AUXEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === "object")
    .map((e) => ({
      state: (e.state === "on_break" || e.state === "meeting" ? e.state : "active") as AUXState,
      startTime: new Date(e.startTime as string | number | Date).toISOString(),
      endTime: e.endTime ? new Date(e.endTime as string | number | Date).toISOString() : undefined,
    }));
}

/** Ensure every mapped record carries the AUX fields the UI needs. */
function withAuxFields(d: Record<string, unknown> | AttendanceRecord): AttendanceRecord {
  const src = d as Record<string, unknown>;
  return {
    ...(src as unknown as AttendanceRecord),
    _id: String(src._id),
    auxState: (src.auxState as AUXState) || "active",
    auxHistory: normalizeAuxHistory(src.auxHistory),
    totalBreakMinutes: (src.totalBreakMinutes as number) || 0,
    effectiveWorkMinutes: (src.effectiveWorkMinutes as number) || 0,
    createdAt: src.createdAt ? new Date(src.createdAt as Date | string).toISOString() : new Date().toISOString(),
  };
}

// Match a user's record for a given IST date regardless of tenantId state
// (older docs may be missing the field entirely — $in never matches missing).
function userDateQuery(userId: string, date: string, tenantId?: string) {
  return {
    userId,
    date,
    ...(tenantId
      ? { $or: [{ tenantId }, { tenantId: "default" }, { tenantId: { $exists: false } }] }
      : {}),
  };
}

export async function getAttendanceRecords(filter?: { userId?: string; date?: string; tenantId?: string; managerId?: string }): Promise<AttendanceRecord[]> {
  const db = await getDb();
  if (!db) return [];
  const query: Record<string, unknown> = {};
  // Match on tenantId when the caller supplies one; otherwise do NOT filter by
  // tenant at all — the auth layer already scopes users, and hard-failing on a
  // missing/stale tenantId here silently hides real attendance rows.
  if (filter?.tenantId) query.tenantId = filter.tenantId;
  if (filter?.userId) query.userId = filter.userId;
  if (filter?.date) query.date = filter.date;
  if (filter?.managerId) query.managerId = filter.managerId;
  const docs = await db.collection("attendance").find(query).sort({ date: -1, punchInTime: -1 }).toArray();
  return docs.map((d) => withAuxFields(d as unknown as Record<string, unknown>));
}

export async function recordPunchIn(data: { userId: string; userName: string; userEmail: string; employeeCode?: string; status?: string; tenantId?: string; managerId?: string; }): Promise<AttendanceRecord | null> {
  const db = await getDb();
  if (!db) return null;
  const now = new Date();
  const nowISO = now.toISOString();
  const todayStr = attendanceDateKey(now);
  const rawStatus = data.status || calculateAttendanceStatus(now);
  // "WFH" was never part of AttendanceStatus; GPS-free punches are time-only.
  const status = (rawStatus === "WFH" || rawStatus === "HALF_DAY" ? rawStatus === "WFH" ? "PRESENT" : rawStatus : rawStatus) as AttendanceStatus;

  const existing = await db.collection("attendance").findOne(userDateQuery(data.userId, todayStr, data.tenantId));
  if (existing) {
    // Re-punch-in on the same day reopens the record: clear punch-out, restart AUX.
    const update = {
      $set: {
        userName: data.userName || existing.userName,
        userEmail: data.userEmail || existing.userEmail,
        employeeCode: data.employeeCode || existing.employeeCode,
        punchInTime: nowISO,
        workHours: 0,
        auxState: "active" as AUXState,
        status: calculateAttendanceStatus(now),
        ...(existing.tenantId ? {} : { tenantId: data.tenantId || "default" }),
      },
      $unset: { punchOutTime: "" },
      $push: { auxHistory: { state: "active", startTime: nowISO } },
    };
    const updated = await (db.collection("attendance").findOneAndUpdate as (f: object, u: object, o: object) => Promise<Record<string, unknown> | null>)(
      { _id: existing._id },
      update,
      { returnDocument: "after" }
    );
    return updated ? withAuxFields(updated as unknown as Record<string, unknown>) : null;
  }

  const initialAUX: AUXEntry[] = [{ state: "active", startTime: nowISO }];
  const doc = {
    tenantId: data.tenantId || "default",
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    employeeCode: data.employeeCode,
    date: todayStr,
    punchInTime: nowISO,
    location: "Office",
    status,
    managerId: data.managerId,
    auxState: "active" as AUXState,
    auxHistory: initialAUX,
    totalBreakMinutes: 0,
    effectiveWorkMinutes: 0,
    createdAt: now,
  };
  const res = await db.collection("attendance").insertOne(doc);
  return { ...doc, _id: res.insertedId.toString(), createdAt: now.toISOString() } as AttendanceRecord;
}

export async function recordAUXChange(userId: string, dateStr: string, newState: AUXState, tenantId = "default"): Promise<AttendanceRecord | null> {
  const db = await getDb();
  if (!db) return null;
  const record = await db.collection("attendance").findOne({ ...userDateQuery(userId, dateStr, tenantId), punchOutTime: { $exists: false, $ne: null } });
  if (!record) return null;
  const nowISO = new Date().toISOString();
  const history: AUXEntry[] = normalizeAuxHistory(record.auxHistory);
  const updatedHistory = history.map((e: AUXEntry, i: number) => i === history.length - 1 && !e.endTime ? { ...e, endTime: nowISO } : e);
  updatedHistory.push({ state: newState, startTime: nowISO });
  const effectiveWorkMinutes = calculateEffectiveWorkMinutes(updatedHistory);
  const totalBreakMinutes = calculateBreakMinutes(updatedHistory);
  const updated = await db.collection("attendance").findOneAndUpdate(
    { _id: record._id },
    { $set: { auxState: newState, auxHistory: updatedHistory, totalBreakMinutes, effectiveWorkMinutes } },
    { returnDocument: "after" }
  );
  return updated ? withAuxFields(updated as unknown as Record<string, unknown>) : null;
}

export async function recordPunchOut(userId: string, dateStr: string, tenantId = "default"): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const now = new Date();
  const nowISO = now.toISOString();
  const record = await db.collection("attendance").findOne({ ...userDateQuery(userId, dateStr, tenantId), punchOutTime: { $exists: false, $ne: null } });
  if (!record) return false;
  let history: AUXEntry[] = normalizeAuxHistory(record.auxHistory);
  history = history.map((e: AUXEntry, i: number) => i === history.length - 1 && !e.endTime ? { ...e, endTime: nowISO } : e);
  const effectiveWorkMinutes = calculateEffectiveWorkMinutes(history);
  const totalBreakMinutes = calculateBreakMinutes(history);
  const workHours = Number((effectiveWorkMinutes / 60).toFixed(2));
  const res = await db.collection("attendance").updateOne({ _id: record._id }, { $set: { punchOutTime: nowISO, workHours, auxState: "active", auxHistory: history, totalBreakMinutes, effectiveWorkMinutes } });
  return res.modifiedCount > 0;
}
