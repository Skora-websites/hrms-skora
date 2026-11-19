import "server-only";
import { getDb, ObjectId } from "@/lib/db/mysql";
import { evaluateRoutingRules } from "./routing-service";
import type { Ticket, TicketStatus, TicketPriority, TicketAttachment } from "./types";

export interface CreateTicketInput {
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  department?: string;
  attachments?: TicketAttachment[];
}

export interface GetTicketsFilter {
  status?: TicketStatus | "all";
  priority?: TicketPriority | "all";
  category?: string;
  department?: string;
  search?: string;
  view?: "my_created" | "assigned_to_me" | "department_queue" | "all";
}

export async function createTicket(
  tenantId: string = "default",
  input: CreateTicketInput
): Promise<Ticket> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const year = new Date().getFullYear();
  const ticketCount = await db.collection("tickets").countDocuments({ tenantId });
  const seq = String(ticketCount + 1).padStart(4, "0");
  const ticketNumber = `TIC-${year}-${seq}`;

  // Evaluate automatic routing rules
  const routing = await evaluateRoutingRules(tenantId, {
    title: input.title,
    description: input.description,
    category: input.category,
    priority: input.priority,
    requesterId: input.requesterId,
    department: input.department,
  });

  const finalDepartment = routing.assignedDepartment || input.department || "General";
  const finalPriority = routing.overridePriority || input.priority || "medium";
  const assigneeId = routing.assignedUserId || null;
  const assigneeName = routing.assignedUserName || null;

  const nowIso = new Date().toISOString();
  const ticketDoc = {
    tenantId,
    ticketNumber,
    title: input.title,
    description: input.description,
    category: input.category,
    priority: finalPriority,
    status: "open" as TicketStatus,
    requesterId: input.requesterId,
    requesterName: input.requesterName,
    requesterEmail: input.requesterEmail,
    department: finalDepartment,
    assigneeId,
    assigneeName,
    assignedBy: routing.matchedRuleName ? `Auto-Rule: ${routing.matchedRuleName}` : null,
    activeTransfer: null,
    attachments: input.attachments || [],
    createdAt: nowIso,
    updatedAt: nowIso,
    closedAt: null,
  };

  const res = await db.collection("tickets").insertOne(ticketDoc as any);
  const ticketId = res.insertedId.toString();

  // Create initial system comment
  await db.collection("ticket_comments").insertOne({
    tenantId,
    ticketId,
    authorId: input.requesterId,
    authorName: "System",
    authorEmail: "system@skorasoft.internal",
    authorRole: "system",
    body: `Ticket #${ticketNumber} created by ${input.requesterName}. Routed to ${finalDepartment} department.${
      assigneeName ? ` Auto-assigned to ${assigneeName}.` : ""
    }`,
    kind: "system",
    visibility: "public",
    createdAt: nowIso,
  } as any);

  return {
    id: ticketId,
    ...ticketDoc,
  };
}

export async function getTickets(
  tenantId: string = "default",
  caller: { userId: string; role: string; department?: string },
  filter: GetTicketsFilter = {}
): Promise<Ticket[]> {
  const db = await getDb();
  if (!db) return [];

  const query: any = { tenantId };

  // Role-based visibility
  const isSuperAdmin = caller.role === "super_admin" || caller.role === "admin";
  const isManager = caller.role === "manager";
  const userDept = caller.department || "";

  if (filter.view === "my_created") {
    query.requesterId = caller.userId;
  } else if (filter.view === "assigned_to_me") {
    query.assigneeId = caller.userId;
  } else if (filter.view === "department_queue") {
    query.department = userDept;
  } else if (!isSuperAdmin) {
    if (isManager) {
      // Managers see their department's tickets + any ticket they requested
      query.$or = [{ department: userDept }, { requesterId: caller.userId }];
    } else {
      // Employees see tickets they requested + tickets assigned to them + open tickets in their dept
      query.$or = [
        { requesterId: caller.userId },
        { assigneeId: caller.userId },
        { department: userDept, status: "open" },
      ];
    }
  }

  // Filter params
  if (filter.status && filter.status !== "all") {
    query.status = filter.status;
  }
  if (filter.priority && filter.priority !== "all") {
    query.priority = filter.priority;
  }
  if (filter.category && filter.category !== "all") {
    query.category = filter.category;
  }
  if (filter.department && filter.department !== "all") {
    query.department = filter.department;
  }

  const list = await db.collection("tickets").find(query).sort({ updatedAt: -1 }).toArray();

  let results = (list as any[]).map((t) => ({
    id: t._id ? t._id.toString() : String(t.id),
    ticketNumber: t.ticketNumber,
    title: t.title,
    description: t.description,
    category: t.category,
    priority: t.priority,
    status: t.status,
    requesterId: t.requesterId,
    requesterName: t.requesterName,
    requesterEmail: t.requesterEmail,
    department: t.department,
    assigneeId: t.assigneeId || null,
    assigneeName: t.assigneeName || null,
    assignedBy: t.assignedBy || null,
    activeTransfer: t.activeTransfer || null,
    attachments: t.attachments || [],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    closedAt: t.closedAt || null,
  }));

  // In-memory text search
  if (filter.search?.trim()) {
    const q = filter.search.toLowerCase().trim();
    results = results.filter(
      (t) =>
        t.ticketNumber.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.requesterName.toLowerCase().includes(q) ||
        t.department.toLowerCase().includes(q)
    );
  }

  return results;
}

export async function getTicketById(
  tenantId: string = "default",
  ticketId: string,
  caller: { userId: string; role: string; department?: string }
): Promise<Ticket | null> {
  const db = await getDb();
  if (!db) return null;

  const t = await db.collection("tickets").findOne({
    tenantId,
    _id: ObjectId.isValid(ticketId) ? new ObjectId(ticketId) : ticketId,
  });

  if (!t) return null;

  // IDOR check: caller must be admin, requester, assignee, or in the department
  const isSuperAdmin = caller.role === "super_admin" || caller.role === "admin";
  const isRequester = t.requesterId === caller.userId;
  const isAssignee = t.assigneeId === caller.userId;
  const isInDept = caller.department && t.department === caller.department;

  if (!isSuperAdmin && !isRequester && !isAssignee && !isInDept) {
    throw new Error("Forbidden: You do not have permission to view this ticket");
  }

  return {
    id: t._id ? t._id.toString() : String(t.id),
    ticketNumber: t.ticketNumber,
    title: t.title,
    description: t.description,
    category: t.category,
    priority: t.priority,
    status: t.status,
    requesterId: t.requesterId,
    requesterName: t.requesterName,
    requesterEmail: t.requesterEmail,
    department: t.department,
    assigneeId: t.assigneeId || null,
    assigneeName: t.assigneeName || null,
    assignedBy: t.assignedBy || null,
    activeTransfer: t.activeTransfer || null,
    attachments: t.attachments || [],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    closedAt: t.closedAt || null,
  };
}

export async function updateTicket(
  tenantId: string = "default",
  ticketId: string,
  updates: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assigneeId?: string | null;
    assigneeName?: string | null;
  },
  updatedBy: { userId: string; userName: string; role: string }
): Promise<Ticket> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const ticket = await db.collection("tickets").findOne({
    tenantId,
    _id: ObjectId.isValid(ticketId) ? new ObjectId(ticketId) : ticketId,
  });

  if (!ticket) throw new Error("Ticket not found");

  const nowIso = new Date().toISOString();
  const patch: any = { updatedAt: nowIso };

  const systemNotes: string[] = [];

  if (updates.status && updates.status !== ticket.status) {
    patch.status = updates.status;
    if (updates.status === "closed" || updates.status === "resolved") {
      patch.closedAt = nowIso;
    } else {
      patch.closedAt = null;
    }
    systemNotes.push(`Status changed from ${ticket.status.toUpperCase()} to ${updates.status.toUpperCase()}`);
  }

  if (updates.priority && updates.priority !== ticket.priority) {
    patch.priority = updates.priority;
    systemNotes.push(`Priority changed to ${updates.priority.toUpperCase()}`);
  }

  if (updates.assigneeId !== undefined && updates.assigneeId !== ticket.assigneeId) {
    patch.assigneeId = updates.assigneeId;
    patch.assigneeName = updates.assigneeName || null;
    patch.assignedBy = updatedBy.userName;
    systemNotes.push(
      updates.assigneeName
        ? `Ticket assigned to ${updates.assigneeName}`
        : "Ticket unassigned"
    );
  }

  await db.collection("tickets").updateOne({ _id: ticket._id }, { $set: patch });

  // Record system comment
  if (systemNotes.length > 0) {
    await db.collection("ticket_comments").insertOne({
      tenantId,
      ticketId,
      authorId: updatedBy.userId,
      authorName: "System",
      authorEmail: "system@skorasoft.internal",
      authorRole: "system",
      body: `${systemNotes.join(" • ")} by ${updatedBy.userName}`,
      kind: "system",
      visibility: "public",
      createdAt: nowIso,
    } as any);
  }

  return {
    ...ticket,
    ...patch,
    id: ticketId,
  };
}

export async function getTicketDashboardStats(
  tenantId: string = "default",
  caller: { userId: string; role: string; department?: string }
) {
  const tickets = await getTickets(tenantId, caller);

  const total = tickets.length;
  const open = tickets.filter((t) => t.status === "open").length;
  const inProgress = tickets.filter((t) => t.status === "in_progress").length;
  const onHold = tickets.filter((t) => t.status === "on_hold").length;
  const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
  const urgent = tickets.filter((t) => t.priority === "urgent" && t.status !== "closed").length;

  return {
    total,
    open,
    inProgress,
    onHold,
    resolved,
    urgent,
    resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 100,
  };
}
