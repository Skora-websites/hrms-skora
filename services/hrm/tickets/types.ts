export type TicketStatus = "open" | "in_progress" | "on_hold" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type TransferDirection = "agent" | "manager";
export type TransferStatus = "pending" | "approved" | "rejected";

export type CommentKind = "message" | "system";
export type CommentVisibility = "public" | "internal";

export interface TicketAttachment {
  name: string;
  url: string;
  size: number;
  mime: string;
  uploadedAt: string;
}

export interface TicketTransfer {
  id?: string;
  ticketId: string;
  fromUserId: string;
  fromUserName: string;
  toDepartment: string;
  toUserId?: string | null;
  toUserName?: string | null;
  direction: TransferDirection;
  priority: TicketPriority;
  status: TransferStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string;
  note?: string;
  sentAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  department: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  assignedBy?: string | null;
  activeTransfer?: TicketTransfer | null;
  attachments?: TicketAttachment[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorRole: string;
  body: string;
  kind: CommentKind;
  visibility: CommentVisibility;
  attachments?: TicketAttachment[];
  deliveredAt?: string | null;
  createdAt: string;
}

export interface TicketCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  color?: string;
  isActive: boolean;
}

export interface RoutingRule {
  id: string;
  name: string;
  matchType: "any" | "all";
  conditions: Array<{
    field: "keyword" | "category" | "priority" | "requester";
    operator: "contains" | "equals";
    value: string;
  }>;
  actions: Array<{
    type: "assign_user" | "assign_department" | "set_priority" | "set_status";
    value: string;
    label?: string;
  }>;
  status: "active" | "paused";
  order: number;
}
