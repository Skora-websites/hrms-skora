import { NextRequest, NextResponse } from "next/server";
import { getChatHistory, saveChatMessage, getAISuggestions } from "@/services/hrm/ai";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mongo-helper";
import { ObjectId } from "mongodb";

const HR_LEVEL_ROLES = new Set(["super_admin", "hr_admin", "admin"]);

async function isDirectReportOf(managerId: string, employeeId: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const employee = await db.collection("users").findOne({ _id: new ObjectId(employeeId) });
    return (employee as any)?.reportingManager === managerId;
  } catch {
    return false;
  }
}

/** Chat history is private: users see their own, HR sees all, managers see
 *  only their direct reports. */
async function canAccessChatHistory(callerId: string, callerRole: string, targetUserId: string): Promise<boolean> {
  if (targetUserId === callerId) return true;
  if (HR_LEVEL_ROLES.has(callerRole)) return true;
  if (callerRole === "manager") return isDirectReportOf(callerId, targetUserId);
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");

    // Employees can only access their own chat history; managers only their
    // reports' — previously any manager could read any user's history.
    if (userId && !(await canAccessChatHistory(auth.userId, auth.role, userId))) {
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

    if (!userId || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "userId and content are required" }, { status: 400 });
    }
    if (content.length > 5000) {
      return NextResponse.json({ error: "Message must be 5000 characters or fewer" }, { status: 400 });
    }

    // Users can only save their own chat messages
    if (userId !== auth.userId) {
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
