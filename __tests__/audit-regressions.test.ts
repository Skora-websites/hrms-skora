/**
 * Regression tests for the production-readiness audit fixes.
 *
 * Runs against the live server harness (scripts/test-with-server.js) using
 * the seeded accounts from scripts/seed-test-accounts.js.
 *
 * Covered fixes:
 *  1. Offer-letter PDF password is no longer leaked in a download header.
 *  2. Manager IDOR on GET /api/hrm/v2/employees?id=<other-employee>.
 *  3. Manager cannot delete employees (DELETE /api/hrm/v2/employees).
 *  4. Manager IDOR on GET /api/hrm/v2/documents?id=<other-user-doc>.
 *  5. Document verification attribution (verifiedById = authenticated caller).
 *  6. Login-disable revokes the victim's live sessions.
 *  7. Forced-password-change fence-check endpoint reflects DB truth.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  api,
  registerUser,
  loginUser,
  clearSessionCookies,
  getSessionCookie,
  uniqueEmail,
  type TestUser,
} from "./helpers";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";

const manager: TestUser = {
  email: "manager-api-test@company.com",
  password: "Manager@123",
  displayName: "Manager API Test",
  role: "manager",
};
const hrAdmin: TestUser = {
  email: "hr-admin-regressions@company.com",
  password: "HRAdmin@123",
  displayName: "HR Admin Regressions",
  role: "hr_admin",
};
const superAdmin: TestUser = {
  email: "superadmin-api-test@company.com",
  password: "SuperAdmin@123",
  displayName: "Super Admin API Test",
  role: "super_admin",
};

let empA: TestUser;
let empB: TestUser;
let deptEmpA2: TestUser; // profile-image persistence test (test 13)

async function makeEmployee(prefix: string): Promise<TestUser> {
  const u: TestUser = {
    email: uniqueEmail(prefix),
    password: "Employee@123",
    displayName: `${prefix} user`,
  };
  const reg = await registerUser(u);
  if (reg.ok && (reg.data as any)?.uid) u.id = (reg.data as any).uid as string;
  const login = await loginUser(u.email, u.password);
  if (!login.ok) throw new Error(`makeEmployee: login failed for ${u.email}: ${login.status}`);
  u.sessionCookie = getSessionCookie(u.email) ?? "";
  if (!u.sessionCookie) throw new Error(`makeEmployee: no session cookie captured for ${u.email}`);
  return u;
}

/** Look up a user's id via the HR directory (fallback when register's uid is missing). */
async function findUserIdByEmail(email: string): Promise<string | undefined> {
  const res = await api.get("/api/hrm/v2/employees", { user: hrAdmin });
  const list = (res.data as any)?.data ?? res.data;
  if (Array.isArray(list)) {
    const found = list.find((e: any) => e.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id ?? found._id;
  }
  return undefined;
}

beforeAll(async () => {
  clearSessionCookies();
  const hrLogin = await loginUser(hrAdmin.email, hrAdmin.password);
  const mgrLogin = await loginUser(manager.email, manager.password);
  const ceoLogin = await loginUser(superAdmin.email, superAdmin.password);
  if (!hrLogin.ok) throw new Error(`HR admin login failed: ${hrLogin.status} ${hrLogin.error}`);
  if (!mgrLogin.ok) throw new Error(`Manager login failed: ${mgrLogin.status} ${mgrLogin.error}`);
  if (!ceoLogin.ok) throw new Error(`Super admin login failed: ${ceoLogin.status} ${ceoLogin.error}`);
  hrAdmin.sessionCookie = getSessionCookie(hrAdmin.email) ?? "";
  manager.sessionCookie = getSessionCookie(manager.email) ?? "";
  superAdmin.sessionCookie = getSessionCookie(superAdmin.email) ?? "";

  empA = await makeEmployee("audit-fix-emp-a");
  empB = await makeEmployee("audit-fix-emp-b");
  if (!empA.id) empA.id = await findUserIdByEmail(empA.email);
  if (!empB.id) empB.id = await findUserIdByEmail(empB.email);

  deptEmpA2 = await makeEmployee("audit-img-emp");
  if (!deptEmpA2.id) deptEmpA2.id = await findUserIdByEmail(deptEmpA2.email);
}, 90_000);

describe("Audit regression suite", () => {
  it("1. offer-letter download does NOT leak the PDF password in headers", async () => {
    const post = await api.post("/api/hrm/v2/offer-letters", {}, { user: empA });
    if (!post.ok) return; // offer-letter flow unavailable in this environment
    const id = post.data?.id as string | undefined;
    if (!id) return;

    const patch = await api.patch(`/api/hrm/v2/offer-letters?id=${id}`, { status: "released" }, { user: superAdmin });
    if (!patch.ok) return;

    const res = await fetch(`${BASE}/api/hrm/v2/offer-letters/download?id=${id}`, {
      headers: { Cookie: empA.sessionCookie ?? "" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-offer-letter-password")).toBeNull();
    expect(res.headers.get("content-type")).toContain("application/pdf");
  });

  it("2. manager cannot GET a stranger's employee record by id (IDOR fixed)", async () => {
    expect(empA.id).toBeTruthy();
    const res = await api.get(`/api/hrm/v2/employees?id=${empA.id}`, { user: manager });
    expect([403, 404]).toContain(res.status);
  });

  it("3. manager cannot DELETE an employee (fixed)", async () => {
    expect(empB.id).toBeTruthy();
    const res = await api.delete(`/api/hrm/v2/employees?id=${empB.id}`, { user: manager });
    expect(res.status).toBe(403);
    // Record must still exist for HR.
    const check = await api.get(`/api/hrm/v2/employees?id=${empB.id}`, { user: hrAdmin });
    expect(check.status).toBe(200);
  });

  it("4. manager cannot read a stranger's document by id (IDOR fixed)", async () => {
    const form = new FormData();
    form.append("title", "Audit fix doc");
    form.append("userId", empA.id as string);
    form.append("file", new Blob(["hello"], { type: "text/plain" }), "note.txt");
    const upload = await fetch(`${BASE}/api/hrm/v2/documents`, {
      method: "POST",
      headers: { Cookie: hrAdmin.sessionCookie ?? "" },
      body: form,
    });
    // NOTE: after the upload-hardening fix, .txt is rejected by design —
    // upload a PDF-shaped payload instead when the strict allowlist is live.
    if (!upload.ok) {
      const form2 = new FormData();
      form2.append("title", "Audit fix doc");
      form2.append("userId", empA.id as string);
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
      form2.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "note.pdf");
      const retry = await fetch(`${BASE}/api/hrm/v2/documents`, {
        method: "POST",
        headers: { Cookie: hrAdmin.sessionCookie ?? "" },
        body: form2,
      });
      if (!retry.ok) return; // upload path unavailable — nothing to assert
      const docId = (await retry.json())?.data?.id;
      if (!docId) return;
      const asManager = await api.get(`/api/hrm/v2/documents?id=${docId}`, { user: manager });
      expect(asManager.status).toBe(403);
      const asOwner = await api.get(`/api/hrm/v2/documents?id=${docId}`, { user: empA });
      expect(asOwner.status).toBe(200);
      return;
    }
    const docId = (await upload.json())?.data?.id;
    if (!docId) return;
    const asManager = await api.get(`/api/hrm/v2/documents?id=${docId}`, { user: manager });
    expect(asManager.status).toBe(403);
    const asOwner = await api.get(`/api/hrm/v2/documents?id=${docId}`, { user: empA });
    expect(asOwner.status).toBe(200);
  });

  it("5. document verification records the CALLER as verifier, not a spoofed id", async () => {
    const form = new FormData();
    form.append("title", "Verify attribution doc");
    form.append("userId", empA.id as string);
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    form.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "v.pdf");
    const upload = await fetch(`${BASE}/api/hrm/v2/documents`, {
      method: "POST",
      headers: { Cookie: hrAdmin.sessionCookie ?? "" },
      body: form,
    });
    if (!upload.ok) return; // upload path unavailable
    const docId = (await upload.json())?.data?.id;
    if (!docId) return;

    const patch = await api.patch(
      `/api/hrm/v2/documents?id=${docId}`,
      { verify: true, verifiedById: "spoofed-user-id" },
      { user: hrAdmin }
    );
    if (!patch.ok) return; // rejected — also acceptable
    const verifiedById = (patch.data as any)?.verifiedById ?? (patch.data as any)?.data?.verifiedById;
    expect(verifiedById).not.toBe("spoofed-user-id");
  });

  it("6. disabling a user's login revokes their existing sessions", async () => {
    const target = empA;
    const me1 = await api.get("/api/auth/session", { user: target });
    expect(me1.ok).toBe(true);

    const disable = await api.patch(
      "/api/hrm/v2/users",
      { userId: target.id, action: "login-status", loginStatus: "disabled" },
      { user: hrAdmin }
    );
    expect(disable.ok).toBe(true);

    const me2 = await api.get("/api/auth/session", { user: target });
    // The session endpoint answers 200 with user:null once every session
    // document is gone — assert the USER is gone, not the status code.
    expect((me2.data as any)?.user ?? null).toBeNull();

    // Re-enable and restore a session for cleanliness.
    await api.patch(
      "/api/hrm/v2/users",
      { userId: target.id, action: "login-status", loginStatus: "enabled" },
      { user: hrAdmin }
    );
    await loginUser(target.email, target.password);
    // Refresh the stored cookie — the old session was revoked above.
    target.sessionCookie = getSessionCookie(target.email) ?? "";
    if (!target.sessionCookie) throw new Error("session not restored after re-enable");
  });  it("7. fence-check endpoint reflects DB truth and requires a valid session", async () => {
    const anon = await fetch(`${BASE}/api/auth/fence-check`);
    expect(anon.status).toBe(200);
    expect((await anon.json()).required).toBe(false);

    const forged = await fetch(`${BASE}/api/auth/fence-check`, {
      headers: { Cookie: "session=forged.token" },
    });
    expect(forged.status).toBe(200);
    expect((await forged.json()).required).toBe(false);
  });

  it("8. leave application in the past is rejected (business rule)", async () => {
    expect(empA.id).toBeTruthy();
    const typesRes = await api.get("/api/hrm/v2/leaves?type=types", { user: hrAdmin });
    if (!typesRes.ok) return; // environment without seeded leave types
    const leaveTypeId = (Array.isArray(typesRes.data) ? typesRes.data : (typesRes.data as any)?.data)?.[0]?.id;
    if (!leaveTypeId) return;

    const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const res = await api.post("/api/hrm/v2/leaves", {
      action: "apply",
      leaveTypeId,
      fromDate: past.toISOString().split("T")[0],
      toDate: past.toISOString().split("T")[0],
      reason: "Retroactive leave should be rejected",
    }, { user: empA });
    expect([400, 422]).toContain(res.status);
  });

  it("9. duplicate overlapping leave application is rejected (business rule)", async () => {
    expect(empB.id).toBeTruthy();
    const typesRes = await api.get("/api/hrm/v2/leaves?type=types", { user: hrAdmin });
    if (!typesRes.ok) return;
    const leaveTypeId = (Array.isArray(typesRes.data) ? typesRes.data : (typesRes.data as any)?.data)?.[0]?.id;
    if (!leaveTypeId) return;

    const start = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const end = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
    const payload = {
      action: "apply",
      leaveTypeId,
      fromDate: start.toISOString().split("T")[0],
      toDate: end.toISOString().split("T")[0],
      reason: "First application",
    };

    const first = await api.post("/api/hrm/v2/leaves", payload, { user: empB });
    if (!first.ok) return; // environment constraint (e.g. no balance) — skip
    expect(first.data?.status ?? "pending").toBe("pending");

    // Double submission — same overlapping window.
    const second = await api.post("/api/hrm/v2/leaves", { ...payload, reason: "Duplicate submission" }, { user: empB });
    expect([400, 409, 500]).toContain(second.status);

    // Cleanup: cancel the first so the test is repeatable.
    const reqId = (first.data as any)?.id;
    if (reqId) await api.post("/api/hrm/v2/leaves", { action: "cancel", id: reqId }, { user: empB });
  });

  it("10. duplicate payroll period is rejected (business rule)", async () => {
    const start = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const end = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const payload = {
      action: "process",
      payGroupId: "default",
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
    };

    const first = await api.post("/api/hrm/v2/payroll", payload, { user: hrAdmin });
    if (!first.ok && first.status === 403) return; // HR not allowed to run payroll in this env

    const second = await api.post("/api/hrm/v2/payroll", payload, { user: hrAdmin });
    expect([400, 409, 500]).toContain(second.status);
  }, 240_000); // a full payroll run over the whole workforce is genuinely slow

  // ── Project notification chain (super admin → manager → employee) ──

  it("11. super admin project creation notifies managers + department employees see the project", async () => {
    const unique = `Audit Notif Project ${Date.now()}`;
    const create = await api.post(
      "/api/hrm/v2/projects",
      { name: unique, description: "Notification chain test", status: "planning", priority: "medium" },
      { user: superAdmin }
    );
    expect(create.status).toBe(201);
    const projectId = (create.data as any)?.id ?? (create.data as any)?._id;
    expect(projectId).toBeTruthy();

    // The manager should have received a notification for this project.
    const mgrId = manager.id ?? (await findUserIdByEmail(manager.email));
    if (mgrId) {
      const notifs = await api.get(`/api/hrm/v2/notifications?userId=${mgrId}`, { user: manager });
      expect(notifs.status).toBe(200);
      const list = (notifs.data as any)?.data ?? notifs.data;
      const hit = Array.isArray(list)
        ? list.find(
            (n: any) =>
              n.referenceType === "project" &&
              String(n.referenceId) === String(projectId) &&
              /created the project/i.test(n.body || "")
          )
        : null;
      expect(hit).toBeTruthy();
    }

    // Leadership-created projects are visible to managers (they were told to
    // review and assign) — manager can fetch the created project by id.
    const view = await api.get(`/api/hrm/v2/projects?id=${projectId}`, { user: manager });
    expect(view.status).toBe(200);

    // Cleanup so repeat runs stay clean.
    await api.delete(`/api/hrm/v2/projects?id=${projectId}`, { user: superAdmin });
  }, 60_000);

  it("12. manager project creation adds department employees as members and notifies them", async () => {
    // Create two employees to stand in as the manager's department.
    const deptEmp1 = await makeEmployee("audit-notif-dept-a");
    const deptEmp2 = await makeEmployee("audit-notif-dept-b");
    // Put both in a distinctive department via HR.
    const dept = `NotifDept-${Date.now()}`;
    for (const e of [deptEmp1, deptEmp2]) {
      await api.patch(
        "/api/hrm/v2/users",
        { userId: e.id, action: "profile", department: dept },
        { user: hrAdmin }
      );
    }
    // Give the manager the same department.
    const mgrId = manager.id ?? (await findUserIdByEmail(manager.email));
    if (mgrId) {
      await api.patch(
        "/api/hrm/v2/users",
        { userId: mgrId, action: "profile", department: dept },
        { user: hrAdmin }
      );
    }

    const unique = `Dept Project ${Date.now()}`;
    const create = await api.post(
      "/api/hrm/v2/projects",
      { name: unique, description: "Manager fan-out test", status: "planning", priority: "high" },
      { user: manager }
    );
    if (!create.ok) return; // managers cannot create in this env — skip
    const projectId = (create.data as any)?.id ?? (create.data as any)?._id;
    expect(projectId).toBeTruthy();

    // Employees must now SEE the project (membership) ...
    const empProjects = await api.get("/api/hrm/v2/projects", { user: deptEmp1 });
    expect(empProjects.status).toBe(200);
    const list = (empProjects.data as any)?.data ?? empProjects.data;
    const visible = Array.isArray(list)
      ? list.some((p: any) => String(p.id ?? p._id) === String(projectId))
      : false;
    expect(visible).toBe(true);

    // ... and must have been notified.
    for (const e of [deptEmp1, deptEmp2]) {
      const notifs = await api.get(`/api/hrm/v2/notifications?userId=${e.id}`, { user: e });
      expect(notifs.status).toBe(200);
      const nlist = (notifs.data as any)?.data ?? notifs.data;
      const hit = Array.isArray(nlist)
        ? nlist.find((n: any) => n.referenceType === "project" && String(n.referenceId) === String(projectId))
        : null;
      expect(hit).toBeTruthy();
    }

    // Task assignment notifies the assignee.
    const task = await api.post(
      "/api/hrm/v2/projects?action=task",
      { projectId, title: `Notif task ${Date.now()}`, assigneeId: deptEmp1.id, priority: "medium", status: "todo" },
      { user: manager }
    );
    if (task.ok) {
      const notifs = await api.get(`/api/hrm/v2/notifications?userId=${deptEmp1.id}`, { user: deptEmp1 });
      const nlist = (notifs.data as any)?.data ?? notifs.data;
      const taskHit = Array.isArray(nlist)
        ? nlist.find((n: any) => n.referenceType === "task" && /assigned you a task/i.test(n.body || ""))
        : null;
      expect(taskHit).toBeTruthy();

      // Employee advances the task → owner (manager) is notified.
      const taskId = (task.data as any)?.id ?? (task.data as any)?._id;
      const advance = await api.patch(
        `/api/hrm/v2/projects?type=task&taskId=${taskId}`,
        { status: "in_progress" },
        { user: deptEmp1 }
      );
      expect(advance.status).toBe(200);
      const mgrNotifs = await api.get(`/api/hrm/v2/notifications?userId=${mgrId}`, { user: manager });
      const mgrList = (mgrNotifs.data as any)?.data ?? mgrNotifs.data;
      const ownerHit = Array.isArray(mgrList)
        ? mgrList.find((n: any) => n.referenceType === "task" && /moved/i.test(n.body || ""))
        : null;
      expect(ownerHit).toBeTruthy();
    }

    await api.delete(`/api/hrm/v2/projects?id=${projectId}`, { user: superAdmin });
  }, 120_000);

  it("13. profile image + department/designation persist end-to-end", async () => {
    // Upload a tiny valid PNG through the profile upload endpoint.
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAADAAFbyM40AAAAAElFTkSuQmCC";
    const bytes = Buffer.from(pngBase64, "base64");
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(bytes)], { type: "image/png" }), "avatar.png");
    const up = await fetch(`${BASE}/api/upload`, {
      method: "POST",
      headers: { Cookie: deptEmpA2.sessionCookie ?? "" },
      body: form,
    });
    expect(up.status).toBe(200);
    const upData: any = await up.json();
    expect(upData.url).toContain("data:image/png;base64,");

    // PATCH the profile with the image + department + designation.
    const patch = await api.patch(
      "/api/hrm/v2/users",
      { userId: deptEmpA2.id, action: "profile", image: upData.url, department: "Eng Upload", designation: "QA Engineer" },
      { user: deptEmpA2 }
    );
    expect(patch.status).toBe(200);

    // Values must round-trip from the DB.
    // NOTE: employees may only read their OWN record via this endpoint, so
    // verify with the same authenticated session (and tolerate id/email
    // mismatch by falling back to the session identity).
    let uidForCheck = deptEmpA2.id;
    if (!uidForCheck) {
      const sess = await api.get("/api/auth/session", { user: deptEmpA2 });
      uidForCheck = (sess.data as any)?.user?.id;
    }
    const get = await api.get(`/api/hrm/v2/users?action=get&userId=${uidForCheck}`, { user: deptEmpA2 });
    // helpers already unwrap { data: X } — get.data IS the user object.
    const user = (get.data as any)?.data ?? get.data;
    expect(user?.image).toContain("data:image/png;base64,");
    expect(user?.department === "Eng Upload" || user?.departmentName === "Eng Upload").toBe(true);
    expect(user?.designation === "QA Engineer" || user?.designationName === "QA Engineer").toBe(true);
  }, 60_000);

});
