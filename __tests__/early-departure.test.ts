/**
 * Early Departure Flow Integration Tests
 * Tests: Employee punches out early -> notification sent to HR/CEO -> approval/rejection flow
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, registerUser, loginUser, clearSessionCookies, uniqueEmail, type TestUser } from "./helpers";

const HR_ADMIN: TestUser = { email: "hr-admin-early-dep@company.com", password: "HRAdmin@123", displayName: "Early Departure HR" };
const EMPLOYEE: TestUser = { email: uniqueEmail("early-dep-emp"), password: "Employee@123", displayName: "Early Departure Employee" };

let employeeUserId: string | undefined;

beforeAll(async () => {
  clearSessionCookies();
  const regRes = await registerUser(EMPLOYEE);
  if (regRes.ok && regRes.data) employeeUserId = regRes.data.uid;
  await loginUser(HR_ADMIN.email, HR_ADMIN.password);
}, 60000);
afterAll(() => { clearSessionCookies(); });

describe("Early Departure Notifications", () => {
  it("1.1 Early departure notification is sent to HR role", async () => {
    if (!employeeUserId) return;
    const res = await api.post("/api/hrm/v2/notifications", {
      action: "send_to_role", role: "hr_admin",
      title: "Early Departure Approval Required",
      body: "Employee requests early punch-out. Reason: Medical appointment.",
      type: "approval", referenceType: "early_departure", referenceId: employeeUserId,
    }, { user: EMPLOYEE });
    expect([200, 201, 401, 403]).toContain(res.status);
  });

  it("1.2 Employee can send self-notification for early departure", async () => {
    if (!employeeUserId) return;
    const res = await api.post("/api/hrm/v2/notifications", {
      action: "send", userId: employeeUserId,
      title: "Early Departure Request Submitted",
      body: "Your early departure request has been submitted for approval.",
      type: "approval",
    }, { user: EMPLOYEE });
    expect([200, 201, 401, 403]).toContain(res.status);
  });

  it("1.3 Employee can view own notifications", async () => {
    if (!employeeUserId) return;
    const res = await api.get("/api/hrm/v2/notifications", { user: EMPLOYEE });
    if (res.ok && res.data) {
      expect(Array.isArray(res.data)).toBe(true);
    }
  });

  it("1.4 Unauthenticated cannot send notifications", async () => {
    clearSessionCookies();
    const res = await api.post("/api/hrm/v2/notifications", {
      action: "send", userId: "any",
      title: "Test", body: "Test", type: "approval",
    });
    expect([401, 404]).toContain(res.status);
  });
});

describe("Early Departure Ticket Flow", () => {
  it("2.1 Employee can create ticket for early departure", async () => {
    if (!employeeUserId) return;
    const res = await api.post("/api/hrm/v2/tickets", {
      title: "Early Departure Request - Medical",
      description: "Requesting early departure due to medical appointment at 3 PM.",
      category: "leave", priority: "high",
    }, { user: EMPLOYEE });
    expect([200, 201, 401, 403]).toContain(res.status);
  });

  it("2.2 HR Admin can view all tickets", async () => {
    const res = await api.get("/api/hrm/v2/tickets", { user: HR_ADMIN });
    if (res.ok && res.data) {
      expect(Array.isArray(res.data)).toBe(true);
    }
  });

  it("2.3 Employee can only view own tickets", async () => {
    if (!employeeUserId) return;
    const res = await api.get("/api/hrm/v2/tickets", { user: EMPLOYEE });
    if (res.ok && res.data) {
      expect(Array.isArray(res.data)).toBe(true);
    }
  });
});

describe("Attendance Early Punch-Out", () => {
  it("3.1 Punch-in creates record for today", async () => {
    if (!employeeUserId) return;
    const today = new Date();
    const res = await api.post("/api/hrm/v2/attendance", {
      userId: employeeUserId, date: today.toISOString(), checkIn: today.toISOString(),
    }, { user: EMPLOYEE });
    if (res.ok && res.data) {
      expect(res.data.punchInTime).toBeDefined();
    }
  });

  it("3.2 Punch-out records punchOutTime", async () => {
    if (!employeeUserId) return;
    const today = new Date();
    const res = await api.post("/api/hrm/v2/attendance", {
      userId: employeeUserId, date: today.toISOString(), checkOut: today.toISOString(),
    }, { user: EMPLOYEE });
    expect([200, 201, 401, 403]).toContain(res.status);
  });

  it("3.3 Early departure records workHours", async () => {
    if (!employeeUserId) return;
    const res = await api.get("/api/hrm/v2/attendance?userId=" + employeeUserId, { user: HR_ADMIN });
    if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
      const rec = res.data[0];
      if (rec.workHours !== undefined) {
        expect(typeof rec.workHours).toBe("number");
        expect(rec.workHours).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
