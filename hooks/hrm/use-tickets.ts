"use client";

import { useCollection, useFirestoreQuery } from "./use-firestore-query";
import type { Ticket, TicketReply, TicketTimeline } from "@/types";

// ── Ticket Hooks ───────────────────────────────────────

export function useTickets(params?: Record<string, string>) {
  return useCollection<Ticket>("/api/hrm/v2/tickets", params);
}

export function useTicket(id: string | null) {
  return useFirestoreQuery<Ticket>(
    id ? `/api/hrm/v2/tickets?id=${id}` : null
  );
}

export function useTicketDashboard() {
  return useFirestoreQuery<{
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    tickets: Ticket[];
  }>("/api/hrm/v2/tickets?dashboard=true");
}

// ── Reply Hooks ────────────────────────────────────────

export function useTicketReplies(ticketId: string | null) {
  return useCollection<TicketReply>(
    ticketId ? `/api/hrm/v2/tickets?replies=true&ticketId=${ticketId}` : null
  );
}

// ── Timeline Hooks ─────────────────────────────────────

export function useTicketTimeline(ticketId: string | null) {
  return useCollection<TicketTimeline>(
    ticketId ? `/api/hrm/v2/tickets?timeline=true&ticketId=${ticketId}` : null
  );
}
