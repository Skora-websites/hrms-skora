import { NextRequest, NextResponse } from "next/server";
import {
  initiate360ReviewCycle,
  get360ReviewsForReviewer,
  get360ReviewsForEmployee,
  submit360Feedback,
  calculate360SummaryReport,
  STANDARD_360_COMPETENCIES,
} from "@/services/hrm/performance/360";
import { requireAuth, requireHrLevel, isErrorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const employeeId = searchParams.get("employeeId") || auth.userId;
    const reviewCycle = searchParams.get("reviewCycle") || "Annual-2026";

    if (type === "competencies") {
      return NextResponse.json({ data: STANDARD_360_COMPETENCIES });
    }

    if (type === "my-reviews") {
      const pendingReviews = await get360ReviewsForReviewer(tenantId, auth.userId);
      return NextResponse.json({ data: pendingReviews });
    }

    if (type === "summary") {
      const isPrivileged = ["super_admin", "hr_admin", "admin", "manager"].includes(auth.role || "");
      if (!isPrivileged && employeeId !== auth.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const summary = await calculate360SummaryReport(tenantId, employeeId!, reviewCycle);
      return NextResponse.json({ data: summary });
    }

    const reviews = await get360ReviewsForEmployee(tenantId, employeeId!, reviewCycle);
    return NextResponse.json({ data: reviews });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/performance/360 error:", error);
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

    if (action === "submit-feedback") {
      if (!body.reviewId || !body.ratings) {
        return NextResponse.json({ error: "reviewId and ratings are required" }, { status: 400 });
      }
      const updated = await submit360Feedback(body.reviewId, auth.userId, {
        ratings: body.ratings,
        feedbackStrengths: body.feedbackStrengths,
        feedbackImprovements: body.feedbackImprovements,
      });
      return NextResponse.json({ data: updated });
    }

    if (action === "initiate") {
      const isPrivileged = ["super_admin", "hr_admin", "admin", "manager"].includes(auth.role || "");
      if (!isPrivileged) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      if (!body.employeeId || !Array.isArray(body.raters)) {
        return NextResponse.json({ error: "employeeId and raters array are required" }, { status: 400 });
      }

      const reviews = await initiate360ReviewCycle(
        tenantId,
        body.employeeId,
        body.reviewCycle || "Annual-2026",
        body.raters
      );
      return NextResponse.json({ data: reviews }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/performance/360 error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
