"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Search,
  MessageSquare,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  MoreHorizontal,
  Eye,
  Reply,
  Trash2,
  X,
  HelpCircle,
  Wifi,
  DollarSign,
  CalendarDays,
  Globe,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SummaryCards } from "@/components/shared/summary-cards";
import { EmptyState } from "@/components/shared/empty-state";
import { useTickets, useTicketDashboard, useTicketReplies, useTicketTimeline } from "@/hooks/hrm/use-tickets";
import { useMutation } from "@/hooks/use-mutation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

const CATEGORY_CONFIG = {
  hr: { label: "HR", icon: User, color: "info" as const },
  it: { label: "IT", icon: Wifi, color: "primary" as const },
  payroll: { label: "Payroll", icon: DollarSign, color: "success" as const },
  leave: { label: "Leave", icon: CalendarDays, color: "warning" as const },
  general: { label: "General", icon: Globe, color: "outline" as const },
} as const;

const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", color: "danger" as const, icon: AlertCircle },
  high: { label: "High", color: "warning" as const, icon: AlertCircle },
  medium: { label: "Medium", color: "info" as const, icon: Circle },
  low: { label: "Low", color: "success" as const, icon: Circle },
} as const;

const STATUS_CONFIG = {
  open: { label: "Open", color: "info" as const, icon: Circle },
  in_progress: { label: "In Progress", color: "primary" as const, icon: Clock },
  resolved: { label: "Resolved", color: "success" as const, icon: CheckCircle2 },
  closed: { label: "Closed", color: "outline" as const, icon: X },
} as const;

export default function TicketsPage() {
  const { user } = useAuth();
  const { data: dashboard, loading: dashboardLoading, refetch: refetchDashboard } = useTicketDashboard();
  const { data: tickets, loading: ticketsLoading, refetch: refetchTickets } = useTickets();
  const { createRecord, updateRecord, deleteRecord } = useMutation();
  const { success, error } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState<string | null>(null);
  const [showReplyDialog, setShowReplyDialog] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  // ── Create Ticket ────────────────────────────────────
  const handleCreateTicket = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const payload = {
      subject: data.get("subject") as string,
      description: data.get("description") as string,
      category: data.get("category") || "general",
      priority: data.get("priority") || "medium",
    };

    const result = await createRecord("/api/hrm/v2/tickets", payload);
    if (result) {
      success("Ticket created", "Your support ticket has been submitted.");
      setShowCreateDialog(false);
      refetchDashboard();
      refetchTickets();
    } else {
      error("Failed to create ticket");
    }
  }, [createRecord, success, error, refetchDashboard, refetchTickets]);

  // ── Update Ticket Status ─────────────────────────────
  const handleStatusUpdate = useCallback(async (ticketId: string, status: string) => {
    const result = await updateRecord(`/api/hrm/v2/tickets?id=${ticketId}`, { status });
    if (result) {
      success("Ticket updated");
      refetchDashboard();
      refetchTickets();
    }
  }, [updateRecord, success, refetchDashboard, refetchTickets]);

  // ── Assign Ticket ────────────────────────────────────
  const handleAssign = useCallback(async (ticketId: string, assigneeId: string, assigneeName: string) => {
    const result = await updateRecord(`/api/hrm/v2/tickets?id=${ticketId}`, {
      assigneeId,
      assigneeName,
      status: "in_progress",
    });
    if (result) {
      success("Ticket assigned");
      refetchDashboard();
      refetchTickets();
    }
  }, [updateRecord, success, refetchDashboard, refetchTickets]);

  // ── Delete Ticket ────────────────────────────────────
  const handleDeleteTicket = useCallback(async (ticketId: string) => {
    const result = await deleteRecord(`/api/hrm/v2/tickets?id=${ticketId}`);
    if (result) {
      success("Ticket deleted");
      setShowDeleteConfirm(null);
      refetchDashboard();
      refetchTickets();
    }
  }, [deleteRecord, success, refetchDashboard, refetchTickets]);

  // ── Filters ─────────────────────────────────────────
  const filteredTickets = (tickets || []).filter((ticket) => {
    const matchesSearch = !searchQuery ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.createdByName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || ticket.status === statusFilter;
    const matchesCategory = !categoryFilter || ticket.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const stats = dashboard ? [
    { label: "Total Tickets", value: dashboard.totalTickets },
    { label: "Open", value: dashboard.openTickets },
    { label: "In Progress", value: dashboard.inProgressTickets },
    { label: "Resolved", value: dashboard.resolvedTickets },
    { label: "Closed", value: dashboard.closedTickets },
  ] : [];

  // ── Ticket Detail Dialog ─────────────────────────────
  const detailTicket = showDetailDialog ? tickets?.find((t) => t.id === showDetailDialog) : null;

  return (
    <AppShell title="Ticket System">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-h3 text-dark dark:text-white font-bold tracking-tighter">
            Ticket System
          </h2>
          <p className="mt-1 text-sm text-muted">
            Submit and manage support tickets, requests, and issues
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="shrink-0 gap-2">
              <Plus className="h-4 w-4" />
              Create Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTicket} className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium block mb-1">Subject *</label>
                <Input name="subject" required placeholder="Brief description of the issue" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Description</label>
                <textarea
                  name="description"
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                  placeholder="Describe the issue in detail..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Category</label>
                  <select
                    name="category"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    defaultValue="general"
                  >
                    <option value="general">General</option>
                    <option value="hr">HR</option>
                    <option value="it">IT</option>
                    <option value="payroll">Payroll</option>
                    <option value="leave">Leave</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Priority</label>
                  <select
                    name="priority"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    defaultValue="medium"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Submit Ticket</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="mb-6">
        <SummaryCards
          cards={stats}
          loading={dashboardLoading}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search tickets..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={statusFilter || ""}
            onChange={(e) => setStatusFilter(e.target.value || null)}
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={categoryFilter || ""}
            onChange={(e) => setCategoryFilter(e.target.value || null)}
          >
            <option value="">All Categories</option>
            <option value="hr">HR</option>
            <option value="it">IT</option>
            <option value="payroll">Payroll</option>
            <option value="leave">Leave</option>
            <option value="general">General</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      {ticketsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="No tickets found"
          description={
            searchQuery || statusFilter || categoryFilter
              ? "Try adjusting your filters"
              : "Create your first support ticket to get started"
          }
          action={{
            label: "Create Ticket",
            onClick: () => setShowCreateDialog(true),
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => {
            const CatIcon = CATEGORY_CONFIG[ticket.category]?.icon || HelpCircle;
            const StatusIcon = STATUS_CONFIG[ticket.status]?.icon || Circle;
            const PriorityIcon = PRIORITY_CONFIG[ticket.priority]?.icon || Circle;

            return (
              <div
                key={ticket.id}
                className="group rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-primary/20 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  {/* Category icon */}
                  <div className="mt-0.5 shrink-0 h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CatIcon className="h-4 w-4 text-primary" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-dark dark:text-white">
                          {ticket.subject}
                        </h4>
                        {ticket.description && (
                          <p className="text-sm text-muted mt-0.5 line-clamp-2">{ticket.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Badge variant={CATEGORY_CONFIG[ticket.category]?.color} size="sm">
                          {CATEGORY_CONFIG[ticket.category]?.label}
                        </Badge>
                        <Badge variant={STATUS_CONFIG[ticket.status]?.color} size="sm">
                          {STATUS_CONFIG[ticket.status]?.label}
                        </Badge>
                        <Badge variant={PRIORITY_CONFIG[ticket.priority]?.color} size="sm">
                          {PRIORITY_CONFIG[ticket.priority]?.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {ticket.createdByName}
                      </span>
                      {ticket.assigneeName && (
                        <span className="flex items-center gap-1">
                          → {ticket.assigneeName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setShowDetailDialog(ticket.id)}>
                        <Eye className="mr-2 h-4 w-4" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowReplyDialog(ticket.id)}>
                        <Reply className="mr-2 h-4 w-4" /> Reply
                      </DropdownMenuItem>
                      {isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              const assigneeId = prompt("Enter assignee User ID:");
                              const assigneeName = prompt("Enter assignee Name:");
                              if (assigneeId && assigneeName) {
                                handleAssign(ticket.id, assigneeId, assigneeName);
                              }
                            }}
                          >
                            <User className="mr-2 h-4 w-4" /> Assign
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => ticket.status === "open"
                              ? handleStatusUpdate(ticket.id, "in_progress")
                              : ticket.status === "in_progress"
                              ? handleStatusUpdate(ticket.id, "resolved")
                              : handleStatusUpdate(ticket.id, "open")
                            }
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {ticket.status === "open" ? "Start Progress" :
                             ticket.status === "in_progress" ? "Resolve" :
                             "Reopen"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-danger"
                            onClick={() => setShowDeleteConfirm(ticket.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!showDetailDialog} onOpenChange={(o) => !o && setShowDetailDialog(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailTicket?.subject || "Ticket Details"}</DialogTitle>
          </DialogHeader>
          {detailTicket && (
            <div className="space-y-4 mt-2">
              {detailTicket.description && (
                <p className="text-sm text-muted whitespace-pre-wrap">{detailTicket.description}</p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted">Status:</span>{" "}
                  <Badge variant={STATUS_CONFIG[detailTicket.status]?.color} size="sm">
                    {STATUS_CONFIG[detailTicket.status]?.label}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted">Priority:</span>{" "}
                  <Badge variant={PRIORITY_CONFIG[detailTicket.priority]?.color} size="sm">
                    {PRIORITY_CONFIG[detailTicket.priority]?.label}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted">Category:</span>{" "}
                  <Badge variant={CATEGORY_CONFIG[detailTicket.category]?.color} size="sm">
                    {CATEGORY_CONFIG[detailTicket.category]?.label}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted">Created By:</span> {detailTicket.createdByName}
                </div>
                <div>
                  <span className="text-muted">Assignee:</span>{" "}
                  {detailTicket.assigneeName || "Unassigned"}
                </div>
                <div>
                  <span className="text-muted">Created:</span>{" "}
                  {new Date(detailTicket.createdAt).toLocaleDateString()}
                </div>
              </div>
              {detailTicket.resolution && (
                <div className="rounded-lg bg-success/5 border border-success/20 p-3">
                  <p className="text-sm font-medium text-success">Resolution</p>
                  <p className="text-sm text-muted mt-1">{detailTicket.resolution}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={!!showReplyDialog} onOpenChange={(o) => !o && setShowReplyDialog(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reply to Ticket</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = new FormData(form);
              const content = data.get("content") as string;
              if (!content || !showReplyDialog) return;

              const result = await createRecord(`/api/hrm/v2/tickets?action=reply`, {
                ticketId: showReplyDialog,
                content,
                isInternal: data.get("visibility") === "internal",
                autoReopen: data.get("autoReopen") === "true",
              });
              if (result) {
                success("Reply posted");
                setShowReplyDialog(null);
                refetchTickets();
              }
            }}
            className="space-y-4 mt-4"
          >
            <div>
              <label className="text-sm font-medium block mb-1">Reply</label>
              <textarea
                name="content"
                rows={4}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                placeholder="Type your reply..."
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="autoReopen" value="true" />
                Auto-reopen ticket
              </label>
              {isAdmin && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="visibility" value="internal" />
                  Internal note
                </label>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowReplyDialog(null)}>
                Cancel
              </Button>
              <Button type="submit">
                <MessageSquare className="h-4 w-4 mr-2" />
                Post Reply
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(o) => !o && setShowDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Ticket</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted">Are you sure you want to delete this ticket? This action cannot be undone.</p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => showDeleteConfirm && handleDeleteTicket(showDeleteConfirm)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
