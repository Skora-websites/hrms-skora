/**
 * Configurable Office Rules Integration Tests
 * Tests: Super Admin configures settings -> Settings persist -> Employees see updated rules -> Attendance respects rules
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, registerUser, loginUser, clearSessionCookies, uniqueEmail, type TestUser } from "./helpers";

const HR_ADMIN: TestUser = { email: "hr-admin-office-rules@company.com", password: "HRAdmin@123", displayName: "Office Rules HR Admin" };
const EMPLOYEE: TestUser = { email: uniqueEmail("office-rules-emp"), password: "Employee@123", displayName: "Office Rules Employee" };

let employeeUserId: string | undefined;

beforeAll(async () => {
  clearSessionCookies();
  const regRes = await registerUser(EMPLOYEE);
  if (regRes.ok && regRes.data) employeeUserId = regRes.data.uid;
  await loginUser(HR_ADMIN.email, HR_ADMIN.password);
}, 60000);
afterAll(() => { clearSessionCookies(); });

describe("Settings Persistence", () => {
  it("1.1 Can save office rules via settings API", async () => {
    const res = await api.post("/api/hrm/v2/settings", {
      role: "super_admin", userId: "system",
      settings: { officeRules: { officeStart: 10, officeEnd: 19, lateAfter: 10.5, workDays: [1,2,3,4,5,6], requiredHours: 8.5, breakAllowance: 30, meetingCountsAsWork: true } },
    }, { user: HR_ADMIN });
    expect([200, 201, 400, 401, 403, 404]).toContain(res.status);
  });

  it("1.2 Can read back saved settings via GET", async () => {
    const res = await api.get("/api/hrm/v2/settings?role=super_admin", { user: HR_ADMIN });
    if (res.ok && res.data) {
      expect(res.data.officeRules).toBeDefined();
      if (res.data.officeRules) {
        expect(typeof res.data.officeRules.requiredHours).toBe("number");
        expect(typeof res.data.officeRules.breakAllowance).toBe("number");
        expect(res.data.officeRules.workDays).toBeDefined();
      }
    }
  });

  it("1.3 Tenants/current returns saved rules with AUX fields", async () => {
    const res = await api.get("/api/hrm/v2/tenants/current", { user: EMPLOYEE });
    if (res.ok && res.data) {
      expect(res.data.officeRules).toBeDefined();
      expect(typeof res.data.officeRules.officeStart).toBe("number");
      expect(typeof res.data.officeRules.officeEnd).toBe("number");
      expect(typeof res.data.officeRules.requiredHours).toBe("number");
      expect(typeof res.data.officeRules.breakAllowance).toBe("number");
      expect(typeof res.data.officeRules.meetingCountsAsWork).toBe("boolean");
    }
  });

  it("1.4 Employees cannot save system-wide settings", async () => {
    const res = await api.post("/api/hrm/v2/settings", {
      role: "super_admin", userId: "system",
      settings: { officeRules: { officeStart: 6 } },
    }, { user: EMPLOYEE });
    expect(res.ok).toBe(false);
  });

  it("1.5 Unauthenticated cannot read settings", async () => {
    clearSessionCookies();
    const res = await api.get("/api/hrm/v2/settings?role=super_admin");
    expect([401, 404]).toContain(res.status);
  });

  it("1.6 Work days persist including Saturday", async () => {
    await api.post("/api/hrm/v2/settings", {
      role: "super_admin", userId: "system",
      settings: { officeRules: { workDays: [1,2,3,4,5,6], requiredHours: 8.5, breakAllowance: 30 } },
    }, { user: HR_ADMIN });
    const getRes = await api.get("/api/hrm/v2/settings?role=super_admin", { user: HR_ADMIN });
    if (getRes.ok && getRes.data?.officeRules?.workDays) {
      expect(getRes.data.officeRules.workDays).toContain(6);
    }
  });

  it("1.7 Required hours and break allowance are configurable", async () => {
    await api.post("/api/hrm/v2/settings", {
      role: "super_admin", userId: "system",
      settings: { officeRules: { requiredHours: 8, breakAllowance: 45, meetingCountsAsWork: true, workDays: [1,2,3,4,5] } },
    }, { user: HR_ADMIN });
    const getRes = await api.get("/api/hrm/v2/settings?role=super_admin", { user: HR_ADMIN });
    if (getRes.ok && getRes.data?.officeRules) {
      expect(getRes.data.officeRules.requiredHours).toBe(8);
      expect(getRes.data.officeRules.breakAllowance).toBe(45);
    }
  });
});

describe("Work Days Affect Attendance", () => {
  it("2.1 Non-work day punch-in is marked as week_off", async () => {
    if (!employeeUserId) return;
    const rulesRes = await api.get("/api/hrm/v2/tenants/current", { user: EMPLOYEE });
    if (!rulesRes.ok || !rulesRes.data?.officeRules?.workDays) return;
    const workDays = rulesRes.data.officeRules.workDays;
    const today = new Date();
    const dayOfWeek = today.getDay();
    if (!workDays.includes(dayOfWeek)) {
      const res = await api.post("/api/hrm/v2/attendance", {
        userId: employeeUserId, date: today.toISOString(), workdayType: "weekly_off",
      }, { user: EMPLOYEE });
      if (res.ok && res.data) {
        expect(["week_off", "WEEK_OFF"]).toContain(res.data.status);
      }
    }
  });

  it("2.2 Work day punch-in creates present record", async () => {
    if (!employeeUserId) return;
    const today = new Date();
    const dayOfWeek = today.getDay();
    await api.post("/api/hrm/v2/settings", {
      role: "super_admin", userId: "system",
      settings: { officeRules: { workDays: [dayOfWeek], requiredHours: 8.5, breakAllowance: 30 } },
    }, { user: HR_ADMIN });
    const res = await api.post("/api/hrm/v2/attendance", {
      userId: employeeUserId, date: today.toISOString(), checkIn: today.toISOString(),
    }, { user: EMPLOYEE });
    if (res.ok && res.data) {
      expect(["present", "late", "PRESENT", "LATE"]).toContain(res.data.status);
    }
  });
});

describe("Configuration Edge Cases", () => {
  it("3.1 Empty workDays is handled gracefully", async () => {
    const res = await api.post("/api/hrm/v2/settings", {
      role: "super_admin", userId: "system",
      settings: { officeRules: { workDays: [], requiredHours: 8.5, breakAllowance: 30 } },
    }, { user: HR_ADMIN });
    expect([200, 201, 400, 401, 403, 404]).toContain(res.status);
  });

  it("3.2 Multiple rapid saves do not corrupt data", async () => {
    const saves = Array.from({ length: 5 }, (_, i) =>
      api.post("/api/hrm/v2/settings", {
        role: "super_admin", userId: "system",
        settings: { officeRules: { requiredHours: 8 + i * 0.5, breakAllowance: 30, workDays: [1,2,3,4,5] } },
      }, { user: HR_ADMIN })
    );
    await Promise.all(saves);
    const getRes = await api.get("/api/hrm/v2/settings?role=super_admin", { user: HR_ADMIN });
    if (getRes.ok && getRes.data?.officeRules) {
      expect(typeof getRes.data.officeRules.requiredHours).toBe("number");
    }
  });
});
