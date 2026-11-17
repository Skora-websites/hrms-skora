import { NextRequest, NextResponse } from "next/server";
import {
  getKudosFeed,
  getKudosLeaderboard,
  getRemainingMonthlyAllowance,
  sendKudos,
  toggleKudosLike,
} from "@/services/hrm/engage/kudos";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest } from "@/lib/api-handler";
import { hrmUsersService } from "@/lib/hrm/firestore";

// ── GET ─────────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";
  const { searchParams } = new URL(request.url);
  const leaderboard = searchParams.get("leaderboard") === "true";
  const allowance = searchParams.get("allowance") === "true";
  const coreValue = searchParams.get("coreValue") || undefined;
  const userId = searchParams.get("userId") || undefined;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;

  if (leaderboard) {
    const board = await getKudosLeaderboard(tenantId);
    return NextResponse.json({ success: true, data: board });
  }

  if (allowance) {
    const allow = await getRemainingMonthlyAllowance(tenantId, auth.userId);
    return NextResponse.json({ success: true, data: allow });
  }

  const feed = await getKudosFeed(tenantId, { coreValue, userId, limit });
  const myAllowance = await getRemainingMonthlyAllowance(tenantId, auth.userId);

  return NextResponse.json({
    success: true,
    data: feed,
    allowance: myAllowance,
    count: feed.length,
  });
});

// ── POST ────────────────────────────────────────────────

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Request body must be valid JSON");

  const {
    action,
    kudosId,
    receiverId,
    receiverName,
    receiverEmail,
    receiverAvatar,
    points,
    badge,
    coreValue,
    message,
    department,
  } = body;

  const currentUser = await hrmUsersService.findById(auth.userId);
  const currentUserName = currentUser?.displayName || currentUser?.email || "Employee";

  // Toggle Like
  if (action === "like") {
    if (!kudosId) return badRequest("kudosId is required to toggle like");
    const result = await toggleKudosLike(
      tenantId,
      kudosId,
      auth.userId,
      currentUserName
    );
    return NextResponse.json({ success: true, data: result });
  }

  // Send Kudos
  if (!receiverId) return badRequest("receiverId is required");
  if (!message || !message.trim()) return badRequest("A recognition message is required");

  try {
    const kudos = await sendKudos(tenantId, {
      senderId: auth.userId,
      senderName: currentUserName,
      senderEmail: currentUser?.email || "",
      senderAvatar: (currentUser as any)?.avatar || (currentUser as any)?.image || "",
      receiverId,
      receiverName: receiverName || "Colleague",
      receiverEmail: receiverEmail || "",
      receiverAvatar: receiverAvatar || "",
      department: department || (currentUser as any)?.department || "General",
      points: points ? Number(points) : 10,
      badge: badge || "Team Player",
      coreValue: coreValue || "#Teamwork",
      message: message.trim(),
    });

    return NextResponse.json(
      { success: true, data: kudos, message: "Kudos sent successfully!" },
      { status: 201 }
    );
  } catch (err: any) {
    return badRequest(err.message || "Failed to send kudos");
  }
});
