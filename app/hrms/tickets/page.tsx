"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Send,
  Lock,
  ArrowRightLeft,
  ChevronRight,
  Filter,
  User,
  Building,
  RefreshCw,
  Loader2,
  FileText,
  X,
  Shield,
  Tag,
  Check,
  Download,
  ArrowLeft,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import type {
  Ticket,
  TicketComment,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TransferDirection,
} from "@/services/hrm/tickets/types";

export default function TicketsWorkspacePage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [activeTab, setActiveTab] = useState<"all" | "my_created" | "assigned_to_me" | "department_queue">("all");

  // New Ticket Form State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("IT Support");
  const [newPriority, setNewPriority] = useState<TicketPriority>("medium");
  const [newDepartment, setNewDepartment] = useState("IT");
  const [submitting, setSubmitting] = useState(false);
  const [newAttachments, setNewAttachments] = useState<any[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Reply Form State
  const [replyText, setReplyText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferDept, setTransferDept] = useState("HR");
  const [transferDirection, setTransferDirection] = useState<TransferDirection>("manager");
  const [transferNote, setTransferNote] = useState("");
  const [transferring, setTransferring] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Load Categories
  useEffect(() => {
    fetch("/api/hrm/v2/tickets/categories")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setCategories(res.data);
      })
      .catch(() => {});
  }, []);

  // 2. Load Tickets
  const loadTickets = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter !== "all") q.set("status", statusFilter);
      if (priorityFilter !== "all") q.set("priority", priorityFilter);
      if (activeTab !== "all") q.set("view", activeTab);
      if (search.trim()) q.set("search", search.trim());

      const res = await fetch(`/api/hrm/v2/tickets?${q.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const list: Ticket[] = json.data || [];
        setTickets(list);

        // Keep selected ticket updated or select the first ticket
        if (selectedTicket) {
          const fresh = list.find((t) => t.id === selectedTicket.id);
          if (fresh) setSelectedTicket(fresh);
        } else if (list.length > 0) {
          setSelectedTicket(list[0]);
        }
      }
    } catch {
      showToast("Failed to load tickets", "error");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [statusFilter, priorityFilter, activeTab, search, selectedTicket]);

  useEffect(() => {
    loadTickets();
  }, [statusFilter, priorityFilter, activeTab]);

  // 3. Load Comments for Selected Ticket
  useEffect(() => {
    if (!selectedTicket?.id) {
      setComments([]);
      return;
    }

    setCommentsLoading(true);
    fetch(`/api/hrm/v2/tickets/${selectedTicket.id}/comments`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setComments(res.data);
      })
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [selectedTicket?.id]);

  // Auto-scroll comments to bottom
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/hrm/v2/tickets/upload", {
        method: "POST",
        body: fd,
      });

      const json = await res.json();
      if (res.ok && json.file) {
        setNewAttachments((prev) => [...prev, json.file]);
        showToast(`Uploaded ${file.name}`);
      } else {
        showToast(json.error || "Upload failed", "error");
      }
    } catch {
      showToast("File upload failed", "error");
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Create Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/hrm/v2/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          category: newCategory,
          priority: newPriority,
          department: newDepartment,
          attachments: newAttachments,
        }),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        showToast(`Ticket #${json.data.ticketNumber} created successfully`);
        setShowNewModal(false);
        setNewTitle("");
        setNewDescription("");
        setNewAttachments([]);
        await loadTickets();
        setSelectedTicket(json.data);
      } else {
        showToast(json.error || "Failed to create ticket", "error");
      }
    } catch {
      showToast("Error creating ticket", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Send Reply or Internal Note
  const handleSendReply = async () => {
    if (!selectedTicket || (!replyText.trim() && newAttachments.length === 0)) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/hrm/v2/tickets/${selectedTicket.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: replyText,
          visibility: isInternalNote ? "internal" : "public",
          attachments: newAttachments,
        }),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        setComments((prev) => [...prev, json.data]);
        setReplyText("");
        setNewAttachments([]);
        loadTickets(true);
      } else {
        showToast(json.error || "Failed to post message", "error");
      }
    } catch {
      showToast("Error posting message", "error");
    } finally {
      setSendingReply(false);
    }
  };

  // Change Ticket Status
  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!selectedTicket) return;
    try {
      const res = await fetch("/api/hrm/v2/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          status: newStatus,
        }),
      });

      if (res.ok) {
        showToast(`Status changed to ${newStatus.toUpperCase()}`);
        loadTickets(true);
        // Reload comments for system note
        fetch(`/api/hrm/v2/tickets/${selectedTicket.id}/comments`)
          .then((r) => r.json())
          .then((res) => {
            if (res.data) setComments(res.data);
          });
      }
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  // Submit Inter-Department Transfer
  const handleExecuteTransfer = async () => {
    if (!selectedTicket) return;
    setTransferring(true);
    try {
      const res = await fetch("/api/hrm/v2/tickets/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          toDepartment: transferDept,
          direction: transferDirection,
          priority: selectedTicket.priority,
          note: transferNote,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        showToast(`Transfer requested to ${transferDept}`);
        setShowTransferModal(false);
        setTransferNote("");
        loadTickets(true);
      } else {
        showToast(json.error || "Transfer failed", "error");
      }
    } catch {
      showToast("Error creating transfer", "error");
    } finally {
      setTransferring(false);
    }
  };

  // Decide Transfer (Approve/Reject)
  const handleDecideTransfer = async (transferId: string, decision: "approved" | "rejected") => {
    try {
      const res = await fetch("/api/hrm/v2/tickets/transfers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transferId,
          decision,
        }),
      });

      if (res.ok) {
        showToast(`Transfer ${decision}`);
        loadTickets(true);
      } else {
        showToast("Transfer decision failed", "error");
      }
    } catch {
      showToast("Error updating transfer", "error");
    }
  };

  const getPriorityColor = (p: TicketPriority) => {
    switch (p) {
      case "urgent":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "high":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "medium":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "low":
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusColor = (s: TicketStatus) => {
    switch (s) {
      case "open":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "in_progress":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "on_hold":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "resolved":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "closed":
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const isStaff = user?.role === "super_admin" || user?.role === "manager" || user?.role === "hr_admin";

  return (
    <AppShell title="Tickets Workspace">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-lg backdrop-blur-md ${
            toast.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Enterprise Ticket Workspace
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              Pure MySQL
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Inter-department ticketing, automatic skill routing &amp; SLA resolution streams
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/hrms"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-background text-xs font-semibold text-foreground hover:bg-muted/70 active:scale-95 transition-all shadow-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Return to HRMS</span>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadTickets(true)}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setShowNewModal(true)}
            className="text-xs flex items-center gap-1.5 bg-primary text-primary-foreground font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>Raise New Ticket</span>
          </Button>
        </div>
      </div>

      {/* Main 2-Column Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 min-h-[680px]">
        {/* Left Column: Tickets Master List (4 cols) */}
        <div className="lg:col-span-4 flex flex-col rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          {/* Quick Filters */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search ticket number, title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadTickets()}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Role-Adaptive Tabs */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl text-[11px] font-semibold overflow-x-auto">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                  activeTab === "all" ? "bg-card text-foreground shadow-xs border border-border/40" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab("my_created")}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                  activeTab === "my_created" ? "bg-card text-foreground shadow-xs border border-border/40" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                My Requests
              </button>
              <button
                onClick={() => setActiveTab("assigned_to_me")}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                  activeTab === "assigned_to_me" ? "bg-card text-foreground shadow-xs border border-border/40" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Assigned
              </button>
              {isStaff && (
                <button
                  onClick={() => setActiveTab("department_queue")}
                  className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                    activeTab === "department_queue" ? "bg-card text-foreground shadow-xs border border-border/40" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Dept Queue
                </button>
              )}
            </div>

            {/* Status & Priority Dropdown Filters */}
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="flex-1 h-8 text-xs rounded-lg border border-border bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="flex-1 h-8 text-xs rounded-lg border border-border bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Ticket Rows */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[560px]">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Loading tickets...</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                No tickets found. Click &ldquo;Raise New Ticket&rdquo; to start.
              </div>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedTicket?.id === t.id
                      ? "border-primary/50 bg-primary/5 shadow-xs"
                      : "border-border/60 bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono font-bold text-primary">
                      {t.ticketNumber}
                    </span>
                    <span className={`text-[10px] px-2 py-0.2 rounded-full font-semibold border ${getStatusColor(t.status)}`}>
                      {t.status.toUpperCase()}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-foreground truncate mb-1">
                    {t.title}
                  </h4>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2">
                    <span className="truncate max-w-[130px]">{t.department} &bull; {t.category}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${getPriorityColor(t.priority)}`}>
                      {t.priority}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Ticket Conversation & Detail Stream (8 cols) */}
        <div className="lg:col-span-8 flex flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          {selectedTicket ? (
            <>
              {/* Ticket Top Header & Actions */}
              <div className="pb-4 border-b border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                        {selectedTicket.ticketNumber}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getStatusColor(selectedTicket.status)}`}>
                        {selectedTicket.status.toUpperCase()}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getPriorityColor(selectedTicket.priority)}`}>
                        {selectedTicket.priority.toUpperCase()}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-foreground mt-1.5">
                      {selectedTicket.title}
                    </h2>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2">
                    {/* Status Dropdown */}
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(e.target.value as any)}
                      className="h-8 text-xs rounded-lg border border-border bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="on_hold">On Hold</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>

                    {/* Inter-Dept Transfer Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowTransferModal(true)}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      <span>Transfer</span>
                    </Button>
                  </div>
                </div>

                {/* Sub-meta details */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-3 pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span>Requester: <strong className="text-foreground">{selectedTicket.requesterName}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5" />
                    <span>Dept: <strong className="text-foreground">{selectedTicket.department}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    <span>Category: <strong className="text-foreground">{selectedTicket.category}</strong></span>
                  </div>
                </div>

                {/* Active Transfer Pending Banner */}
                {selectedTicket.activeTransfer && selectedTicket.activeTransfer.status === "pending" && (
                  <div className="mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-xs">
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        Inter-Department Transfer Pending:
                      </span>{" "}
                      From {selectedTicket.activeTransfer.fromUserName} &rarr;{" "}
                      <strong>{selectedTicket.activeTransfer.toDepartment}</strong> ({selectedTicket.activeTransfer.priority.toUpperCase()} priority)
                      {selectedTicket.activeTransfer.note && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 italic">
                          &ldquo;{selectedTicket.activeTransfer.note}&rdquo;
                        </p>
                      )}
                    </div>
                    {isStaff && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleDecideTransfer(selectedTicket.activeTransfer!.id!, "approved")}
                          className="h-7 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDecideTransfer(selectedTicket.activeTransfer!.id!, "rejected")}
                          className="h-7 text-xs border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chat / Timeline Stream */}
              <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1 max-h-[420px]">
                {/* Initial Description Card */}
                <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span className="font-bold text-foreground">{selectedTicket.requesterName}</span>
                    <span className="text-[10px] font-mono">
                      {new Date(selectedTicket.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.description}
                  </p>
                  {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-border/40">
                      {selectedTicket.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-[11px] font-medium text-foreground transition-colors"
                        >
                          <Paperclip className="h-3 w-3 text-primary" />
                          <span className="truncate max-w-[150px]">{att.name}</span>
                          <Download className="h-3 w-3 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Conversation Entries */}
                {commentsLoading ? (
                  <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Loading messages...</span>
                  </div>
                ) : (
                  comments.map((comm) => {
                    const isAuthorMe = comm.authorId === user?.id;

                    if (comm.kind === "system") {
                      return (
                        <div key={comm.id} className="text-center my-2">
                          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border/40">
                            {comm.body}
                          </span>
                        </div>
                      );
                    }

                    if (comm.visibility === "internal") {
                      return (
                        <div
                          key={comm.id}
                          className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs my-2"
                        >
                          <div className="flex items-center justify-between text-[10px] text-amber-600 dark:text-amber-400 font-bold mb-1">
                            <span className="flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Internal Staff Note &bull; {comm.authorName} ({comm.authorRole})
                            </span>
                            <span className="font-mono">
                              {new Date(comm.createdAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-xs text-foreground whitespace-pre-wrap">{comm.body}</p>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={comm.id}
                        className={`flex flex-col max-w-[85%] ${isAuthorMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                      >
                        <div className="text-[10px] text-muted-foreground mb-0.5 px-1 font-medium">
                          {isAuthorMe ? "You" : comm.authorName}
                        </div>
                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed ${
                            isAuthorMe
                              ? "bg-primary text-primary-foreground rounded-tr-xs"
                              : "bg-muted/50 border border-border/70 text-foreground rounded-tl-xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{comm.body}</p>
                          {comm.attachments && comm.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2 pt-1.5 border-t border-black/10 dark:border-white/10">
                              {comm.attachments.map((att, i) => (
                                <a
                                  key={i}
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[10px]"
                                >
                                  <Paperclip className="h-2.5 w-2.5" />
                                  <span className="truncate max-w-[120px]">{att.name}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground mt-0.5 px-1">
                          {new Date(comm.createdAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Message Reply Input Area */}
              <div className="pt-3 border-t border-border/60">
                {/* Internal Note Toggle for Staff */}
                {isStaff && (
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(!isInternalNote)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        isInternalNote
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>{isInternalNote ? "Writing Staff Note (Hidden from requester)" : "Public Reply (Visible to requester)"}</span>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={uploadingAttachment}
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs h-7 px-2.5 flex items-center gap-1"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span>{uploadingAttachment ? "Uploading..." : "Attach File"}</span>
                    </Button>
                  </div>
                )}

                {/* Staged Attachments */}
                {newAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 p-2 rounded-lg bg-muted/40 border border-border">
                    {newAttachments.map((att, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-background text-[11px] font-medium border border-border">
                        <Paperclip className="h-3 w-3 text-primary" />
                        <span className="truncate max-w-[150px]">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => setNewAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                          className="hover:text-rose-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <textarea
                    rows={2}
                    placeholder={isInternalNote ? "Write an internal note for staff..." : "Type your message or update..."}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    className="flex-1 p-2.5 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                  <Button
                    size="sm"
                    disabled={sendingReply || (!replyText.trim() && newAttachments.length === 0)}
                    onClick={handleSendReply}
                    className="h-14 px-4 bg-primary text-primary-foreground font-semibold flex items-center gap-1.5"
                  >
                    {sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span>Send</span>
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-bold text-foreground">No Ticket Selected</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Select a ticket from the left panel to inspect conversation stream, manage SLA status, or raise an inter-department transfer.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ CREATE TICKET MODAL ═══ */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl text-card-foreground">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Raise New Support Ticket</h3>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Subject / Summary *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cannot connect to staging VPN, need access..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full h-9 text-xs rounded-lg border border-border bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Target Department *
                  </label>
                  <select
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full h-9 text-xs rounded-lg border border-border bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="IT">IT Support</option>
                    <option value="HR">HR &amp; People Ops</option>
                    <option value="Finance">Payroll &amp; Finance</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Operations">Operations</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Priority *
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full h-9 text-xs rounded-lg border border-border bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Detailed Description *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide context, error messages, or exact issue details..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Attachments Dropzone */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Attachments (Optional, max 10MB)
                  </label>
                  <input
                    type="file"
                    id="ticket-new-file"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="ticket-new-file"
                    className="cursor-pointer text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <Paperclip className="h-3 w-3" />
                    <span>Attach</span>
                  </label>
                </div>

                {newAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/40 border border-border">
                    {newAttachments.map((att, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-background text-[11px] border border-border">
                        <Paperclip className="h-3 w-3 text-primary" />
                        <span className="truncate max-w-[160px]">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => setNewAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                          className="hover:text-rose-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="text-xs bg-primary text-primary-foreground font-semibold flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  <span>Submit Ticket</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ INTER-DEPARTMENT TRANSFER MODAL ═══ */}
      {showTransferModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-card-foreground">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Transfer Ticket #{selectedTicket.ticketNumber}
                </h3>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Target Department
                </label>
                <select
                  value={transferDept}
                  onChange={(e) => setTransferDept(e.target.value)}
                  className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="IT">IT Support</option>
                  <option value="HR">HR &amp; People Ops</option>
                  <option value="Finance">Payroll &amp; Finance</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Operations">Operations</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Transfer Routing Direction
                </label>
                <select
                  value={transferDirection}
                  onChange={(e) => setTransferDirection(e.target.value as any)}
                  className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="manager">Route to Department Manager for Assignment</option>
                  <option value="agent">Direct to Department Agent Queue</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Transfer Justification Note
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this ticket is being transferred to this department..."
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border text-[11px] text-muted-foreground">
                Priority <strong>{selectedTicket.priority.toUpperCase()}</strong> is locked and preserved during inter-department transfer.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTransferModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={transferring}
                onClick={handleExecuteTransfer}
                className="text-xs bg-primary text-primary-foreground font-semibold"
              >
                {transferring ? "Requesting..." : "Execute Transfer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
