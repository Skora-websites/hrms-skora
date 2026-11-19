import { NextRequest, NextResponse } from "next/server";
import {
  getHeadcountPlans,
  upsertHeadcountPlan,
  calculateRealtimeHeadcountVariance,
  getInternalJobPostings,
  getInternalJobPostingById,
  createInternalJobPosting,
  updateInternalJobPosting,
  applyToInternalJobPosting,
} from "@/services/hrm/recruitment/workforce";
import { requireAuth, requireHrLevel, isErrorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    const financialYear = searchParams.get("financialYear") || "2026-2027";

    if (type === "headcount") {
      const isPrivileged = ["super_admin", "hr_admin", "admin", "recruiter", "manager"].includes(auth.role || "");
      if (!isPrivileged) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const plans = await calculateRealtimeHeadcountVariance(tenantId, financialYear);
      return NextResponse.json({ data: plans });
    }

    if (id) {
      const ijp = await getInternalJobPostingById(id);
      if (!ijp) return NextResponse.json({ error: "Job posting not found" }, { status: 404 });
      return NextResponse.json({ data: ijp });
    }

    // Default: Return IJPs (accessible to all authenticated employees)
    const status = (searchParams.get("status") as any) || (auth.role === "employee" ? "open" : undefined);
    const postings = await getInternalJobPostings(tenantId, status);
    return NextResponse.json({ data: postings });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/recruitment/workforce error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";
    const body = await request.json();
    const action = body.action;

    // Any employee can apply for an open IJP
    if (action === "apply-ijp") {
      if (!body.jobId) {
        return NextResponse.json({ error: "jobId is required" }, { status: 400 });
      }
      const result = await applyToInternalJobPosting(
        tenantId,
        body.jobId,
        auth.userId,
        body.notes
      );
      return NextResponse.json({ data: result }, { status: 201 });
    }

    // Privileged actions
    const isHr = ["super_admin", "hr_admin", "admin", "recruiter"].includes(auth.role || "");
    if (!isHr) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (action === "upsert-headcount") {
      if (!body.departmentName) {
        return NextResponse.json({ error: "departmentName is required" }, { status: 400 });
      }
      const plan = await upsertHeadcountPlan(tenantId, body);
      return NextResponse.json({ data: plan }, { status: 201 });
    }

    if (action === "create-ijp") {
      if (!body.jobTitle || !body.department) {
        return NextResponse.json({ error: "jobTitle and department are required" }, { status: 400 });
      }
      const ijp = await createInternalJobPosting(tenantId, body);
      return NextResponse.json({ data: ijp }, { status: 201 });
    }

    if (action === "update-ijp") {
      if (!body.id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
      }
      const updated = await updateInternalJobPosting(body.id, body.data || body);
      return NextResponse.json({ data: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/recruitment/workforce error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
