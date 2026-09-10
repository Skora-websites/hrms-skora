import { NextRequest, NextResponse } from "next/server";
import {
  getProbationPolicies,
  getProbationPolicyById,
  createProbationPolicy,
  updateProbationPolicy,
  deleteProbationPolicy,
  getProbationReviews,
  getProbationReviewById,
  createProbationReview,
  getDueProbationReviews,
  getProbationDashboard,
} from "@/services/hrm/probation";
import { requireAuth, requireAdmin, isErrorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");
    const dashboard = searchParams.get("dashboard");
    const due = searchParams.get("due");

    if (dashboard === "true") {
      if (auth.role === "employee") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const dashData = await getProbationDashboard(tenantId);
      return NextResponse.json({ data: dashData });
    }

    if (type === "reviews" && userId) {
      const reviews = await getProbationReviews(userId);
      return NextResponse.json({ data: reviews });
    }

    if (type === "review" && id) {
      const review = await getProbationReviewById(id);
      if (!review) {
        return NextResponse.json({ error: "Review not found" }, { status: 404 });
      }
      return NextResponse.json({ data: review });
    }

    if (due === "true") {
      const dueReviews = await getDueProbationReviews(tenantId);
      return NextResponse.json({ data: dueReviews });
    }

    if (id) {
      const policy = await getProbationPolicyById(id);
      if (!policy) {
        return NextResponse.json({ error: "Probation policy not found" }, { status: 404 });
      }
      return NextResponse.json({ data: policy });
    }

    const policies = await getProbationPolicies(tenantId);
    return NextResponse.json({ data: policies });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/probation error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const body = await request.json();
    const action = body.action;

    if (action === "review") {
      if (!body.userId || !body.reviewedById) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      const review = await createProbationReview(tenantId, body);
      return NextResponse.json({ data: review }, { status: 201 });
    }

    if (!body.name) {
      return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
    }

    const policy = await createProbationPolicy(tenantId, body);
    return NextResponse.json({ data: policy }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/probation error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    const body = await request.json();
    const policy = await updateProbationPolicy(id, body);
    if (!policy) {
      return NextResponse.json({ error: "Probation policy not found" }, { status: 404 });
    }

    return NextResponse.json({ data: policy });
  } catch (error: any) {
    console.error("PATCH /api/hrm/v2/probation error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    const deleted = await deleteProbationPolicy(id);
    if (!deleted) {
      return NextResponse.json({ error: "Probation policy not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/hrm/v2/probation error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
