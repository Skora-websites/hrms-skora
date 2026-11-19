import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireHrLevel, isErrorResponse } from "@/lib/api-auth";
import {
  getWorkflowRules,
  createWorkflowRule,
  updateWorkflowRule,
  deleteWorkflowRule,
  triggerWorkflowEvent,
  getWorkflowExecutionLogs,
} from "@/services/hrm/workflow";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const tenantId = auth.tenantId || "default";

    if (searchParams.get("logs") === "true") {
      const limit = Number(searchParams.get("limit") || 50);
      const logs = await getWorkflowExecutionLogs(tenantId, limit);
      return NextResponse.json({ data: logs });
    }

    const rules = await getWorkflowRules(tenantId);
    return NextResponse.json({ data: rules });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/workflow error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireHrLevel();
    if (isErrorResponse(auth)) return auth;

    const tenantId = auth.tenantId || "default";
    const body = await request.json();

    // Trigger test event
    if (body.action === "trigger") {
      if (!body.eventName) {
        return NextResponse.json({ error: "eventName is required" }, { status: 400 });
      }
      const result = await triggerWorkflowEvent(body.eventName, body.payload || {}, tenantId);
      return NextResponse.json({ data: result });
    }

    // Toggle active state
    if (body.action === "toggle") {
      if (!body.id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
      }
      const updated = await updateWorkflowRule(body.id, { isActive: !!body.isActive });
      return NextResponse.json({ data: updated });
    }

    // Create new rule
    if (!body.name || !body.eventName) {
      return NextResponse.json({ error: "name and eventName are required" }, { status: 400 });
    }

    const created = await createWorkflowRule(tenantId, {
      name: body.name,
      description: body.description || "",
      eventName: body.eventName,
      conditions: body.conditions || [],
      actions: body.actions || [],
      isActive: body.isActive !== false,
      priority: body.priority || 1,
      tenantId,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/workflow error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireHrLevel();
    if (isErrorResponse(auth)) return auth;

    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { id, ...updates } = body;
    const updated = await updateWorkflowRule(id, updates);
    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PUT /api/hrm/v2/workflow error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireHrLevel();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id query parameter is required" }, { status: 400 });
    }

    const deleted = await deleteWorkflowRule(id);
    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    console.error("DELETE /api/hrm/v2/workflow error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
