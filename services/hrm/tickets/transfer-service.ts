import "server-only";
import { getDb, ObjectId } from "@/lib/db/mysql";
import type { TicketTransfer, TicketPriority, TransferDirection } from "./types";

export interface CreateTransferInput {
  ticketId: string;
  fromUserId: string;
  fromUserName: string;
  toDepartment: string;
  toUserId?: string | null;
  toUserName?: string | null;
  direction: TransferDirection;
  priority: TicketPriority;
  note?: string;
}

export async function createTicketTransfer(
  tenantId: string = "default",
  input: CreateTransferInput
): Promise<TicketTransfer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const ticket = await db.collection("tickets").findOne({
    tenantId,
    _id: ObjectId.isValid(input.ticketId) ? new ObjectId(input.ticketId) : input.ticketId,
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  const transferDoc = {
    tenantId,
    ticketId: input.ticketId,
    fromUserId: input.fromUserId,
    fromUserName: input.fromUserName,
    toDepartment: input.toDepartment,
    toUserId: input.toUserId || null,
    toUserName: input.toUserName || null,
    direction: input.direction,
    priority: input.priority,
    status: "pending" as const,
    note: input.note || "",
    sentAt: new Date().toISOString(),
    createdAt: new Date(),
  };

  const res = await db.collection("ticket_transfers").insertOne(transferDoc as any);
  const transferId = res.insertedId.toString();

  // Attach active transfer reference to ticket
  await db.collection("tickets").updateOne(
    { _id: ticket._id },
    {
      $set: {
        activeTransfer: { id: transferId, ...transferDoc },
        updatedAt: new Date().toISOString(),
      },
    }
  );

  // Insert system comment on ticket
  await db.collection("ticket_comments").insertOne({
    tenantId,
    ticketId: input.ticketId,
    authorId: input.fromUserId,
    authorName: "System",
    authorEmail: "system@skorasoft.internal",
    authorRole: "system",
    body: `Inter-department transfer requested to ${input.toDepartment} (${input.direction === "manager" ? "Direct to Manager" : `Target Agent: ${input.toUserName || "Any"}`}). Priority: ${input.priority.toUpperCase()}`,
    kind: "system",
    visibility: "internal",
    createdAt: new Date().toISOString(),
  } as any);

  return {
    id: transferId,
    ...transferDoc,
  };
}

export async function decideTicketTransfer(
  tenantId: string = "default",
  transferId: string,
  decision: "approved" | "rejected",
  decidedBy: { userId: string; userName: string },
  rejectionReason?: string
): Promise<TicketTransfer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const transfer = await db.collection("ticket_transfers").findOne({
    tenantId,
    _id: ObjectId.isValid(transferId) ? new ObjectId(transferId) : transferId,
  });

  if (!transfer) {
    throw new Error("Transfer request not found");
  }

  const nowIso = new Date().toISOString();
  const updateData: any = {
    status: decision,
    updatedAt: new Date(),
  };

  if (decision === "approved") {
    updateData.approvedBy = decidedBy.userName;
    updateData.approvedAt = nowIso;
  } else {
    updateData.rejectedBy = decidedBy.userName;
    updateData.rejectedAt = nowIso;
    updateData.rejectionReason = rejectionReason || "Transfer rejected by receiving department manager";
  }

  await db.collection("ticket_transfers").updateOne(
    { _id: transfer._id },
    { $set: updateData }
  );

  // Update ticket
  const ticket = await db.collection("tickets").findOne({
    tenantId,
    _id: ObjectId.isValid(transfer.ticketId) ? new ObjectId(transfer.ticketId) : transfer.ticketId,
  });

  if (ticket) {
    const ticketUpdates: any = {
      activeTransfer: null,
      updatedAt: nowIso,
    };

    if (decision === "approved") {
      ticketUpdates.department = transfer.toDepartment;
      ticketUpdates.priority = transfer.priority; // Preserves sender's priority
      if (transfer.toUserId) {
        ticketUpdates.assigneeId = transfer.toUserId;
        ticketUpdates.assigneeName = transfer.toUserName;
      } else {
        ticketUpdates.assigneeId = null;
        ticketUpdates.assigneeName = null;
      }
    }

    await db.collection("tickets").updateOne({ _id: ticket._id }, { $set: ticketUpdates });

    // Insert system note
    await db.collection("ticket_comments").insertOne({
      tenantId,
      ticketId: transfer.ticketId,
      authorId: decidedBy.userId,
      authorName: "System",
      authorEmail: "system@skorasoft.internal",
      authorRole: "system",
      body: decision === "approved"
        ? `Transfer approved by ${decidedBy.userName}. Ticket transferred to ${transfer.toDepartment}.`
        : `Transfer rejected by ${decidedBy.userName}. Reason: ${rejectionReason || "None provided"}.`,
      kind: "system",
      visibility: "internal",
      createdAt: nowIso,
    } as any);
  }

  return {
    ...transfer,
    ...updateData,
  };
}

export async function getPendingTransfersForDepartment(
  tenantId: string = "default",
  department: string
): Promise<TicketTransfer[]> {
  const db = await getDb();
  if (!db) return [];

  const list = await db
    .collection("ticket_transfers")
    .find({
      tenantId,
      toDepartment: department,
      status: "pending",
    })
    .sort({ createdAt: -1 })
    .toArray();

  return (list as any[]).map((t) => ({
    id: t._id ? t._id.toString() : String(t.id),
    ticketId: t.ticketId,
    fromUserId: t.fromUserId,
    fromUserName: t.fromUserName,
    toDepartment: t.toDepartment,
    toUserId: t.toUserId,
    toUserName: t.toUserName,
    direction: t.direction,
    priority: t.priority,
    status: t.status,
    note: t.note,
    sentAt: t.sentAt,
  }));
}
