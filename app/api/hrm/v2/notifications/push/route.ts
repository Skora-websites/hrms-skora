import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mongo-helper";

/**
 * POST /api/hrm/v2/notifications/push
 * 
 * Send push notification to a specific user or all users.
 * Used by the server to notify employees of:
 * - Leave approval/rejection
 * - Early departure requests
 * - Onboarding status updates
 * - Attendance reminders
 * - Announcements
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    // Only admins and managers can send push notifications
    if (auth.role === "employee") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, title, body: notificationBody, data, type } = body;

    if (!title || !notificationBody) {
      return NextResponse.json(
        { error: "Title and body are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    // Store notification in database
    const notification = {
      title,
      body: notificationBody,
      type: type || "info",
      data: data || {},
      sentBy: auth.userId,
      sentTo: userId || "all",
      createdAt: new Date(),
      read: false,
    };

    await db.collection("push_notifications").insertOne(notification);

    // If userId is specified, find their push token
    if (userId) {
      const user = await db.collection("users").findOne({ _id: userId });
      if (user?.pushToken) {
        // In production, send via FCM/APNs here
        // For now, store for delivery when user opens app
        console.log(`Push notification queued for ${userId}: ${title}`);
      }
    }

    return NextResponse.json({ success: true, notification });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/notifications/push error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/hrm/v2/notifications/push
 * 
 * Get push notifications for the current user.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    const notifications = await db
      .collection("push_notifications")
      .find({
        $or: [
          { sentTo: auth.userId },
          { sentTo: "all" },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ data: notifications });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/notifications/push error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
