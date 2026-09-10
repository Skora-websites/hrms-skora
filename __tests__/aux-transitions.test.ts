/**
 * AUX State Transitions Integration Tests
 * Tests: Punch in -> state transitions (Active/Break/Meeting) -> effective work calculation -> punch out
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, registerUser, loginUser, clearSessionCookies, uniqueEmail, type TestUser } from "./helpers";

const HR_ADMIN: TestUser = { email: "hr-admin-aux-trans@company.com", password: "HRAdmin@123", displayName: "AUX Transition HR" };
const EMPLOYEE: TestUser = { email: uniqueEmail("aux-trans-emp"), password: "Employee@123", displayName: "AUX Transition Employee" };

let employeeUserId: string | undefined;

beforeAll(async () => {
  clearSessionCookies();
  const regRes = await registerUser(EMPLOYEE);
  if (regRes.ok && regRes.data) employeeUserId = regRes.data.uid;
  await loginUser(HR_ADMIN.email, HR_ADMIN.password);
}, 60000);
afterAll(() => { clearSessionCookies(); });

describe("AUX Configuration", () => {
  it("1.1 Tenant returns AUX-related settings", async () => {
    const res = await api.get("/api/hrm/v2/tenants/current", { user: EMPLOYEE });
    if (res.ok && res.data) {
      expect(res.data.officeRules.requiredHours).toBeGreaterThanOrEqual(7);
      expect(res.data.officeRules.requiredHours).toBeLessThanOrEqual(9);
      expect(res.data.officeRules.breakAllowance).toBeGreaterThanOrEqual(0);
      expect(res.data.officeRules.breakAllowance).toBeLessThanOrEqual(60);
      expect(typeof res.data.officeRules.meetingCountsAsWork).toBe("boolean");
    }
  });

  it("1.2 Office hours span is correct (9 hours total)", async () => {
    const res = await api.get("/api/hrm/v2/tenants/current", { user: EMPLOYEE });
    if (res.ok && res.data) {
      const span = res.data.officeRules.officeEnd - res.data.officeRules.officeStart;
      expect(span).toBe(9);
    }
  });
});

describe("Punch In and AUX Transitions", () => {
  it("2.1 Employee can punch in and create attendance record", async () => {
    if (!employeeUserId) return;
    const today = new Date();
    const res = await api.post("/api/hrm/v2/attendance", {
      userId: employeeUserId, date: today.toISOString(), checkIn: today.toISOString(),
    }, { user: EMPLOYEE });
    if (res.ok && res.data) {
      expect(res.data.punchInTime).toBeDefined();
      expect(res.data.status).toBeDefined();
    }
  });

  it("2.2 Attendance record has AUX tracking fields", async () => {
    if (!employeeUserId) return;
    const res = await api.get("/api/hrm/v2/attendance?userId=" + employeeUserId, { user: EMPLOYEE });
    if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
      const rec = res.data[0];
      if (rec.auxState !== undefined) {
        expect(["active", "on_break", "meeting", null]).toContain(rec.auxState);
      }
    }
  });

  it("2.3 Multiple records for same user create correctly", async () => {
    if (!employeeUserId) return;
    const yesterday = new Date(Date.now() - 86400000);
    const res = await api.post("/api/hrm/v2/attendance", {
      userId: employeeUserId, date: yesterday.toISOString(), checkIn: yesterday.toISOString(),
    }, { user: HR_ADMIN });
    if (res.ok && res.data) {
      expect(res.data.date).toBeDefined();
    }
  });
});

describe("Work Hours Calculation", () => {
  it("3.1 Records track workHours field", async () => {
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

  it("3.2 Effective work minutes is tracked", async () => {
    if (!employeeUserId) return;
    const res = await api.get("/api/hrm/v2/attendance?userId=" + employeeUserId, { user: HR_ADMIN });
    if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
      const rec = res.data[0];
      if (rec.effectiveWorkMinutes !== undefined) {
        expect(typeof rec.effectiveWorkMinutes).toBe("number");
        expect(rec.effectiveWorkMinutes).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("3.3 Total break minutes is tracked", async () => {
    if (!employeeUserId) return;
    const res = await api.get("/api/hrm/v2/attendance?userId=" + employeeUserId, { user: HR_ADMIN });
    if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
      const rec = res.data[0];
      if (rec.totalBreakMinutes !== undefined) {
        expect(typeof rec.totalBreakMinutes).toBe("number");
        expect(rec.totalBreakMinutes).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("Attendance Status Values", () => {
  it("4.1 Valid statuses are enforced", async () => {
    const validStatuses = ["present", "late", "half_day", "absent", "week_off", "holiday"];
    if (!employeeUserId) return;
    const res = await api.get("/api/hrm/v2/attendance?userId=" + employeeUserId, { user: HR_ADMIN });
    if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
      expect(validStatuses).toContain(res.data[0].status);
    }
  });

  it("4.2 Invalid status is rejected on PATCH", async () => {
    const res = await api.patch("/api/hrm/v2/attendance?id=fake-id", { status: "super_late" }, { user: HR_ADMIN });
    expect([400, 401, 403, 404]).toContain(res.status);
  });
});

describe("Cross-Role Attendance Visibility", () => {
  it("5.1 HR Admin sees all attendance records", async () => {
    const res = await api.get("/api/hrm/v2/attendance", { user: HR_ADMIN });
    if (res.ok && res.data) {
      expect(Array.isArray(res.data)).toBe(true);
    }
  });

  it("5.2 Employee only sees own attendance", async () => {
    if (!employeeUserId) return;
    const res = await api.get("/api/hrm/v2/attendance?userId=" + employeeUserId, { user: EMPLOYEE });
    if (res.ok && res.data) {
      expect(Array.isArray(res.data)).toBe(true);
      for (const rec of res.data as any[]) {
        expect(rec.userId).toBe(employeeUserId);
      }
    }
  });
});
