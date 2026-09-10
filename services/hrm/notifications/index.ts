import "server-only";
import {
  notificationsService,
  notificationTemplatesService,
} from "@/lib/hrm/firestore";
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
  const unread = await getUserNotifications(userId, { unreadOnly: true });
  for (const notif of unread) {
    await markAsRead(notif.id);
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  const unread = await getUserNotifications(userId, { unreadOnly: true });
  return unread.length;
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
