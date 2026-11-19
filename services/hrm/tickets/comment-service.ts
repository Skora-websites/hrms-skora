import "server-only";
import { getDb, ObjectId } from "@/lib/db/mysql";
import { notifyTicketUser, notifyDepartmentManagers } from "./ticket-notifications";
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

  // Trigger non-blocking notifications for public messages
  if (commentDoc.visibility !== "internal") {
    const isRequester = input.authorId === ticket.requesterId;
    const preview = (input.body || "Attachment uploaded").slice(0, 120);

    if (!isRequester && ticket.requesterId) {
      // Staff replied -> notify requester
      notifyTicketUser({
        tenantId,
        userId: ticket.requesterId,
        userEmail: ticket.requesterEmail,
        title: `New Reply on Ticket #${ticket.ticketNumber}`,
        body: `${input.authorName} replied: "${preview}"`,
        ticketId: input.ticketId,
      }).catch(() => {});
    } else if (isRequester) {
      // Requester replied -> notify assignee or department managers
      if (ticket.assigneeId) {
        notifyTicketUser({
          tenantId,
          userId: ticket.assigneeId,
          title: `Requester Replied on Ticket #${ticket.ticketNumber}`,
          body: `${input.authorName}: "${preview}"`,
          ticketId: input.ticketId,
        }).catch(() => {});
      } else if (ticket.department) {
        notifyDepartmentManagers(
          tenantId,
          ticket.department,
          `Requester Replied on Ticket #${ticket.ticketNumber}`,
          `${input.authorName}: "${preview}"`,
          input.ticketId
        ).catch(() => {});
      }
    }
  }

  return {
    id: res.insertedId.toString(),
    ...commentDoc,
  };
}

export async function getTicketComments(
  tenantId: string = "default",
  ticketId: string,
  caller: { userId: string; role: string; isRequester: boolean; isStaff?: boolean }
): Promise<TicketComment[]> {
  const db = await getDb();
  if (!db) return [];

  const filter: any = {
    tenantId,
    ticketId,
  };

  // If caller is not staff (e.g. requester, employee outside department), hide internal notes
  const isSuperAdmin = caller.role === "super_admin" || caller.role === "admin";
  const canSeeInternal = isSuperAdmin || (Boolean(caller.isStaff) && !caller.isRequester);
  if (!canSeeInternal) {
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
