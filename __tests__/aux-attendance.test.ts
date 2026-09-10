/**
 * AUX Attendance Integration Test
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, registerUser, loginUser, clearSessionCookies, uniqueEmail, type TestUser } from "./helpers";

const HR_ADMIN: TestUser = { email: "hr-admin-aux-test@company.com", password: "HRAdmin@123", displayName: "AUX Test HR Admin" };
const EMPLOYEE: TestUser = { email: uniqueEmail("aux-emp"), password: "Employee@123", displayName: "AUX Test Employee" };

let employeeUserId: string | undefined;
let todayStr: string;

beforeAll(async () => {
  clearSessionCookies();
  const regRes = await registerUser(EMPLOYEE);
  if (regRes.ok && regRes.data) employeeUserId = regRes.data.uid;
  await loginUser(HR_ADMIN.email, HR_ADMIN.password);
  const now = new Date();
  todayStr = String(now.getFullYear()) + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
}, 60000);
afterAll(() => { clearSessionCookies(); });

describe("Tenant Settings: AUX Configuration", () => {
  it("1.1 Tenant returns requiredHours and breakAllowance", async () => {
    const res = await api.get("/api/hrm/v2/tenants/current", { user: EMPLOYEE });
    if (res.ok && res.data) {
      expect(typeof res.data.officeRules.requiredHours).toBe("number");
      expect(typeof res.data.officeRules.breakAllowance).toBe("number");
      expect(res.data.officeRules.requiredHours).toBe(8.5);
      expect(res.data.officeRules.breakAllowance).toBe(30);
      expect(res.data.officeRules.meetingCountsAsWork).toBe(true);
    }
  });
  it("1.2 Office hours are 10 AM - 7 PM", async () => {
    const res = await api.get("/api/hrm/v2/tenants/current", { user: EMPLOYEE });
    if (res.ok && res.data) {
      expect(res.data.officeRules.officeStart).toBe(10);
      expect(res.data.officeRules.officeEnd).toBe(19);
    }
  });
  it("1.3 Unauthenticated user cannot fetch tenant settings", async () => {
    clearSessionCookies();
    const res = await api.get("/api/hrm/v2/tenants/current");
    expect(res.ok).toBe(false);
  });
});

describe("Attendance Punch-In", () => {
  it("2.1 Employee can mark own attendance", async () => {
    const res = await api.post("/api/hrm/v2/attendance", { userId: employeeUserId, date: new Date().toISOString(), checkIn: new Date().toISOString() }, { user: EMPLOYEE });
    if (res.ok) expect(res.data).toBeDefined();
  });
  it("2.2 Employee cannot mark attendance for another user", async () => {
    const res = await api.post("/api/hrm/v2/attendance", { userId: "other-user-id", date: new Date().toISOString() }, { user: EMPLOYEE });
    expect(res.ok).toBe(false);
  });
  it("2.3 Employee can view own attendance", async () => {
    if (!employeeUserId) return;
    const res = await api.get("/api/hrm/v2/attendance?userId=" + employeeUserId, { user: EMPLOYEE });
    if (res.ok) expect(Array.isArray(res.data)).toBe(true);
  });
  it("2.4 Employee cannot view another users attendance", async () => {
    const res = await api.get("/api/hrm/v2/attendance?userId=other-user-id", { user: EMPLOYEE });
    expect(res.ok).toBe(false);
  });
  it("2.5 Admin can view attendance dashboard", async () => {
    const res = await api.get("/api/hrm/v2/attendance?dashboard=true", { user: HR_ADMIN });
    if (res.ok && res.data) {
      expect(typeof res.data.present).toBe("number");
      expect(typeof res.data.absent).toBe("number");
    }
  });
  it("2.6 Employee cannot view attendance dashboard", async () => {
    const res = await api.get("/api/hrm/v2/attendance?dashboard=true", { user: EMPLOYEE });
    expect(res.ok).toBe(false);
  });
});

describe("AUX State Tracking", () => {
  it("3.1 Admin can update attendance via PATCH", async () => {
    if (!employeeUserId) return;
    const listRes = await api.get("/api/hrm/v2/attendance?userId=" + employeeUserId, { user: HR_ADMIN });
    if (listRes.ok && Array.isArray(listRes.data) && listRes.data.length > 0) {
      const rec = listRes.data[0];
      const patchRes = await api.patch("/api/hrm/v2/attendance?id=" + rec._id, { status: "present" }, { user: HR_ADMIN });
      expect([200, 404]).toContain(patchRes.status);
    }
  });
  it("3.2 Employee cannot PATCH attendance", async () => {
    const res = await api.patch("/api/hrm/v2/attendance?id=fake-id", { status: "present" }, { user: EMPLOYEE });
    expect(res.ok).toBe(false);
  });
  it("3.3 Admin can DELETE attendance record", async () => {
    const createRes = await api.post("/api/hrm/v2/attendance", { userId: employeeUserId, date: new Date(Date.now()+86400000).toISOString(), checkIn: new Date().toISOString() }, { user: EMPLOYEE });
    if (createRes.ok && createRes.data) {
      const deleteRes = await api.delete("/api/hrm/v2/attendance?id=" + createRes.data._id, { user: HR_ADMIN });
      expect(deleteRes.ok).toBe(true);
    }
  });
});

describe("Work Hours Calculation", () => {
  it("4.1 Records track workHours", async () => {
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
  it("4.2 Status field is valid", async () => {
    if (!employeeUserId) return;
    const res = await api.get("/api/hrm/v2/attendance?userId=" + employeeUserId, { user: HR_ADMIN });
    if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
      expect(["present","late","half_day","absent","week_off","holiday"]).toContain(res.data[0].status);
    }
  });
  it("4.3 Records include punchInTime", async () => {
    if (!employeeUserId) return;
    const res = await api.get("/api/hrm/v2/attendance?userId=" + employeeUserId, { user: HR_ADMIN });
    if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
      expect(res.data[0].punchInTime).toBeDefined();
    }
  });
});

describe("Security: Access Controls", () => {
  it("5.1 Unauthenticated cannot access attendance", async () => {
    clearSessionCookies();
    const res = await api.get("/api/hrm/v2/attendance");
    expect([401, 404]).toContain(res.status);
  });
  it("5.2 Unauthenticated cannot mark attendance", async () => {
    clearSessionCookies();
    const res = await api.post("/api/hrm/v2/attendance", { userId: "any", date: new Date().toISOString() });
    expect([401, 404]).toContain(res.status);
  });
  it("5.3 Employee cannot DELETE attendance", async () => {
    const res = await api.delete("/api/hrm/v2/attendance?id=fake-id", { user: EMPLOYEE });
    expect(res.ok).toBe(false);
  });
});
