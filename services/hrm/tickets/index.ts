import "server-only";
import {
  ticketsService,
  ticketRepliesService,
  ticketTimelineService,
} from "@/lib/hrm/firestore";
import { sendNotification } from "@/services/hrm/notifications";
import type { Ticket, TicketReply, TicketTimeline } from "@/types";

// ══════════════════════════════════════════════════════════════════
// Tickets Service
// ══════════════════════════════════════════════════════════════════

// ── Tickets ────────────────────────────────────────────

export async function getTickets(
  tenantId: string,
  options: {
    assigneeId?: string;
    createdById?: string;
    departmentId?: string;
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
  } = {}
): Promise<Ticket[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [];

  if (options.assigneeId) {
    where.push({ field: "assigneeId", op: "==", value: options.assigneeId });
  }
  if (options.createdById) {
    where.push({ field: "createdById", op: "==", value: options.createdById });
  }
  if (options.departmentId) {
    where.push({ field: "departmentId", op: "==", value: options.departmentId });
  }
  if (options.status) {
    where.push({ field: "status", op: "==", value: options.status });
  }
  if (options.priority) {
    where.push({ field: "priority", op: "==", value: options.priority });
  }
  if (options.category) {
    where.push({ field: "category", op: "==", value: options.category });
  }

  return ticketsService.findManyInTenant(tenantId, {
    where: where.length > 0 ? where : undefined,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  return ticketsService.findById(id);
}

export async function createTicket(
  tenantId: string,
  data: {
    subject: string;
    description?: string;
    category: Ticket["category"];
    priority: Ticket["priority"];
    createdById: string;
    createdByName: string;
    assigneeId?: string;
    assigneeName?: string;
    departmentId?: string;
  }
): Promise<Ticket> {
  const ticket = await ticketsService.create({
    tenantId,
    subject: data.subject,
    description: data.description || "",
    category: data.category || "general",
    priority: data.priority || "medium",
    status: "open",
    createdById: data.createdById,
    createdByName: data.createdByName,
    assigneeId: data.assigneeId || "",
    assigneeName: data.assigneeName || "",
    departmentId: data.departmentId || "",
    resolvedAt: null,
    resolvedById: null,
    closedAt: null,
    closedById: null,
    resolution: "",
    attachments: [],
  } as any);

  // Record timeline entry
  await createTicketTimeline(tenantId, {
    ticketId: ticket.id,
    action: "created",
    performedById: data.createdById,
    performedByName: data.createdByName,
    newValue: "open",
    details: `Ticket "${data.subject}" created`,
  });

  // Notify assignee if assigned
  if (data.assigneeId) {
    await sendNotification({
      tenantId,
      userId: data.assigneeId,
      title: "New Ticket Assigned",
      body: `Ticket: "${data.subject}" has been assigned to you`,
      type: "ticket",
      referenceId: ticket.id,
      referenceType: "ticket",
    });
  }

  // Notify admins if no specific assignee
  // (additionally handled by API route)

  return ticket;
}

export async function updateTicket(
  id: string,
  data: Partial<Ticket>,
  performedById?: string,
  performedByName?: string
): Promise<Ticket | null> {
  const oldTicket = await ticketsService.findById(id);
  if (!oldTicket) return null;

  const updateData: Partial<Ticket> = { ...data };

  // Auto-set resolved timestamp
  if (data.status === "resolved" && !data.resolvedAt) {
    updateData.resolvedAt = new Date() as any;
    updateData.resolvedById = performedById;
  }

  // Auto-set closed timestamp
  if (data.status === "closed" && !data.closedAt) {
    updateData.closedAt = new Date() as any;
    updateData.closedById = performedById;
  }

  const updated = await ticketsService.update(id, updateData as any);
  if (!updated) return null;

  // Record timeline for status changes
  if (data.status && data.status !== oldTicket.status) {
    const actionMap: Record<string, TicketTimeline["action"]> = {
      open: "reopened",
      in_progress: "status_updated",
      resolved: "resolved",
      closed: "closed",
    };

    await createTicketTimeline(oldTicket.tenantId, {
      ticketId: id,
      action: actionMap[data.status] || "status_updated",
      performedById: performedById || "",
      performedByName: performedByName || "System",
      previousValue: oldTicket.status,
      newValue: data.status,
      details: `Status changed from ${oldTicket.status} to ${data.status}`,
    });

    // Notify creator about status update
    if (oldTicket.createdById && performedById !== oldTicket.createdById) {
      await sendNotification({
        tenantId: oldTicket.tenantId,
        userId: oldTicket.createdById,
        title: "Ticket Status Updated",
        body: `Ticket "${oldTicket.subject}" status changed to ${data.status}`,
        type: "ticket",
        referenceId: id,
        referenceType: "ticket",
      });
    }
  }

  // Notify about reassignment
  if (data.assigneeId && data.assigneeId !== oldTicket.assigneeId) {
    await createTicketTimeline(oldTicket.tenantId, {
      ticketId: id,
      action: "assigned",
      performedById: performedById || "",
      performedByName: performedByName || "System",
      previousValue: oldTicket.assigneeName || "Unassigned",
      newValue: data.assigneeName || "Assigned",
      details: `Ticket assigned to ${data.assigneeName || "new assignee"}`,
    });

    await sendNotification({
      tenantId: oldTicket.tenantId,
      userId: data.assigneeId,
      title: "Ticket Assigned to You",
      body: `Ticket "${oldTicket.subject}" has been assigned to you`,
      type: "ticket",
      referenceId: id,
      referenceType: "ticket",
    });
  }

  if (data.priority && data.priority !== oldTicket.priority) {
    await createTicketTimeline(oldTicket.tenantId, {
      ticketId: id,
      action: "priority_updated",
      performedById: performedById || "",
      performedByName: performedByName || "System",
      previousValue: oldTicket.priority,
      newValue: data.priority,
      details: `Priority changed from ${oldTicket.priority} to ${data.priority}`,
    });
  }

  return updated;
}

export async function deleteTicket(id: string): Promise<boolean> {
  const replies = await ticketRepliesService.findMany({
    where: [{ field: "ticketId", op: "==", value: id }],
  });
  for (const r of replies) {
    await ticketRepliesService.delete(r.id);
  }

  const timeline = await ticketTimelineService.findMany({
    where: [{ field: "ticketId", op: "==", value: id }],
  });
  for (const t of timeline) {
    await ticketTimelineService.delete(t.id);
  }

  return ticketsService.delete(id);
}

// ── Ticket Dashboard Stats ─────────────────────────────

export async function getTicketDashboardStats(
  tenantId: string,
  userId?: string,
  userRole?: string
): Promise<{
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  tickets: Ticket[];
}> {
  const filter: { assigneeId?: string; createdById?: string } = {};
  if (userId && userRole === "employee") {
    filter.assigneeId = userId;
  }

  const allTickets = await getTickets(tenantId, filter);

  const totalTickets = allTickets.length;
  const openTickets = allTickets.filter((t) => t.status === "open").length;
  const inProgressTickets = allTickets.filter((t) => t.status === "in_progress").length;
  const resolvedTickets = allTickets.filter((t) => t.status === "resolved").length;
  const closedTickets = allTickets.filter((t) => t.status === "closed").length;

  return {
    totalTickets,
    openTickets,
    inProgressTickets,
    resolvedTickets,
    closedTickets,
    tickets: allTickets.slice(0, 10),
  };
}

// ── Ticket Replies ─────────────────────────────────────

export async function getTicketReplies(ticketId: string): Promise<TicketReply[]> {
  return ticketRepliesService.findMany({
    where: [{ field: "ticketId", op: "==", value: ticketId }],
    orderByField: "createdAt",
    orderByDirection: "asc",
  });
}

export async function createTicketReply(
  tenantId: string,
  data: {
    ticketId: string;
    userId: string;
    userDisplayName: string;
    userPhotoURL?: string;
    content: string;
    isInternal: boolean;
  }
): Promise<TicketReply> {
  const reply = await ticketRepliesService.create({
    tenantId,
    ticketId: data.ticketId,
    userId: data.userId,
    userDisplayName: data.userDisplayName,
    userPhotoURL: data.userPhotoURL || "",
    content: data.content,
    isInternal: data.isInternal,
  } as any);

  // Record timeline
  await createTicketTimeline(tenantId, {
    ticketId: data.ticketId,
    action: "replied",
    performedById: data.userId,
    performedByName: data.userDisplayName,
    details: `Reply added: "${data.content.substring(0, 100)}"`,
  });

  // Notify ticket participants
  const ticket = await ticketsService.findById(data.ticketId);
  if (ticket) {
    const notifiedUserIds = new Set<string>();

    // Notify creator if reply is from someone else
    if (ticket.createdById && ticket.createdById !== data.userId) {
      notifiedUserIds.add(ticket.createdById);
    }

    // Notify assignee if reply is from someone else
    if (ticket.assigneeId && ticket.assigneeId !== data.userId) {
      notifiedUserIds.add(ticket.assigneeId);
    }

    for (const userId of notifiedUserIds) {
      await sendNotification({
        tenantId,
        userId,
        title: "New Ticket Reply",
        body: `${data.userDisplayName} replied to "${ticket.subject}"`,
        type: "ticket",
        referenceId: data.ticketId,
        referenceType: "ticket",
      });
    }
  }

  return reply;
}

// ── Ticket Timeline ────────────────────────────────────

export async function getTicketTimeline(ticketId: string): Promise<TicketTimeline[]> {
  return ticketTimelineService.findMany({
    where: [{ field: "ticketId", op: "==", value: ticketId }],
    orderByField: "createdAt",
    orderByDirection: "asc",
  });
}

async function createTicketTimeline(
  tenantId: string,
  data: {
    ticketId: string;
    action: TicketTimeline["action"];
    performedById: string;
    performedByName: string;
    previousValue?: string;
    newValue?: string;
    details?: string;
  }
): Promise<TicketTimeline> {
  return ticketTimelineService.create({
    tenantId,
    ticketId: data.ticketId,
    action: data.action,
    performedById: data.performedById,
    performedByName: data.performedByName,
    previousValue: data.previousValue || "",
    newValue: data.newValue || "",
    details: data.details || "",
  } as any);
}
