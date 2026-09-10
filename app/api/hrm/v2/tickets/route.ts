import { NextRequest, NextResponse } from "next/server";
import {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  getTicketDashboardStats,
  getTicketReplies,
  createTicketReply,
  getTicketTimeline,
} from "@/services/hrm/tickets";
import { requireAuth, requireAdmin, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest, notFound, forbidden } from "@/lib/api-handler";

// ── GET ─────────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const dashboard = searchParams.get("dashboard") === "true";
  const replies = searchParams.get("replies") === "true";
  const timeline = searchParams.get("timeline") === "true";
  const ticketId = searchParams.get("ticketId");
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const category = searchParams.get("category");

  // Dashboard stats
  if (dashboard) {
    const stats = await getTicketDashboardStats(tenantId, auth.userId, auth.role);
    return NextResponse.json({ data: stats });
  }

  // Ticket replies
  if (replies && ticketId) {
    const result = await getTicketReplies(ticketId);
    return NextResponse.json({ data: result });
  }

  // Ticket timeline
  if (timeline && ticketId) {
    const result = await getTicketTimeline(ticketId);
    return NextResponse.json({ data: result });
  }

  // Single ticket
  if (id) {
    const ticket = await getTicketById(id);
    if (!ticket) return notFound("Ticket not found");

    // Employees can only view their own tickets or assigned tickets
    if (auth.role === "employee" &&
        ticket.createdById !== auth.userId &&
        ticket.assigneeId !== auth.userId) {
      return forbidden("You can only view your own tickets");
    }

    return NextResponse.json({ data: ticket });
  }

  // List tickets
  const tickets = await getTickets(tenantId, {
    status: status || undefined,
    priority: priority || undefined,
    category: category || undefined,
  });

  // Filter for employee role
  const filtered = auth.role === "employee"
    ? tickets.filter((t) => t.createdById === auth.userId || t.assigneeId === auth.userId)
    : tickets;

  return NextResponse.json({ data: filtered });
}, { label: "Tickets" });

// ── POST ────────────────────────────────────────────────

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Ticket reply
  if (action === "reply") {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const body = await request.json();
    if (!body.ticketId || !body.content) {
      return badRequest("Missing required fields: ticketId, content");
    }

    // Employees can only reply to their own tickets
    if (auth.role === "employee") {
      const ticket = await getTicketById(body.ticketId);
      if (!ticket) return notFound("Ticket not found");
      if (ticket.createdById !== auth.userId) {
        return forbidden("You can only reply to your own tickets");
      }
    }

    const reply = await createTicketReply(tenantId, {
      ...body,
      userId: auth.userId,
      userDisplayName: "Team Member",
    });

    // Auto-reopen ticket when creator replies to a resolved/closed ticket
    if (body.autoReopen) {
      await updateTicket(body.ticketId, { status: "open" }, auth.userId, "System");
    }

    return NextResponse.json({ data: reply }, { status: 201 });
  }

  // Ticket creation
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";

  const body = await request.json();
  if (!body.subject) {
    return badRequest("Missing required field: subject");
  }

  const ticket = await createTicket(tenantId, {
    ...body,
    createdById: auth.userId,
    createdByName: "User",
  });
  return NextResponse.json({ data: ticket }, { status: 201 });
}, { label: "Tickets" });

// ── PATCH ───────────────────────────────────────────────

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return badRequest("id parameter required");

  const body = await request.json();

  // Employees can only close their own tickets
  if (auth.role === "employee") {
    const ticket = await getTicketById(id);
    if (!ticket) return notFound("Ticket not found");
    if (ticket.createdById !== auth.userId) {
      return forbidden("You can only update your own tickets");
    }
    // Employees can only close tickets
    if (body.status && body.status !== "closed") {
      return forbidden("Employees can only close their tickets");
    }
  }

  const ticket = await updateTicket(id, body, auth.userId, auth.role);
  if (!ticket) return notFound("Ticket not found");
  return NextResponse.json({ data: ticket });
}, { label: "Tickets" });

// ── DELETE ──────────────────────────────────────────────

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return badRequest("id parameter required");
  const deleted = await deleteTicket(id);
  if (!deleted) return notFound("Ticket not found");
  return NextResponse.json({ success: true });
}, { label: "Tickets" });
