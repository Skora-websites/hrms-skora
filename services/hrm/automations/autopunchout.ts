import "server-only";
import { getDb, ObjectId } from "@/lib/db/mysql";
import { isWithinGeofence, DEFAULT_OFFICE_COORDINATES } from "@/lib/geofencing";

export interface AutoPunchoutResult {
  date: string;
  processedCount: number;
  autoPunchedOutCount: number;
  skippedCount: number;
  regularizationRequestsCreated: number;
  affectedEmployees: Array<{
    userId: string;
    userName: string;
    punchInTime: string;
    autoPunchOutTime: string;
    reason: string;
  }>;
}

/**
 * Evaluates open shifts at 19:30 IST or 23:59 IST.
 * If employee has left the office radius or remains unclosed at shift cutoff:
 * 1. Closes attendance record at standard shift end (19:00:00 IST)
 * 2. Capped effective work hours to 8 hours (480 mins)
 * 3. Flags `isAutoClosed: true` and status `REGULARIZATION_PENDING`
 * 4. Automatically creates a pending Regularization Request for reporting manager approval.
 */
export async function executeShiftAutoPunchout(
  tenantId: string = "default",
  options: {
    forceAll?: boolean;
    referenceDate?: Date;
  } = {}
): Promise<AutoPunchoutResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available for auto punch-out");
  }

  const now = options.referenceDate || new Date();
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  // Standard shift cutoff timestamp: today at 19:00:00 IST
  const standardShiftEndIso = `${todayStr}T19:00:00+05:30`;

  // Find all attendance records for today that are punched in but not punched out
  const unclosedAttendance = await db.collection("attendance").find({
    tenantId,
    date: todayStr,
    punchInTime: { $ne: null },
    $or: [
      { punchOutTime: null },
      { punchOutTime: "" },
      { punchOutTime: { $exists: false } },
    ],
  }).toArray();

  // Load all users to resolve reporting managers
  const userIds = unclosedAttendance.map((a: any) => String(a.userId));
  const users = await db.collection("users").find({
    tenantId,
    _id: { $in: userIds.map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : id)) },
  }).toArray();

  const userMap = new Map<string, any>();
  for (const u of users as any[]) {
    userMap.set(u._id ? u._id.toString() : String(u.id), u);
  }

  let autoPunchedOutCount = 0;
  let skippedCount = 0;
  let regularizationsCreated = 0;
  const affected: AutoPunchoutResult["affectedEmployees"] = [];

  for (const att of unclosedAttendance as any[]) {
    const userId = String(att.userId);
    const user = userMap.get(userId);
    const userName = att.userName || user?.displayName || user?.name || user?.email || "Employee";

    // Geofence check: check employee's location if available
    let shouldAutoPunchout = options.forceAll || false;
    let autoReason = "Unclosed shift at end-of-day cutoff";

    if (!shouldAutoPunchout && att.currentLocation?.latitude && att.currentLocation?.longitude) {
      const geoCheck = isWithinGeofence(
        att.currentLocation.latitude,
        att.currentLocation.longitude,
        DEFAULT_OFFICE_COORDINATES.latitude,
        DEFAULT_OFFICE_COORDINATES.longitude,
        DEFAULT_OFFICE_COORDINATES.radiusMeters
      );

      if (!geoCheck.within) {
        shouldAutoPunchout = true;
        autoReason = `Left office premises without punching out (${Math.round(geoCheck.distance)}m away at 19:30 IST)`;
      }
    } else {
      // By 19:30 IST or midnight, if location is unavailable or employee didn't punch out, auto-close
      shouldAutoPunchout = true;
      autoReason = "Shift ended at 19:00 IST without manual punch-out";
    }

    if (!shouldAutoPunchout) {
      skippedCount++;
      continue;
    }

    // Cap work duration to standard 8 hours (480 minutes)
    const cappedWorkMinutes = 480;
    const cappedWorkHours = 8.0;

    const attId = att._id ? att._id.toString() : att.id;

    // Update attendance record in MySQL
    await db.collection("attendance").updateOne(
      { _id: ObjectId.isValid(attId) ? new ObjectId(attId) : attId },
      {
        $set: {
          punchOutTime: standardShiftEndIso,
          workHours: cappedWorkHours,
          effectiveWorkMinutes: cappedWorkMinutes,
          status: "REGULARIZATION_PENDING",
          auxState: null,
          isAutoClosed: true,
          autoCloseReason: autoReason,
          updatedAt: new Date(),
        },
      }
    );

    // Auto-create pending Regularization Request
    const reportingManager = user?.reportingManager || null;
    const regDoc = {
      tenantId,
      userId,
      employeeName: userName,
      employeeEmail: user?.email || att.userEmail || "",
      attendanceId: attId,
      date: todayStr,
      originalPunchIn: att.punchInTime,
      proposedPunchIn: att.punchInTime,
      proposedPunchOut: standardShiftEndIso,
      reason: `Automated System Auto-Punchout: ${autoReason}. Requesting regularized shift timings.`,
      status: "pending",
      requestedBy: "system_automation",
      reportingManager,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("regularization_requests").insertOne(regDoc as any);
    regularizationsCreated++;
    autoPunchedOutCount++;

    affected.push({
      userId,
      userName,
      punchInTime: att.punchInTime,
      autoPunchOutTime: standardShiftEndIso,
      reason: autoReason,
    });
  }

  // Audit log the automation execution
  await db.collection("cron_job_logs").insertOne({
    tenantId,
    jobName: "shift_auto_punchout",
    executedAt: new Date(),
    date: todayStr,
    status: "success",
    recordsAffected: autoPunchedOutCount,
    details: `Processed ${unclosedAttendance.length} open shifts: ${autoPunchedOutCount} auto-closed, ${regularizationsCreated} regularizations generated.`,
  } as any);

  return {
    date: todayStr,
    processedCount: unclosedAttendance.length,
    autoPunchedOutCount,
    skippedCount,
    regularizationRequestsCreated: regularizationsCreated,
    affectedEmployees: affected,
  };
}
