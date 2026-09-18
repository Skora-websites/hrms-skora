import "server-only";
import { ObjectId } from "mongodb";
import {
  notificationsService,
  notificationTemplatesService,
} from "@/lib/hrm/firestore";
import { getDb } from "@/lib/db/mongo-helper";
import type {
  Notification,
  NotificationTemplate,
} from "@/types";

// ══════════════════════════════════════════════════════════════════
// Notifications Service
// ══════════════════════════════════════════════════════════════════

export async function getNotificationTemplates(tenantId: string): Promise<NotificationTemplate[]> {
  return notificationTemplatesService.findManyInTenant(tenantId, {
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function createNotificationTemplate(
  tenantId: string,
  data: Partial<NotificationTemplate>
): Promise<NotificationTemplate> {
  return notificationTemplatesService.create({ ...data, tenantId } as any);
}

export async function updateNotificationTemplate(
  id: string,
  data: Partial<NotificationTemplate>
): Promise<NotificationTemplate | null> {
  return notificationTemplatesService.update(id, data as any);
}

// ── Notifications ──────────────────────────────────────

export async function getUserNotifications(
  userId: string,
  options: {
    limitCount?: number;
    unreadOnly?: boolean;
  } = {}
): Promise<Notification[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [
    { field: "userId", op: "==", value: userId },
  ];
  if (options.unreadOnly) {
    where.push({ field: "isRead", op: "==", value: false });
  }

  return notificationsService.findMany({
    where,
    orderByField: "createdAt",
    orderByDirection: "desc",
    limitCount: options.limitCount || 50,
  });
}

export async function sendNotification(
  data: {
    tenantId: string;
    userId: string;
    title: string;
    body: string;
    type: Notification["type"];
    referenceId?: string;
    referenceType?: string;
  }
): Promise<Notification> {
  return notificationsService.create({
    ...data,
    isRead: false,
  } as any);
}

export async function sendBulkNotifications(
  notifications: Array<{
    tenantId: string;
    userId: string;
    title: string;
    body: string;
    type: Notification["type"];
    referenceId?: string;
    referenceType?: string;
  }>
): Promise<Notification[]> {
  const results: Notification[] = [];
  for (const notif of notifications) {
    results.push(await sendNotification(notif));
  }
  return results;
}

export async function markAsRead(id: string): Promise<Notification | null> {
  return notificationsService.update(id, {
    isRead: true,
    readAt: new Date(),
  } as any);
}

export async function markAllAsRead(userId: string): Promise<void> {
  // Single bulk update — the previous per-document loop did one DB write per
  // unread notification (N sequential round-trips on busy accounts).
  await notificationsService.updateWhere(
    [
      { field: 'userId', op: '==', value: userId },
      { field: 'isRead', op: '==', value: false },
    ],
    { isRead: true, readAt: new Date() } as any
  );
}

export async function getUnreadCount(userId: string): Promise<number> {
  const unread = await getUserNotifications(userId, { unreadOnly: true });
  return unread.length;
}

// ── Role / Department fan-out helpers ──────────────────
//
// The notification bell only shows what is written to the `notifications`
// collection. Business events (project created, project assigned, task
// assigned, member added) must fan out to the right audience or the user
// never learns about them. These helpers centralize audience resolution.

/** Full user record lookup (id may be ObjectId string or legacy `id`). */
export async function getUserById(userId: string): Promise<Record<string, any> | null> {
  try {
    const db = await getDb();
    if (!db || !userId) return null;
    const users = db.collection("users");
    if (ObjectId.isValid(userId)) {
      const byId = await users.findOne({ _id: new ObjectId(userId) });
      if (byId) return byId;
    }
    return await users.findOne({ id: userId });
  } catch {
    return null;
  }
}

/** Resolve a user's displayName from the users collection. */
export async function getUserName(userId: string): Promise<string> {
  try {
    const db = await getDb();
    if (!db) return "Someone";
    const user = ObjectId.isValid(userId)
      ? await db.collection("users").findOne({ _id: new ObjectId(userId) })
      : null;
    return (user as any)?.displayName || (user as any)?.email || "Someone";
  } catch {
    return "Someone";
  }
}

/** All active user ids with a given role in the tenant. */
export async function getUserIdsByRole(
  tenantId: string,
  role: string,
  excludeUserId?: string
): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const docs = await db
    .collection("users")
    .find({
      tenantId,
      role,
      status: { $nin: ["disabled", "inactive"] },
      ...(excludeUserId && ObjectId.isValid(excludeUserId)
        ? { _id: { $ne: new ObjectId(excludeUserId) } }
        : {}),
    })
    .project<{ _id: ObjectId }>({ _id: 1 })
    .toArray();
  return docs.map((d) => d._id.toString());
}

/** All active employee ids in a department (matched on either field name). */
export async function getEmployeeIdsByDepartment(
  tenantId: string,
  department: string,
  excludeUserId?: string
): Promise<string[]> {
  if (!department) return [];
  const db = await getDb();
  if (!db) return [];
  const docs = await db
    .collection("users")
    .find({
      tenantId,
      role: { $in: ["employee", "agent"] },
      status: { $nin: ["disabled", "inactive"] },
      $or: [{ department: department }, { departmentName: department }],
      ...(excludeUserId && ObjectId.isValid(excludeUserId)
        ? { _id: { $ne: new ObjectId(excludeUserId) } }
        : {}),
    })
    .project<{ _id: ObjectId }>({ _id: 1 })
    .toArray();
  return docs.map((d) => d._id.toString());
}

/**
 * Notify a set of users in bulk, skipping the actor themselves and
 * de-duplicating ids. Failures are logged but never block the business
 * action that triggered them.
 */
export async function notifyUsers(
  data: {
    tenantId: string;
    userIds: string[];
    title: string;
    body: string;
    type: Notification["type"];
    referenceId?: string;
    referenceType?: string;
  },
  options: { excludeUserId?: string } = {}
): Promise<number> {
  const seen = new Set<string>();
  const docs: Array<Record<string, unknown>> = [];
  for (const userId of data.userIds) {
    if (!userId || seen.has(userId) || userId === options.excludeUserId) continue;
    seen.add(userId);
    docs.push({
      tenantId: data.tenantId,
      userId,
      title: data.title,
      body: data.body,
      type: data.type,
      referenceId: data.referenceId,
      referenceType: data.referenceType,
      isRead: false,
    });
  }
  if (docs.length === 0) return 0;
  try {
    // One bulk insert instead of N sequential round-trips — project creation
    // fans out to entire departments, so per-user awaits made POSTs take 15s+.
    const result = await notificationsService.createMany(docs as any);
    return result ?? docs.length;
  } catch (err) {
    console.error("[notifications] bulk notify failed, falling back to per-user", err);
    // Last-resort fallback: still deliver, one at a time.
    let sent = 0;
    for (const doc of docs) {
      try {
        await sendNotification(doc as any);
        sent += 1;
      } catch (e) {
        console.error("[notifications] failed to notify user", doc.userId, e);
      }
    }
    return sent;
  }
}

// ── Template Rendering ─────────────────────────────────

export function renderNotificationTemplate(
  template: NotificationTemplate,
  variables: Record<string, string>
): { subject?: string; content: string } {
  let content = template.content;
  let subject = template.subject;

  for (const [key, value] of Object.entries(variables)) {
    content = content.replace(new RegExp(`{{${key}}}`, "g"), value);
    if (subject) {
      subject = subject.replace(new RegExp(`{{${key}}}`, "g"), value);
    }
  }

  return { subject, content };
}

// ── Create Notification from Template ──────────────────

export async function sendFromTemplate(
  tenantId: string,
  templateId: string,
  recipientId: string,
  variables: Record<string, string>
): Promise<Notification | null> {
  const template = await notificationTemplatesService.findById(templateId);
  if (!template) return null;

  const { content: body, subject } = renderNotificationTemplate(template, variables);

  return sendNotification({
    tenantId,
    userId: recipientId,
    title: subject || template.name,
    body,
    type: "general",
  });
}
