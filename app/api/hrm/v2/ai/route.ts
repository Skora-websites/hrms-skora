import { NextRequest, NextResponse } from "next/server";
import { getChatHistory, saveChatMessage, getAISuggestions } from "@/services/hrm/ai";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");

    // Employees can only access their own chat history
    if (auth.role === "employee" && userId !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (type === "suggestions" && userId) {
      const suggestions = await getAISuggestions(tenantId, userId);
      return NextResponse.json({ data: suggestions });
    }

    if (userId) {
      const messages = await getChatHistory(tenantId, userId);
      return NextResponse.json({ data: messages });
    }

    return NextResponse.json({ data: [] });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/ai error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const body = await request.json();
    const { userId, content, role, metadata } = body;

    // Employees can only save their own chat messages
    if (auth.role === "employee" && userId !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const message = await saveChatMessage(tenantId, {
      userId,
      role: role || "user",
      content,
      metadata,
    });

    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/ai error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
