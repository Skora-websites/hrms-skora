import { NextRequest, NextResponse } from "next/server";
import {
  getOnboardingPrograms,
  getOnboardingById,
  createOnboardingProgram,
  updateOnboardingProgram,
  deleteOnboardingProgram,
  getOnboardingDashboard,
  initiateEmployeeOnboarding,
  getEmployeeOnboardingTasks,
  updateOnboardingTaskStatus,
  getPendingOnboardingTasks,
} from "@/services/hrm/onboarding";
import { requireAuth, requireAdmin, isErrorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    const dashboard = searchParams.get("dashboard");
    const pending = searchParams.get("pending");
    const employeeTasks = searchParams.get("employeeTasks");

    if (dashboard === "true") {
      if (auth.role === "employee") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const dashData = await getOnboardingDashboard(tenantId);
      return NextResponse.json({ data: dashData });
    }

    if (pending === "true") {
      const tasks = await getPendingOnboardingTasks(tenantId);
      return NextResponse.json({ data: tasks });
    }

    if (employeeTasks === "true" && userId) {
      if (auth.role === "employee" && userId !== auth.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const tasks = await getEmployeeOnboardingTasks(tenantId, userId);
      return NextResponse.json({ data: tasks });
    }

    if (id) {
      const program = await getOnboardingById(id);
      if (!program) {
        return NextResponse.json({ error: "Onboarding program not found" }, { status: 404 });
      }
      return NextResponse.json({ data: program });
    }

    const programs = await getOnboardingPrograms(tenantId);
    return NextResponse.json({ data: programs });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/onboarding error:", error);
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

    if (action === "initiate" && body.onboardingId && body.userId) {
      const tasks = await initiateEmployeeOnboarding(tenantId, body.onboardingId, body.userId);
      return NextResponse.json({ data: tasks }, { status: 201 });
    }

    if (action === "update_task" && body.taskId) {
      const updated = await updateOnboardingTaskStatus(body.taskId, body.status, body.completedById);
      if (!updated) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      return NextResponse.json({ data: updated });
    }

    if (!body.name) {
      return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
    }

    const program = await createOnboardingProgram(tenantId, body);
    return NextResponse.json({ data: program }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/onboarding error:", error);
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
    const updated = await updateOnboardingProgram(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Onboarding program not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PATCH /api/hrm/v2/onboarding error:", error);
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

    const deleted = await deleteOnboardingProgram(id);
    if (!deleted) {
      return NextResponse.json({ error: "Onboarding program not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/hrm/v2/onboarding error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
