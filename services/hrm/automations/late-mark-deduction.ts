import "server-only";
import { getDb, ObjectId } from "@/lib/db/mysql";

export interface LateMarkDeductionItem {
  userId: string;
  userName: string;
  email: string;
  lateMarksCount: number;
  deductionDays: number;
  deductedFrom: "CL" | "LWP";
  clRemainingAfter: number;
}

export interface LateMarkDeductionResult {
  month: number;
  year: number;
  evaluatedEmployeesCount: number;
  penalizedEmployeesCount: number;
  totalDaysDeducted: number;
  deductions: LateMarkDeductionItem[];
}

/**
 * Evaluates monthly punctuality and enforces the Indian 3-Late-Marks = 0.5 Day Leave Deduction Rule.
 * - Shift start: 10:00 AM IST (600 mins).
 * - Grace period: up to 10:15 AM IST (615 mins).
 * - Late mark: Punch in > 10:15 AM IST.
 * - Every 3 late marks in a month = 0.5 days deducted from CL balance (or LWP if insufficient).
 */
export async function executeLateMarkDeductions(
  tenantId: string = "default",
  options: {
    month?: number;
    year?: number;
    dryRun?: boolean;
    referenceDate?: Date;
  } = {}
): Promise<LateMarkDeductionResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available for late-mark deductions");
  }

  const now = options.referenceDate || new Date();
  const month = options.month ?? (now.getMonth() + 1);
  const year = options.year ?? now.getFullYear();
  const dryRun = options.dryRun ?? false;

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  // Find all attendance records for the month
  const records = await db.collection("attendance").find({
    tenantId,
    date: { $gte: `${monthStr}-01`, $lte: `${monthStr}-31` },
    punchInTime: { $ne: null },
  }).toArray();

  // Find all active employees
  const activeUsers = await db.collection("users").find({
    tenantId,
    status: "active",
  }).project({
    _id: 1,
    id: 1,
    email: 1,
    displayName: 1,
    name: 1,
  }).toArray();

  const userMap = new Map<string, any>();
  for (const u of activeUsers as any[]) {
    userMap.set(u._id ? u._id.toString() : String(u.id), u);
  }

  // Tally late marks per employee
  // 10:15 AM IST is 10 * 60 + 15 = 615 minutes from start of day in IST
  const lateCountByUser = new Map<string, number>();

  for (const rec of records as any[]) {
    if (!rec.punchInTime) continue;
    const userId = String(rec.userId);

    const punchInDate = new Date(rec.punchInTime);
    // Convert to IST minutes
    const istHours = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(punchInDate)
    );
    const istMinutes = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", minute: "numeric" }).format(punchInDate)
    );
    const totalMins = istHours * 60 + istMinutes;

    if (totalMins > 615) {
      // Late mark recorded (> 10:15 AM IST)
      lateCountByUser.set(userId, (lateCountByUser.get(userId) || 0) + 1);
    }
  }

  // Find CL leave type
  const clType = await db.collection("leave_types").findOne({
    tenantId,
    $or: [{ code: "CL" }, { name: { $regex: "casual", $options: "i" } }],
  });
  const clTypeId = clType?._id ? clType._id.toString() : clType?.id;

  const deductions: LateMarkDeductionItem[] = [];
  let totalDaysDeducted = 0;

  for (const [userId, lateCount] of lateCountByUser.entries()) {
    const penaltyUnits = Math.floor(lateCount / 3);
    if (penaltyUnits <= 0) continue;

    const penaltyDays = penaltyUnits * 0.5;
    const user = userMap.get(userId);
    const userName = user?.displayName || user?.name || user?.email || "Employee";
    const userEmail = user?.email || "—";

    let deductedFrom: "CL" | "LWP" = "CL";
    let clRemainingAfter = 0;

    // Fetch employee's CL balance
    let clBalance = null;
    if (clTypeId) {
      clBalance = await db.collection("leave_balances").findOne({
        tenantId,
        userId,
        leaveTypeId: clTypeId,
        year,
      });
    }

    const currentClRemaining = Number(clBalance?.remaining) || 0;

    if (currentClRemaining >= penaltyDays) {
      deductedFrom = "CL";
      clRemainingAfter = currentClRemaining - penaltyDays;

      if (!dryRun && clBalance) {
        await db.collection("leave_balances").updateOne(
          { _id: clBalance._id },
          {
            $set: {
              used: (Number(clBalance.used) || 0) + penaltyDays,
              remaining: clRemainingAfter,
              updatedAt: new Date(),
            },
          }
        );

        await db.collection("leave_balance_history").insertOne({
          tenantId,
          userId,
          leaveTypeId: clTypeId,
          changeType: "deducted",
          amount: penaltyDays,
          previousBalance: currentClRemaining,
          newBalance: clRemainingAfter,
          notes: `Late-mark penalty: ${lateCount} late marks in ${month}/${year} (${penaltyUnits}x 0.5 day = -${penaltyDays} day CL)`,
          createdAt: new Date(),
        } as any);
      }
    } else {
      // Insufficient CL balance -> Deduct as LWP (Leave Without Pay)
      deductedFrom = "LWP";
      clRemainingAfter = currentClRemaining;

      if (!dryRun) {
        await db.collection("leave_balance_history").insertOne({
          tenantId,
          userId,
          leaveTypeId: clTypeId || "LWP",
          changeType: "lwp_penalty",
          amount: penaltyDays,
          previousBalance: currentClRemaining,
          newBalance: currentClRemaining,
          notes: `Late-mark penalty (LWP): ${lateCount} late marks in ${month}/${year} (${penaltyUnits}x 0.5 day = ${penaltyDays} day LWP salary deduction)`,
          createdAt: new Date(),
        } as any);
      }
    }

    totalDaysDeducted += penaltyDays;
    deductions.push({
      userId,
      userName,
      email: userEmail,
      lateMarksCount: lateCount,
      deductionDays: penaltyDays,
      deductedFrom,
      clRemainingAfter,
    });
  }

  // Audit log execution in MySQL
  if (!dryRun) {
    await db.collection("cron_job_logs").insertOne({
      tenantId,
      jobName: "late_mark_deductions",
      runKey: `late-deductions-${year}-${String(month).padStart(2, "0")}`,
      executedAt: new Date(),
      status: "success",
      recordsAffected: deductions.length,
      details: `Evaluated ${records.length} records. Penalized ${deductions.length} employees with ${totalDaysDeducted} total penalty days.`,
    } as any);
  }

  return {
    month,
    year,
    evaluatedEmployeesCount: activeUsers.length,
    penalizedEmployeesCount: deductions.length,
    totalDaysDeducted,
    deductions,
  };
}
