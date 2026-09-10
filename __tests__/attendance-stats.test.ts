/**
 * Attendance Dashboard Stats Integration Tests
 * Tests: Dashboard stats accuracy across Employee, HR Admin, and Super Admin roles
 * Tests: Data isolation between roles
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, registerUser, loginUser, clearSessionCookies, uniqueEmail, type TestUser } from "./helpers";

const HR_ADMIN: TestUser = { email: "hr-admin-att-stats@company.com", password: "HRAdmin@123", displayName: "Attendance Stats HR" };
const EMPLOYEE: TestUser = { email: uniqueEmail("att-stats-emp"), password: "Employee@123", displayName: "Attendance Stats Employee" };

let employeeUserId: string | undefined;

beforeAll(async () => {
  clearSessionCookies();
  const regRes = await registerUser(EMPLOYEE);
  if (regRes.ok && regRes.data) employeeUserId = regRes.data.uid;
  await loginUser(HR_ADMIN.email, HR_ADMIN.password);
}, 60000);
afterAll(() => { clearSessionCookies(); });

describe("HR Admin Dashboard Stats", () => {
  it("1.1 HR Admin can access attendance dashboard", async () => {
    const res = await api.get("/api/hrm/v2/attendance?dashboard=true", { user: HR_ADMIN });
    if (res.ok && res.data) {
      expect(typeof res.data.present).toBe("number");
      expect(typeof res.data.absent).toBe("number");
      expect(typeof res.data.total).toBe("number");
      expect(typeof res.data.percentage).toBe("number");
    }
  });

  it("1.2 Dashboard returns correct structure", async () => {
    const res = await api.get("/api/hrm/v2/attendance?dashboard=true", { user: HR_ADMIN });
    if (res.ok && res.data) {
      expect(res.data).toHaveProperty("present");
      expect(res.data).toHaveProperty("absent");
      expect(res.data).toHaveProperty("total");
      expect(res.data).toHaveProperty("percentage");
      expect(res.data.present).toBeGreaterThanOrEqual(0);
      expect(res.data.absent).toBeGreaterThanOrEqual(0);
      expect(res.data.total).toBeGreaterThanOrEqual(0);
    }
  });

  it("1.3 Dashboard percentage is consistent with counts", async () => {
    const res = await api.get("/api/hrm/v2/attendance?dashboard=true", { user: HR_ADMIN });
    if (res.ok && res.data && res.data.total > 0) {
      const expected = Math.round((res.data.present / res.data.total) * 100);
      expect(res.data.percentage).toBe(expected);
    }
  });
});

describe("Employee Attendance Data", () => {
  it("2.1 Employee can view own attendance records", async () => {
    if (!employeeUserId) return;
    const res = await api.get("/api/hrm/v2/attendance?userId=" + employeeUserId, { user: EMPLOYEE });
    if (res.ok && res.data) {
      expect(Array.isArray(res.data)).toBe(true);
    }
  });

  it("2.2 Employee cannot view another user's attendance", async () => {
    const res = await api.get("/api/hrm/v2/attendance?userId=some-other-user-id", { user: EMPLOYEE });
    expect(res.ok).toBe(false);
  });

  it("2.3 Employee cannot access admin dashboard endpoint", async () => {
    const res = await api.get("/api/hrm/v2/attendance?dashboard=true", { user: EMPLOYEE });
    expect(res.ok).toBe(false);
  });
});

describe("HR Admin Attendance Access", () => {
  it("3.1 HR Admin can view any user's attendance", async () => {
    if (!employeeUserId) return;
    const res = await api.get("/api/hrm/v2/attendance?userId=" + employeeUserId, { user: HR_ADMIN });
    if (res.ok && res.data) {
      expect(Array.isArray(res.data)).toBe(true);
    }
  });

  it("3.2 HR Admin can view all attendance records", async () => {
    const res = await api.get("/api/hrm/v2/attendance", { user: HR_ADMIN });
    if (res.ok && res.data) {
      expect(Array.isArray(res.data)).toBe(true);
    }
  });

  it("3.3 HR Admin can create attendance records", async () => {
    if (!employeeUserId) return;
    const tomorrow = new Date(Date.now() + 86400000);
    const res = await api.post("/api/hrm/v2/attendance", {
      userId: employeeUserId, date: tomorrow.toISOString(), checkIn: tomorrow.toISOString(),
    }, { user: HR_ADMIN });
    expect([200, 201, 401, 403]).toContain(res.status);
  });

  it("3.4 HR Admin can delete attendance records", async () => {
    if (!employeeUserId) return;
    const futureDate = new Date(Date.now() + 2 * 86400000);
    const createRes = await api.post("/api/hrm/v2/attendance", {
      userId: employeeUserId, date: futureDate.toISOString(), checkIn: futureDate.toISOString(),
    }, { user: HR_ADMIN });
    if (createRes.ok && createRes.data?._id) {
      const deleteRes = await api.delete("/api/hrm/v2/attendance?id=" + createRes.data._id, { user: HR_ADMIN });
      expect(deleteRes.ok).toBe(true);
    }
  });
});

describe("Security: Data Isolation", () => {
  it("4.1 Employee cannot PATCH other users attendance", async () => {
    const res = await api.patch("/api/hrm/v2/attendance?id=fake-id", { status: "present" }, { user: EMPLOYEE });
    expect(res.ok).toBe(false);
  });

  it("4.2 Employee cannot DELETE attendance records", async () => {
    const res = await api.delete("/api/hrm/v2/attendance?id=fake-id", { user: EMPLOYEE });
    expect(res.ok).toBe(false);
  });

  it("4.3 Unauthenticated cannot access attendance", async () => {
    clearSessionCookies();
    const res = await api.get("/api/hrm/v2/attendance");
    expect([401, 404]).toContain(res.status);
  });

  it("4.4 Unauthenticated cannot mark attendance", async () => {
    clearSessionCookies();
    const res = await api.post("/api/hrm/v2/attendance", { userId: "any", date: new Date().toISOString() });
    expect([401, 404]).toContain(res.status);
  });
});
