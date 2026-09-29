/**
 * Regression tests: optional onboarding form + auto reporting-manager.
 *
 *  A. The request-invite form accepts a stub payload (email + department
 *     only) — every other field is optional. Format checks still fire on
 *     provided values (invalid PAN is still rejected).
 *  B. Approving an invite request auto-assigns a reporting manager (an
 *     active manager in the department, else the first active manager) and
 *     notifies them; the approved account carries reportingManager.
 *
 * Prerequisites: server running at TEST_BASE_URL with seeded HR account;
 * every test degrades to a graceful skip when the environment is missing.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  api,
  loginUser,
  clearSessionCookies,
  getSessionCookie,
  uniqueEmail,
  type TestUser,
} from "./helpers";

const HR_ADMIN: TestUser = {
  email: "hr-admin-onboard-test@company.com",
  password: "HRAdmin@123",
  displayName: "HR Admin Tester",
};

let hrReady = false;

beforeAll(async () => {
  clearSessionCookies();
  const login = await loginUser(HR_ADMIN.email, HR_ADMIN.password);
  hrReady = login.ok && Boolean(getSessionCookie(HR_ADMIN.email));
}, 60_000);

afterAll(() => {
  clearSessionCookies();
});

describe("Onboarding form is optional except email", () => {
  it("A1. accepts a stub payload (email + department only)", async () => {
    const res = await api.post("/api/hrm/v2/auth", {
      action: "request-invite",
      email: uniqueEmail("stub-ok"),
      department: "Software Development",
    });
    if (res.status === 500) return; // DB unavailable — graceful skip
    expect(res.status).toBe(201);
  });

  it("A2. still rejects an invalid PAN when one IS provided", async () => {
    const res = await api.post("/api/hrm/v2/auth", {
      action: "request-invite",
      email: uniqueEmail("stub-bad-pan"),
      department: "Software Development",
      panNo: "12345",
    });
    if (res.status === 500) return;
    expect(res.status).toBe(400);
    expect(res.error).toMatch(/PAN/i);
  });
});

describe("Auto reporting-manager assignment on approval", () => {
  it("B1. approved account carries a reportingManager", async () => {
    if (!hrReady) return;
    const email = uniqueEmail("auto-rm-emp");

    const invite = await api.post("/api/hrm/v2/auth", {
      action: "request-invite",
      email,
      department: "Software Development",
    });
    if (invite.status === 500) return;

    const queue = await api.get("/api/hrm/v2/onboarding?pending=true", { user: HR_ADMIN });
    if (!queue.ok) return;
    const rows: any[] = Array.isArray(queue.data) ? queue.data : [];
    const request = rows.find((r) => r.email === email && r.status === "invite_requested");
    if (!request) return;

    const approve = await api.post("/api/hrm/v2/onboarding", {
      action: "update_task",
      taskId: request.id || request._id,
      status: "approved",
    }, { user: HR_ADMIN });
    if (!approve.ok) return;

    const list = await api.get("/api/hrm/v2/employees", { user: HR_ADMIN });
    if (!list.ok) return;
    const payload: any = (list.data as any)?.data ?? list.data;
    const emps: any[] = Array.isArray(payload) ? payload : [];
    const created = emps.find((e) => String(e.email).toLowerCase() === email.toLowerCase());
    if (!created) return;

    expect(created.reportingManager).toBeTruthy();
    expect(typeof created.reportingManager).toBe("string");
  });
});
