import { NextRequest, NextResponse } from "next/server";
import { executeShiftAutoPunchout } from "@/services/hrm/automations/autopunchout";
import { executeMonthlyLeaveAccrual } from "@/services/hrm/automations/leave-accrual";
import { executeLateMarkDeductions } from "@/services/hrm/automations/late-mark-deduction";
import { requireHrLevel, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mysql";

const CRON_SECRET = process.env.CRON_SECRET || "skora-hrms-cron-secret-2026";

async function isAuthorized(request: NextRequest): Promise<boolean> {
  // 1. Check Bearer CRON_SECRET header (for aaPanel curl / webhooks)
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token === CRON_SECRET) {
      return true;
    }
  }

  // 2. Check query param secret (optional aaPanel fallback: ?secret=...)
  const querySecret = request.nextUrl.searchParams.get("secret");
  if (querySecret && querySecret === CRON_SECRET) {
    return true;
  }

  // 3. Check active HR Admin / Super Admin web session
  const auth = await requireHrLevel();
  if (!isErrorResponse(auth)) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid CRON_SECRET or session" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");

  // Fetch recent execution history
  if (statusParam === "history") {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    const history = await db
      .collection("cron_job_logs")
      .find({})
      .sort({ executedAt: -1 })
      .limit(25)
      .toArray();

    return NextResponse.json({ success: true, history });
  }

  // Quick execution via GET (for simple aaPanel URL tasks)
  return handleJobExecution(request);
}

export async function POST(request: NextRequest) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid CRON_SECRET or session" },
      { status: 401 }
    );
  }

  return handleJobExecution(request);
}

async function handleJobExecution(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  let job = searchParams.get("job");
  const force = searchParams.get("force") === "true";
  const dryRun = searchParams.get("dryRun") === "true";

  // Also check JSON body if available
  if (request.method === "POST") {
    try {
      const body = await request.clone().json().catch(() => null);
      if (body?.job) job = body.job;
    } catch {
      // Ignore JSON parse errors
    }
  }

  const tenantId = "default";
  const results: Record<string, any> = {};

  try {
    if (job === "auto-punchout" || job === "all" || !job) {
      results.autoPunchout = await executeShiftAutoPunchout(tenantId, { forceAll: force });
    }

    if (job === "leave-accrual" || job === "all") {
      results.leaveAccrual = await executeMonthlyLeaveAccrual(tenantId, { force });
    }

    if (job === "late-deductions" || job === "all") {
      results.lateMarkDeductions = await executeLateMarkDeductions(tenantId, { dryRun });
    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Cron automation ${job || "all"} executed successfully`,
      durationMs,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to execute cron automation",
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
