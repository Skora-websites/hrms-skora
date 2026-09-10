import { getDb } from "./mongo-helper";
import { getOfficeConfig } from "@/lib/hrm/office-config";
import { haversineDistance } from "@/lib/geofencing";

export type AttendanceStatus = "PRESENT" | "LATE" | "HALF_DAY" | "ABSENT";
export type AUXState = "active" | "on_break" | "meeting";
export interface LocationEntry { latitude: number; longitude: number; accuracy: number; timestamp: string; distanceFromOffice?: number; }
export interface AUXEntry { state: AUXState; startTime: string; endTime?: string; }
export interface AttendanceRecord { _id?: string; tenantId?: string; userId: string; userName: string; userEmail: string; employeeCode?: string; date: string; punchInTime: string; punchOutTime?: string; location?: string; status: AttendanceStatus; workHours?: number; managerId?: string; createdAt?: string; auxState?: AUXState; auxHistory?: AUXEntry[]; totalBreakMinutes?: number; effectiveWorkMinutes?: number; locationHistory?: LocationEntry[]; currentLocation?: { latitude: number; longitude: number; accuracy: number; timestamp: string; distanceFromOffice?: number }; workLocation?: "office" | "remote"; }

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

export function calculateAttendanceStatus(punchInDate: Date): AttendanceStatus { const m = punchInDate.getHours() * 60 + punchInDate.getMinutes(); if (m <= 630) return "PRESENT"; if (m <= 780) return "LATE"; return "HALF_DAY"; }
export function calculateEffectiveWorkMinutes(auxHistory: AUXEntry[]): number { let totalMs = 0; const now = Date.now(); for (const e of auxHistory) if (e.state === "active" || e.state === "meeting") totalMs += new Date(e.endTime || new Date(now).toISOString()).getTime() - new Date(e.startTime).getTime(); return Math.max(0, Math.round(totalMs / 60000)); }
export function calculateBreakMinutes(auxHistory: AUXEntry[]): number { let totalMs = 0; const now = Date.now(); for (const e of auxHistory) if (e.state === "on_break") totalMs += new Date(e.endTime || new Date(now).toISOString()).getTime() - new Date(e.startTime).getTime(); return Math.max(0, Math.round(totalMs / 60000)); }
function extractCoordinates(location?: string): { latitude: number; longitude: number } | null { if (!location) return null; const match = location.match(/Lat:\s*(-?\d+(?:\.\d+)?),\s*Lng:\s*(-?\d+(?:\.\d+)?)/i); if (!match) return null; const latitude = Number(match[1]); const longitude = Number(match[2]); if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null; return { latitude, longitude }; }

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

/** Ensure every mapped record carries the AUX/workLocation fields the UI needs. */
function withAuxFields(d: Record<string, unknown> | AttendanceRecord): AttendanceRecord {
  const src = d as Record<string, unknown>;
  return {
    ...(src as unknown as AttendanceRecord),
    _id: String(src._id),
    auxState: (src.auxState as AUXState) || "active",
    auxHistory: normalizeAuxHistory(src.auxHistory),
    totalBreakMinutes: (src.totalBreakMinutes as number) || 0,
    effectiveWorkMinutes: (src.effectiveWorkMinutes as number) || 0,
    workLocation: (src.workLocation as "office" | "remote") || "office",
    createdAt: src.createdAt ? new Date(src.createdAt as Date | string).toISOString() : new Date().toISOString(),
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

export async function recordPunchIn(data: { userId: string; userName: string; userEmail: string; employeeCode?: string; location?: string; status?: string; tenantId?: string; managerId?: string; workLocation?: "office" | "remote"; }): Promise<AttendanceRecord | null> {
  const db = await getDb();
  if (!db) return null;
  const now = new Date();
  const todayStr = attendanceDateKey(now);
  const office = await getOfficeConfig();
  const coords = extractCoordinates(data.location);
  const distanceFromOffice = coords ? Math.round(haversineDistance(coords.latitude, coords.longitude, office.latitude, office.longitude)) : undefined;

  // Geofence validation: never silently reject. If the claimed office punch is
  // implausibly far away, record it as a remote punch instead of returning null
  // (which used to surface as "Attendance was not saved" with no explanation).
  let workLocation = data.workLocation || "office";
  if (distanceFromOffice !== undefined && distanceFromOffice > office.geofenceRadius) {
    if (workLocation === "office") {
      console.warn(
        `[attendance] office punch ${distanceFromOffice}m from office (radius ${office.geofenceRadius}m) — recording as remote for user ${data.userId}`
      );
      workLocation = "remote";
    }
  } else if (process.env.NODE_ENV === "production" && data.workLocation === "office" && distanceFromOffice === undefined) {
    console.warn(`[attendance] no GPS coordinates in location string — recording as remote for user ${data.userId}`);
    workLocation = "remote";
  }

  const status = (data.status || calculateAttendanceStatus(now)) as AttendanceStatus;
  const nowISO = now.toISOString();

  // Look up an existing open/closed record for this user + IST date without
  // requiring an exact tenantId match (stale tenant values previously caused
  // duplicate rows and "user not found"-style failures for AUX).
  const existing = await db.collection("attendance").findOne(
    data.tenantId
      ? { tenantId: { $in: [data.tenantId, "default"] }, userId: data.userId, date: todayStr }
      : { userId: data.userId, date: todayStr }
  );
  if (existing) {
    await db.collection("attendance").updateOne(
      { _id: existing._id },
      {
        $set: {
          userName: data.userName || existing.userName,
          userEmail: data.userEmail || existing.userEmail,
          employeeCode: data.employeeCode || existing.employeeCode,
          location: data.location || existing.location,
          // Backfill tenantId if the old record predates it.
          ...(existing.tenantId ? {} : { tenantId: data.tenantId || "default" }),
        },
      }
    );
    return withAuxFields({ ...existing, ...data } as unknown as AttendanceRecord);
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
    location: data.location || "Primary Office (GPS Verified)",
    workLocation,
    status,
    managerId: data.managerId,
    auxState: "active" as AUXState,
    auxHistory: initialAUX,
    totalBreakMinutes: 0,
    effectiveWorkMinutes: 0,
    currentLocation: coords ? { ...coords, accuracy: 0, timestamp: nowISO, distanceFromOffice } : undefined,
    createdAt: now,
  };
  const res = await db.collection("attendance").insertOne(doc);
  return { ...doc, _id: res.insertedId.toString(), createdAt: now.toISOString() } as AttendanceRecord;
}

export async function recordAUXChange(userId: string, dateStr: string, newState: AUXState, tenantId = "default"): Promise<AttendanceRecord | null> {
  const db = await getDb();
  if (!db) return null;
  const record = await db.collection("attendance").findOne({ tenantId: { $in: [tenantId, "default"] }, userId, date: dateStr, punchOutTime: { $exists: false } });
  if (!record) return null;
  const nowISO = new Date().toISOString();
  const history: AUXEntry[] = normalizeAuxHistory(record.auxHistory);
  const updatedHistory = history.map((e: AUXEntry, i: number) => i === history.length - 1 && !e.endTime ? { ...e, endTime: nowISO } : e);
  updatedHistory.push({ state: newState, startTime: nowISO });
  const effectiveWorkMinutes = calculateEffectiveWorkMinutes(updatedHistory);
  const totalBreakMinutes = calculateBreakMinutes(updatedHistory);
  await db.collection("attendance").updateOne({ _id: record._id }, { $set: { auxState: newState, auxHistory: updatedHistory, totalBreakMinutes, effectiveWorkMinutes } });
  return { ...record, _id: String(record._id), auxState: newState, auxHistory: updatedHistory, totalBreakMinutes, effectiveWorkMinutes, createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString() } as AttendanceRecord;
}

export async function recordPunchOut(userId: string, dateStr: string, tenantId = "default"): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const now = new Date();
  const nowISO = now.toISOString();
  const record = await db.collection("attendance").findOne({ tenantId: { $in: [tenantId, "default"] }, userId, date: dateStr, punchOutTime: { $exists: false } });
  if (!record) return false;
  let history: AUXEntry[] = normalizeAuxHistory(record.auxHistory);
  history = history.map((e: AUXEntry, i: number) => i === history.length - 1 && !e.endTime ? { ...e, endTime: nowISO } : e);
  const effectiveWorkMinutes = calculateEffectiveWorkMinutes(history);
  const totalBreakMinutes = calculateBreakMinutes(history);
  const workHours = Number((effectiveWorkMinutes / 60).toFixed(2));
  const res = await db.collection("attendance").updateOne({ _id: record._id }, { $set: { punchOutTime: nowISO, workHours, auxState: "active", auxHistory: history, totalBreakMinutes, effectiveWorkMinutes } });
  return res.modifiedCount > 0;
}

export async function updateAttendanceLocation(userId: string, dateStr: string, latitude: number, longitude: number, accuracy: number, distanceFromOffice?: number, tenantId = "default"): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const record = await db.collection("attendance").findOne({ tenantId: { $in: [tenantId, "default"] }, userId, date: dateStr, punchOutTime: { $exists: false } });
  if (!record) return false;
  const nowISO = new Date().toISOString();
  const entry: LocationEntry = { latitude, longitude, accuracy, timestamp: nowISO, distanceFromOffice };
  await db.collection("attendance").updateOne({ _id: record._id }, { $push: { locationHistory: { $each: [entry], $slice: -1000 } } as any, $set: { currentLocation: { latitude, longitude, accuracy, timestamp: nowISO, distanceFromOffice } } });
  return true;
}

export async function getLiveEmployeeLocations(tenantId = "default"): Promise<Array<{ userId: string; userName: string; userEmail: string; employeeCode?: string; latitude: number; longitude: number; accuracy: number; timestamp: string; distanceFromOffice?: number; auxState?: AUXState }>> {
  const db = await getDb();
  if (!db) return [];
  const records = await db.collection("attendance").find({ date: attendanceDateKey(), punchOutTime: { $exists: false }, currentLocation: { $exists: true } }).toArray();
  return records.filter((r: any) => r.currentLocation).map((r: any) => ({ userId: r.userId, userName: r.userName, userEmail: r.userEmail, employeeCode: r.employeeCode, latitude: r.currentLocation.latitude, longitude: r.currentLocation.longitude, accuracy: r.currentLocation.accuracy, timestamp: r.currentLocation.timestamp, distanceFromOffice: r.currentLocation.distanceFromOffice, auxState: r.auxState }));
}
