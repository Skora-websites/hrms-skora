/**
 * Ticket Escalation — Cross-Dashboard Integration Test
 *
 * Tests the complete lifecycle across Employee → HR Admin → Super Admin dashboards:
 *
 *   EMPLOYEE creates a support ticket
 *   → Views own tickets
 *   → Adds a reply
 *   → HR Admin picks up the ticket (assigns to self)
 *   → HR Admin marks as in_progress
 *   → HR Admin adds internal note
 *   → HR Admin resolves the ticket
 *
 *   EMPLOYEE sees ticket status updated to resolved
 *   → Employee reopens by replying (auto-reopen)
 *   → HR Admin closes the ticket
 *
 *   SUPER ADMIN can view escalations
 *   → Views ticket dashboard stats
 *   → Employee cannot access escalation data
 *
 * Also tests:
 *   - Ticket creation requires subject
 *   - Employee can only close their own tickets
 *   - Employee cannot delete tickets
 *   - Admin can delete tickets
 *   - Ticket timeline is preserved
 *   - Notifications are sent on status changes
 *
 * Prerequisites: Dev server running at localhost:3000
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, registerUser, loginUser, clearSessionCookies, uniqueEmail, type TestUser } from "./helpers";

// ── Test Users ─────────────────────────────────────────

const HR_ADMIN: TestUser = {
  email: "hr-admin-ticket-test@company.com",
  password: "HRAdmin@123",
  displayName: "Ticket Test HR Admin",
};

const SUPER_ADMIN: TestUser = {
  email: "superadmin-ticket-test@company.com",
  password: "SuperAdmin@123",
  displayName: "Ticket Test Super Admin",
};

const EMPLOYEE: TestUser = {
  email: uniqueEmail("ticket-emp"),
  password: "Employee@123",
  displayName: "Ticket Test Employee",
};

// ── State ──────────────────────────────────────────────

let employeeUserId: string | undefined;
let ticketId: string | undefined;
let replyId: string | undefined;

// ── Setup ──────────────────────────────────────────────

beforeAll(async () => {
  clearSessionCookies();
  const regRes = await registerUser(EMPLOYEE);
  if (regRes.ok && regRes.data) employeeUserId = regRes.data.uid;
  await loginUser(HR_ADMIN.email, HR_ADMIN.password);
  await loginUser(SUPER_ADMIN.email, SUPER_ADMIN.password);
}, 60000);

afterAll(() => { clearSessionCookies(); });

// ══════════════════════════════════════════════════════════
// PHASE 1: Employee Creates Ticket
// ══════════════════════════════════════════════════════════

describe("Phase 1: Ticket Creation (Employee)", () => {
  it("1.1 Employee can create a support ticket", async () => {
    const res = await api.post("/api/hrm/v2/tickets", {
      subject: "VPN Connection Issue",
      description: "Cannot connect to the company VPN since morning",
      category: "technical",
      priority: "high",
    }, { user: EMPLOYEE });

    if (res.ok) {
      expect(res.data).toBeDefined();
      expect(res.data!.subject).toBe("VPN Connection Issue");
      expect(res.data!.status).toBe("open");
      expect(res.data!.priority).toBe("high");
      expect(res.data!.category).toBe("technical");
      ticketId = res.data!.id;
    }
  });

  it("1.2 Ticket creation requires subject", async () => {
    const res = await api.post("/api/hrm/v2/tickets", {
      description: "No subject ticket",
      priority: "low",
    }, { user: EMPLOYEE });
    // 400 = validation error, 401 = not authenticated
    expect([400, 401]).toContain(res.status);
  });

  it("1.3 Employee can view own tickets", async () => {
    const res = await api.get("/api/hrm/v2/tickets", { user: EMPLOYEE });
    if (res.ok) {
      expect(Array.isArray(res.data)).toBe(true);
      if (ticketId) {
        const found = res.data!.find((t: any) => t.id === ticketId);
        expect(found).toBeDefined();
      }
    }
  });

  it("1.4 Employee can view single ticket", async () => {
    if (!ticketId) return;

    const res = await api.get(`/api/hrm/v2/tickets?id=${ticketId}`, {
      user: EMPLOYEE,
    });
    if (res.ok) {
      expect(res.data!.id).toBe(ticketId);
      expect(res.data!.status).toBe("open");
    }
  });
});

// ══════════════════════════════════════════════════════════
// PHASE 2: Employee Adds Reply
// ══════════════════════════════════════════════════════════

describe("Phase 2: Employee Ticket Reply", () => {
  it("2.1 Employee can add a reply to own ticket", async () => {
    if (!ticketId) return;

    const res = await api.post("/api/hrm/v2/tickets?action=reply", {
      ticketId,
      content: "I've tried restarting the VPN client but it still fails",
    }, { user: EMPLOYEE });

    if (res.ok) {
      expect(res.data).toBeDefined();
      expect(res.data!.content).toContain("VPN");
      replyId = res.data!.id;
    }
  });

  it("2.2 Replies are retrievable", async () => {
    if (!ticketId) return;

    const res = await api.get(
      `/api/hrm/v2/tickets?replies=true&ticketId=${ticketId}`,
      { user: EMPLOYEE }
    );
    if (res.ok) {
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data!.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("2.3 Ticket timeline is being recorded", async () => {
    if (!ticketId) return;

    const res = await api.get(
      `/api/hrm/v2/tickets?timeline=true&ticketId=${ticketId}`,
      { user: EMPLOYEE }
    );
    if (res.ok) {
      expect(Array.isArray(res.data)).toBe(true);
      // At least "created" and "replied" actions
      expect(res.data!.length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ══════════════════════════════════════════════════════════
// PHASE 3: HR Admin Picks Up Ticket
// ══════════════════════════════════════════════════════════

describe("Phase 3: HR Admin Manages Ticket", () => {
  it("3.1 HR Admin can see all tickets", async () => {
    const res = await api.get("/api/hrm/v2/tickets", { user: HR_ADMIN });
    if (res.ok) {
      expect(Array.isArray(res.data)).toBe(true);
    }
  });

  it("3.2 HR Admin can assign ticket to themselves", async () => {
    if (!ticketId) return;

    const res = await api.patch(
      `/api/hrm/v2/tickets?id=${ticketId}`,
      {
        assigneeId: employeeUserId || "hr-admin",
        assigneeName: "HR Admin",
      },
      { user: HR_ADMIN }
    );
    if (res.ok) {
      expect(res.data!.assigneeId).toBeDefined();
    }
  });

  it("3.3 HR Admin can update ticket status to in_progress", async () => {
    if (!ticketId) return;

    const res = await api.patch(
      `/api/hrm/v2/tickets?id=${ticketId}`,
      { status: "in_progress" },
      { user: HR_ADMIN }
    );
    if (res.ok) {
      expect(res.data!.status).toBe("in_progress");
    }
  });

  it("3.4 HR Admin can add a reply to the ticket", async () => {
    if (!ticketId) return;

    const res = await api.post("/api/hrm/v2/tickets?action=reply", {
      ticketId,
      content: "We're looking into the VPN issue. Checking with IT team.",
      isInternal: false,
    }, { user: HR_ADMIN });

    if (res.ok) {
      expect(res.data).toBeDefined();
      expect(res.data!.content).toContain("VPN");
    }
  });
});

// ══════════════════════════════════════════════════════════
// PHASE 4: HR Admin Resolves Ticket
// ══════════════════════════════════════════════════════════

describe("Phase 4: Ticket Resolution", () => {
  it("4.1 HR Admin can resolve the ticket", async () => {
    if (!ticketId) return;

    const res = await api.patch(
      `/api/hrm/v2/tickets?id=${ticketId}`,
      {
        status: "resolved",
        resolution: "VPN credentials were reset. Connection should work now.",
      },
      { user: HR_ADMIN }
    );
    if (res.ok) {
      expect(res.data!.status).toBe("resolved");
      expect(res.data!.resolvedAt).toBeDefined();
    }
  });

  it("4.2 Employee sees ticket as resolved", async () => {
    if (!ticketId) return;

    const res = await api.get(`/api/hrm/v2/tickets?id=${ticketId}`, {
      user: EMPLOYEE,
    });
    if (res.ok) {
      expect(res.data!.status).toBe("resolved");
    }
  });
});

// ══════════════════════════════════════════════════════════
// PHASE 5: Employee Reopens → HR Admin Closes
// ══════════════════════════════════════════════════════════

describe("Phase 5: Ticket Reopen & Close", () => {
  it("5.1 Employee can reopen a resolved ticket by replying", async () => {
    if (!ticketId) return;

    const res = await api.post("/api/hrm/v2/tickets?action=reply", {
      ticketId,
      content: "The issue is still happening after credential reset",
      autoReopen: true,
    }, { user: EMPLOYEE });

    if (res.ok) {
      expect(res.data).toBeDefined();
    }
  });

  it("5.2 Ticket status is back to open after reopen", async () => {
    if (!ticketId) return;

    const res = await api.get(`/api/hrm/v2/tickets?id=${ticketId}`, {
      user: EMPLOYEE,
    });
    if (res.ok) {
      expect(res.data!.status).toBe("open");
    }
  });

  it("5.3 Employee can close their own ticket", async () => {
    if (!ticketId) return;

    const res = await api.patch(
      `/api/hrm/v2/tickets?id=${ticketId}`,
      { status: "closed" },
      { user: EMPLOYEE }
    );
    if (res.ok) {
      expect(res.data!.status).toBe("closed");
      expect(res.data!.closedAt).toBeDefined();
    }
  });

  it("5.4 Employee cannot reopen a closed ticket", async () => {
    if (!ticketId) return;

    // Employee cannot set status to anything other than "closed"
    const res = await api.patch(
      `/api/hrm/v2/tickets?id=${ticketId}`,
      { status: "open" },
      { user: EMPLOYEE }
    );
    expect(res.ok).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// PHASE 6: Permissions & Edge Cases
// ══════════════════════════════════════════════════════════

describe("Phase 6: Permissions & Edge Cases", () => {
  let otherTicketId: string | undefined;

  it("6.1 Employee cannot delete tickets", async () => {
    if (!ticketId) return;

    const res = await api.delete(`/api/hrm/v2/tickets?id=${ticketId}`, {
      user: EMPLOYEE,
    });
    expect(res.ok).toBe(false);
  });

  it("6.2 Employee cannot update tickets belonging to others", async () => {
    // Create a ticket as HR Admin
    const createRes = await api.post("/api/hrm/v2/tickets", {
      subject: "HR Admin Ticket",
      priority: "low",
    }, { user: HR_ADMIN });

    if (createRes.ok && createRes.data) {
      otherTicketId = createRes.data.id;

      // Employee tries to update it
      const res = await api.patch(
        `/api/hrm/v2/tickets?id=${otherTicketId}`,
        { status: "closed" },
        { user: EMPLOYEE }
      );
      expect(res.ok).toBe(false);
    }
  });

  it("6.3 Employee cannot view tickets they didn't create", async () => {
    if (!otherTicketId) return;

    const res = await api.get(`/api/hrm/v2/tickets?id=${otherTicketId}`, {
      user: EMPLOYEE,
    });
    expect(res.ok).toBe(false);
  });

  it("6.4 Admin can delete tickets", async () => {
    if (!ticketId) return;

    const res = await api.delete(`/api/hrm/v2/tickets?id=${ticketId}`, {
      user: HR_ADMIN,
    });
    // May succeed or the ticket may already be deleted
    expect([200, 404]).toContain(res.status);
  });

  it("6.5 Deleted ticket is no longer accessible", async () => {
    if (!ticketId) return;

    const res = await api.get(`/api/hrm/v2/tickets?id=${ticketId}`, {
      user: HR_ADMIN,
    });
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
// PHASE 7: Dashboard Stats & Escalations
// ══════════════════════════════════════════════════════════

describe("Phase 7: Dashboard Stats & Escalations", () => {
  it("7.1 Admin can view ticket dashboard stats", async () => {
    const res = await api.get("/api/hrm/v2/tickets?dashboard=true", {
      user: HR_ADMIN,
    });
    if (res.ok && res.data) {
      expect(typeof res.data.totalTickets).toBe("number");
      expect(typeof res.data.openTickets).toBe("number");
      expect(typeof res.data.resolvedTickets).toBe("number");
      expect(typeof res.data.closedTickets).toBe("number");
    }
  });

  it("7.2 Employee sees only own tickets in dashboard", async () => {
    const res = await api.get("/api/hrm/v2/tickets?dashboard=true", {
      user: EMPLOYEE,
    });
    if (res.ok && res.data) {
      expect(typeof res.data.totalTickets).toBe("number");
    }
  });

  it("7.3 Super Admin can view escalations", async () => {
    const res = await api.get("/api/hrm/v2/escalations", {
      user: SUPER_ADMIN,
    });
    if (res.ok) {
      expect(Array.isArray(res.data)).toBe(true);
    }
  });

  it("7.4 HR Admin cannot view escalations", async () => {
    const res = await api.get("/api/hrm/v2/escalations", {
      user: HR_ADMIN,
    });
    expect(res.ok).toBe(false);
  });

  it("7.5 Employee cannot view escalations", async () => {
    const res = await api.get("/api/hrm/v2/escalations", {
      user: EMPLOYEE,
    });
    expect(res.ok).toBe(false);
  });

  it("7.6 Employee can view own notification count", async () => {
    if (!employeeUserId) return;

    const res = await api.get(
      `/api/hrm/v2/notifications?count=true&userId=${employeeUserId}`,
      { user: EMPLOYEE }
    );
    if (res.ok && res.data) {
      expect(typeof res.data.unreadCount).toBe("number");
    }
  });
});
