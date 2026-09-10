import { NextRequest, NextResponse } from "next/server";
import {
  getUserNotifications,
  sendNotification,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  getNotificationTemplates,
  createNotificationTemplate,
} from "@/services/hrm/notifications";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const count = searchParams.get("count");

    // Employees can only view their own notifications
    if (auth.role === "employee" && userId !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (count === "true" && userId) {
      const unreadCount = await getUnreadCount(userId);
      return NextResponse.json({ data: { unreadCount } });
    }

    if (type === "templates") {
      // Only admins can view notification templates
      if (auth.role === "employee") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const tenantId = "default";
      const templates = await getNotificationTemplates(tenantId);
      return NextResponse.json({ data: templates });
    }

    if (userId) {
      const notifications = await getUserNotifications(userId, { unreadOnly });
      return NextResponse.json({ data: notifications });
    }

    return NextResponse.json({ data: [] });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/notifications error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const body = await request.json();
    const action = body.action;

    if (action === "send") {
      // Only admins can send notifications to others
      const notification = await sendNotification(body);
      return NextResponse.json({ data: notification }, { status: 201 });
    }

    if (action === "send_to_role") {
      // Send notifications to all users with a specific role
      const { role, title, body: notifBody, type, referenceType, referenceId } = body;
      if (!role || !title || !notifBody) {
        return NextResponse.json({ error: "role, title, and body are required" }, { status: 400 });
      }
      const { getDb } = require("@/lib/db/mongo-helper");
      const db = await getDb();
      if (!db) return NextResponse.json({ error: "Database not available" }, { status: 500 });

      const recipients = await db.collection("users").find({
        role: role,
        tenantId: "default",
      }).toArray();

      const notifications = [];
      for (const recipient of recipients) {
        const notif = await sendNotification({
          tenantId: "default",
          userId: recipient._id.toString(),
          title,
          body: notifBody,
          type: type || "general",
          referenceType,
          referenceId,
        });
        notifications.push(notif);
      }
      return NextResponse.json({ data: notifications }, { status: 201 });
    }

    if (action === "template") {
      // Only admins can manage notification templates
      if (auth.role === "employee") {
        return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
      }
      const tenantId = "default";
      const template = await createNotificationTemplate(tenantId, body);
      return NextResponse.json({ data: template }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/notifications error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const body = await request.json();

    if (id) {
      const notification = await markAsRead(id);
      if (!notification) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }
      return NextResponse.json({ data: notification });
    }

    if (body.markAll && body.userId) {
      // Employees can only mark their own as read
      if (auth.role === "employee" && body.userId !== auth.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await markAllAsRead(body.userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH /api/hrm/v2/notifications error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
