import "server-only";
import { getDb, ObjectId } from "@/lib/db/mysql";

export interface LeaveAccrualResult {
  month: number;
  year: number;
  eligibleEmployeesCount: number;
  accruedCount: number;
  alreadyProcessed: boolean;
  accrualAmountPerEmployee: number;
  annualCap: number;
  details: string;
}

/**
 * Monthly Automated Leave Accrual (Indian Statutory Compliance)
 * - Runs on the 1st of every month at 00:01 IST
 * - Credits 1.5 days Casual Leave (CL) / Sick Leave (SL) to all active employees
 * - Enforces an annual maximum ceiling of 18 days per year
 * - Idempotent: rejects duplicate runs in the same calendar month unless forced.
 */
export async function executeMonthlyLeaveAccrual(
  tenantId: string = "default",
  options: {
    force?: boolean;
    referenceDate?: Date;
    accrualAmount?: number;
    annualCap?: number;
  } = {}
): Promise<LeaveAccrualResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available for leave accrual");
  }

  const now = options.referenceDate || new Date();
  const currentMonth = now.getMonth() + 1; // 1 to 12
  const currentYear = now.getFullYear();
  const accrualAmount = options.accrualAmount ?? 1.5;
  const annualCap = options.annualCap ?? 18.0;

  const runId = `leave-accrual-${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  // Idempotency check: verify if already executed this month
  if (!options.force) {
    const existingRun = await db.collection("cron_job_logs").findOne({
      tenantId,
      jobName: "monthly_leave_accrual",
      runKey: runId,
      status: "success",
    });

    if (existingRun) {
      return {
        month: currentMonth,
        year: currentYear,
        eligibleEmployeesCount: 0,
        accruedCount: 0,
        alreadyProcessed: true,
        accrualAmountPerEmployee: accrualAmount,
        annualCap,
        details: `Leave accrual already completed for ${currentMonth}/${currentYear} on ${existingRun.executedAt}. Use force: true to re-run.`,
      };
    }
  }

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

  // Find or create default Casual Leave type
  let clType = await db.collection("leave_types").findOne({
    tenantId,
    $or: [
      { code: "CL" },
      { name: { $regex: "casual", $options: "i" } },
    ],
  });

  if (!clType) {
    const clInsert = await db.collection("leave_types").insertOne({
      tenantId,
      name: "Casual Leave",
      code: "CL",
      description: "Standard statutory casual leave",
      daysAllowed: annualCap,
      isPaid: true,
      createdAt: new Date(),
    } as any);
    clType = { _id: clInsert.insertedId, name: "Casual Leave", code: "CL" };
  }

  const clTypeId = clType._id ? clType._id.toString() : clType.id;
  let accruedCount = 0;

  for (const user of activeUsers as any[]) {
    const userId = user._id ? user._id.toString() : user.id;

    // Fetch current leave balance for this year
    const existingBalance = await db.collection("leave_balances").findOne({
      tenantId,
      userId,
      leaveTypeId: clTypeId,
      year: currentYear,
    });

    if (existingBalance) {
      const currentAllocated = Number(existingBalance.totalAllocated) || 0;
      const currentRemaining = Number(existingBalance.remaining) || 0;

      // Cap at 18 days per year
      const newAllocated = Math.min(annualCap, currentAllocated + accrualAmount);
      const actualCredit = newAllocated - currentAllocated;

      if (actualCredit > 0) {
        const newRemaining = currentRemaining + actualCredit;

        await db.collection("leave_balances").updateOne(
          { _id: existingBalance._id },
          {
            $set: {
              totalAllocated: newAllocated,
              remaining: newRemaining,
              updatedAt: new Date(),
            },
          }
        );

        // Audit entry in leave_balance_history
        await db.collection("leave_balance_history").insertOne({
          tenantId,
          userId,
          leaveTypeId: clTypeId,
          changeType: "allocated",
          amount: actualCredit,
          previousBalance: currentRemaining,
          newBalance: newRemaining,
          notes: `Automated monthly statutory leave accrual (${currentMonth}/${currentYear}): +${actualCredit} days`,
          createdAt: new Date(),
        } as any);

        accruedCount++;
      }
    } else {
      // First allocation of the year for this employee
      const initialRemaining = Math.min(annualCap, accrualAmount);

      await db.collection("leave_balances").insertOne({
        tenantId,
        userId,
        leaveTypeId: clTypeId,
        leavePlanId: "default",
        totalAllocated: initialRemaining,
        used: 0,
        pending: 0,
        remaining: initialRemaining,
        carriedForward: 0,
        year: currentYear,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await db.collection("leave_balance_history").insertOne({
        tenantId,
        userId,
        leaveTypeId: clTypeId,
        changeType: "allocated",
        amount: initialRemaining,
        previousBalance: 0,
        newBalance: initialRemaining,
        notes: `Initial monthly statutory leave accrual (${currentMonth}/${currentYear}): +${initialRemaining} days`,
        createdAt: new Date(),
      } as any);

      accruedCount++;
    }
  }

  // Audit log the cron run
  await db.collection("cron_job_logs").insertOne({
    tenantId,
    jobName: "monthly_leave_accrual",
    runKey: runId,
    executedAt: new Date(),
    status: "success",
    recordsAffected: accruedCount,
    details: `Successfully credited +${accrualAmount} days CL to ${accruedCount} of ${activeUsers.length} active employees (annual cap: ${annualCap} days).`,
  } as any);

  return {
    month: currentMonth,
    year: currentYear,
    eligibleEmployeesCount: activeUsers.length,
    accruedCount,
    alreadyProcessed: false,
    accrualAmountPerEmployee: accrualAmount,
    annualCap,
    details: `Processed leave accruals for ${currentMonth}/${currentYear}: ${accruedCount} employees updated.`,
  };
}
