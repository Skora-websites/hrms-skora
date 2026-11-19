import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import {
  createTicket,
  getTickets,
  updateTicket,
  getTicketDashboardStats,
  type GetTicketsFilter,
} from "@/services/hrm/tickets/ticket-service";
import { getDb, ObjectId } from "@/lib/db/mysql";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    // Resolve user's department and display name
    const userDoc = await db.collection("users").findOne({
      _id: ObjectId.isValid(auth.userId) ? new ObjectId(auth.userId) : auth.userId,
    });
    const userDept = userDoc?.department || userDoc?.departmentName || "General";

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") as any;

    if (view === "stats") {
      const stats = await getTicketDashboardStats(auth.tenantId, {
        userId: auth.userId,
        role: auth.role,
        department: userDept,
      });
      return NextResponse.json({ success: true, stats });
    }

    const filter: GetTicketsFilter = {
      status: (searchParams.get("status") as any) || "all",
      priority: (searchParams.get("priority") as any) || "all",
      category: searchParams.get("category") || "all",
      department: searchParams.get("department") || "all",
      search: searchParams.get("search") || "",
      view: (view as any) || "all",
    };

    const tickets = await getTickets(
      auth.tenantId,
      {
        userId: auth.userId,
        role: auth.role,
        department: userDept,
      },
      filter
    );

    return NextResponse.json({ success: true, data: tickets });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const body = await request.json();
    const title = (body.title || body.subject || "").trim();
    const description = (body.description || body.details || title).trim();
    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    const userDoc = await db.collection("users").findOne({
      _id: ObjectId.isValid(auth.userId) ? new ObjectId(auth.userId) : auth.userId,
    });
    const userName = userDoc?.displayName || userDoc?.name || userDoc?.email || "Employee";
    const userEmail = userDoc?.email || "";
    const userDept = userDoc?.department || userDoc?.departmentName || "General";

    const ticket = await createTicket(auth.tenantId, {
      title,
      description,
      category: body.category || "General",
      priority: body.priority || "medium",
      requesterId: auth.userId,
      requesterName: userName,
      requesterEmail: userEmail,
      department: body.department || userDept,
      attachments: body.attachments || [],
    });

    return NextResponse.json({ success: true, data: ticket }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create ticket" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const body = await request.json();
    if (!body.ticketId) {
      return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
    }

    const userDoc = await db.collection("users").findOne({
      _id: ObjectId.isValid(auth.userId) ? new ObjectId(auth.userId) : auth.userId,
    });
    const userName = userDoc?.displayName || userDoc?.name || userDoc?.email || "Staff";

    const updated = await updateTicket(
      auth.tenantId,
      body.ticketId,
      {
        status: body.status,
        priority: body.priority,
        assigneeId: body.assigneeId,
        assigneeName: body.assigneeName,
      },
      {
        userId: auth.userId,
        userName,
        role: auth.role,
      }
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update ticket" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    if (auth.role !== "admin" && auth.role !== "super_admin") {
      return NextResponse.json({ error: "Only administrators can delete tickets" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    await db.collection("tickets").deleteOne({
      _id: ObjectId.isValid(id) ? new ObjectId(id) : id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete ticket" },
      { status: 500 }
    );
  }
}
