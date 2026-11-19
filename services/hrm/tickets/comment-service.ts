import "server-only";
import { getDb, ObjectId } from "@/lib/db/mysql";
import type { TicketComment, CommentKind, CommentVisibility, TicketAttachment } from "./types";

export interface CreateCommentInput {
  ticketId: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorRole: string;
  body: string;
  kind?: CommentKind;
  visibility?: CommentVisibility;
  attachments?: TicketAttachment[];
}

export async function addTicketComment(
  tenantId: string = "default",
  input: CreateCommentInput
): Promise<TicketComment> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const ticket = await db.collection("tickets").findOne({
    tenantId,
    _id: ObjectId.isValid(input.ticketId) ? new ObjectId(input.ticketId) : input.ticketId,
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  const nowIso = new Date().toISOString();
  const commentDoc = {
    tenantId,
    ticketId: input.ticketId,
    authorId: input.authorId,
    authorName: input.authorName,
    authorEmail: input.authorEmail,
    authorRole: input.authorRole,
    body: input.body,
    kind: input.kind || "message",
    visibility: input.visibility || "public",
    attachments: input.attachments || [],
    deliveredAt: nowIso,
    createdAt: nowIso,
  };

  const res = await db.collection("ticket_comments").insertOne(commentDoc as any);

  // Update ticket's updatedAt
  await db.collection("tickets").updateOne(
    { _id: ticket._id },
    { $set: { updatedAt: nowIso } }
  );

  return {
    id: res.insertedId.toString(),
    ...commentDoc,
  };
}

export async function getTicketComments(
  tenantId: string = "default",
  ticketId: string,
  caller: { userId: string; role: string; isRequester: boolean }
): Promise<TicketComment[]> {
  const db = await getDb();
  if (!db) return [];

  const filter: any = {
    tenantId,
    ticketId,
  };

  // If caller is purely the requester (and not manager/super_admin/agent), hide internal staff notes
  const isStaff = caller.role === "super_admin" || caller.role === "manager" || caller.role === "admin" || !caller.isRequester;
  if (!isStaff) {
    filter.visibility = "public";
  }

  const list = await db
    .collection("ticket_comments")
    .find(filter)
    .sort({ createdAt: 1 })
    .toArray();

  return (list as any[]).map((c) => ({
    id: c._id ? c._id.toString() : String(c.id),
    ticketId: c.ticketId,
    authorId: c.authorId,
    authorName: c.authorName,
    authorEmail: c.authorEmail,
    authorRole: c.authorRole,
    body: c.body,
    kind: c.kind || "message",
    visibility: c.visibility || "public",
    attachments: c.attachments || [],
    deliveredAt: c.deliveredAt,
    createdAt: c.createdAt,
  }));
}
