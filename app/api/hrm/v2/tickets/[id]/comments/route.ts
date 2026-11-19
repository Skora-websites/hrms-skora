import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { addTicketComment, getTicketComments } from "@/services/hrm/tickets/comment-service";
import { getDb, ObjectId } from "@/lib/db/mysql";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const ticket = await db.collection("tickets").findOne({
      tenantId: auth.tenantId,
      _id: ObjectId.isValid(id) ? new ObjectId(id) : id,
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const isRequester = ticket.requesterId === auth.userId;

    const comments = await getTicketComments(auth.tenantId, id, {
      userId: auth.userId,
      role: auth.role,
      isRequester,
    });

    return NextResponse.json({ success: true, data: comments });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch ticket conversation" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const body = await request.json();
    if (!body.body?.trim() && (!body.attachments || body.attachments.length === 0)) {
      return NextResponse.json({ error: "Message or attachment is required" }, { status: 400 });
    }

    const userDoc = await db.collection("users").findOne({
      _id: ObjectId.isValid(auth.userId) ? new ObjectId(auth.userId) : auth.userId,
    });
    const userName = userDoc?.displayName || userDoc?.name || userDoc?.email || "User";
    const userEmail = userDoc?.email || "";

    const comment = await addTicketComment(auth.tenantId, {
      ticketId: id,
      authorId: auth.userId,
      authorName: userName,
      authorEmail: userEmail,
      authorRole: auth.role,
      body: (body.body || "").trim(),
      kind: body.kind || "message",
      visibility: body.visibility || "public",
      attachments: body.attachments || [],
    });

    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to post message" },
      { status: 500 }
    );
  }
}
