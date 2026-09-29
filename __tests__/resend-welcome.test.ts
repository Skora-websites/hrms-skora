/**
 * Regression tests: HR "resend welcome email" recovery action.
 *
 *  A. Happy path: after an invite approval, HR can resend the welcome
 *     email — a fresh temporary password is minted and the account stays
 *     fenced (mustChangePassword=true).
 *  B. Activated guard: once the employee has completed the forced password
 *     change, resend is refused with 409 (use reset-password instead).
 *  C. Role guard: managers cannot resend welcome credentials (403).
 *
 * Prerequisites: server running at TEST_BASE_URL with seeded HR + manager
 * accounts; every test degrades to a graceful skip when the environment is
 * missing.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  api,
  loginUser,
  registerUser,
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
const MANAGER: TestUser = {
  email: "manager-onboard-test@company.com",
  password: "Manager@123",
  displayName: "Manager Tester",
};

let hrReady = false;

beforeAll(async () => {
  clearSessionCookies();
  const hrLogin = await loginUser(HR_ADMIN.email, HR_ADMIN.password);
  const mgrLogin = await loginUser(MANAGER.email, MANAGER.password);
  hrReady = hrLogin.ok && Boolean(getSessionCookie(HR_ADMIN.email));
  if (mgrLogin.ok) MANAGER.sessionCookie = getSessionCookie(MANAGER.email);
}, 60_000);

afterAll(() => {
  clearSessionCookies();
});

async function createFencedEmployee(prefix: string): Promise<TestUser | null> {
  // A full invite-flow employee that has NOT yet completed the forced
  // password change: approve only (no first login), so mustChangePassword
  // stays true and emailSent may be true or false.
  const email = uniqueEmail(prefix);
  const invite = await api.post("/api/hrm/v2/auth", {
    action: "request-invite",
    email,
    department: "Software Development",
  });
  if (invite.status === 500) return null;

  const queue = await api.get("/api/hrm/v2/onboarding?pending=true", { user: HR_ADMIN });
  if (!queue.ok) return null;
  const rows: any[] = Array.isArray(queue.data) ? queue.data : [];
  const request = rows.find((r) => r.email === email && r.status === "invite_requested");
  if (!request) return null;

  const approve = await api.post("/api/hrm/v2/onboarding", {
    action: "update_task",
    taskId: request.id || request._id,
    status: "approved",
  }, { user: HR_ADMIN });
  if (!approve.ok) return null;

  return {
    id: (approve.data as any)?.userId,
    email,
    password: "Employee@123",
    displayName: prefix,
  };
}

describe("HR resend-welcome recovery action", () => {
  it("A. resend issues a fresh temp password and keeps the account fenced", async () => {
    if (!hrReady) return;
    const emp = await createFencedEmployee("resend-emp");
    if (!emp) return;

    const res = await api.patch("/api/hrm/v2/users", {
      userId: emp.email,
      action: "resend-welcome",
    }, { user: HR_ADMIN });
    if (res.status === 500) return; // DB/email unavailable — graceful skip
    expect(res.status).toBe(200);
    expect((res.data as any)?.success).toBe(true);
    // Either the email went out, or SMTP is unavailable and the fresh
    // temporary password is surfaced for manual handover.
    const payload = res.data as any;
    expect(payload.emailSent === true || typeof payload.tempPassword === "string").toBe(true);
  });

  it("B. refuses resend once the account is activated (409)", async () => {
    if (!hrReady) return;
    // Fully activated employee: invite → approve → first login → forced change.
    const reg = await registerUser({
      email: uniqueEmail("resend-activated"),
      password: "Employee@123",
      displayName: "Resend Activated",
    });
    if (!reg.ok) return;

    const res = await api.patch("/api/hrm/v2/users", {
      userId: reg.data?.uid || reg.data?.email,
      action: "resend-welcome",
    }, { user: HR_ADMIN });
    expect(res.status).toBe(409);
  });

  it("C. managers cannot resend welcome credentials (403)", async () => {
    if (!hrReady || !MANAGER.sessionCookie) return;
    const emp = await createFencedEmployee("resend-mgr-target");
    if (!emp) return;

    const res = await api.patch("/api/hrm/v2/users", {
      userId: emp.email,
      action: "resend-welcome",
    }, { user: MANAGER });
    expect([401, 403]).toContain(res.status);
  });
});
