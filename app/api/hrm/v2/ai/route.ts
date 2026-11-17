import { NextRequest, NextResponse } from "next/server";
import {
  getChatHistory,
  saveChatMessage,
  getAISuggestions,
  processActionableAIQuery,
} from "@/services/hrm/ai";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mongo-helper";
import { ObjectId } from "@/lib/db/mysql";
import { withErrorHandler, badRequest } from "@/lib/api-handler";

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

/** Chat history is private: users see their own, HR sees all, managers see only their direct reports. */
async function canAccessChatHistory(callerId: string, callerRole: string, targetUserId: string): Promise<boolean> {
  if (targetUserId === callerId) return true;
  if (HR_LEVEL_ROLES.has(callerRole)) return true;
  if (callerRole === "manager") return isDirectReportOf(callerId, targetUserId);
  return false;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || auth.userId;
  const type = searchParams.get("type");

  if (userId && !(await canAccessChatHistory(auth.userId, auth.role, userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (type === "suggestions") {
    const suggestions = await getAISuggestions(tenantId, userId);
    return NextResponse.json({ success: true, data: suggestions });
  }

  const messages = await getChatHistory(tenantId, userId);
  return NextResponse.json({ success: true, data: messages });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Request body must be valid JSON");

  const { userId, content, role = "user", metadata } = body;

  const targetUserId = userId || auth.userId;
  if (targetUserId !== auth.userId && !HR_LEVEL_ROLES.has(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (typeof content !== "string" || !content.trim()) {
    return badRequest("content is required");
  }

  if (content.length > 5000) {
    return badRequest("Message must be 5000 characters or fewer");
  }

  // 1. Save user prompt
  const userMessage = await saveChatMessage(tenantId, {
    userId: targetUserId,
    role: "user",
    content: content.trim(),
    metadata,
  });

  // 2. Process query through actionable engine
  const aiResult = await processActionableAIQuery(tenantId, targetUserId, content.trim());

  // 3. Save assistant response
  const assistantMessage = await saveChatMessage(tenantId, {
    userId: targetUserId,
    role: "assistant",
    content: aiResult.reply,
    metadata: {
      cards: aiResult.cards || [],
      intentDetected: aiResult.intentDetected,
    },
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        userMessage,
        assistantMessage,
        reply: aiResult.reply,
        cards: aiResult.cards || [],
        intentDetected: aiResult.intentDetected,
      },
    },
    { status: 201 }
  );
});
