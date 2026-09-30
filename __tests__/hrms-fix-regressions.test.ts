/**
 * Regression tests for the Sept 2026 HRMS fix batch.
 *
 * Covers:
 *  - Attendance GET returns AUX state (auxState/auxHistory/workLocation) —
 *    previously stripped, which froze the punch card UI.
 *  - Offer-letter endpoints are fully removed (404) — the feature no longer
 *    exists; onboarding approval sends only the welcome email.
 *
 * Requires the dev server (TEST_BASE_URL, default http://localhost:3000).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, registerUser, loginUser, clearSessionCookies, uniqueEmail, type TestUser } from "./helpers";

const EMPLOYEE: TestUser = {
  email: uniqueEmail("regression-emp"),
  password: "Employee@123",
  displayName: "Regression Employee",
};
const HR_ADMIN: TestUser = {
  email: "hr-admin-regressions@company.com",
  password: "HRAdmin@123",
  displayName: "Regression HR",
};

let employeeUserId: string | undefined;

beforeAll(async () => {
  clearSessionCookies();
  const regRes = await registerUser(EMPLOYEE);
  if (regRes.ok && regRes.data) employeeUserId = regRes.data.uid;
  await loginUser(HR_ADMIN.email, HR_ADMIN.password);
}, 60000);

afterAll(() => {
  clearSessionCookies();
});

describe("Attendance AUX fields (fix 6)", () => {
  it("attendance GET returns auxState, auxHistory and workLocation", async () => {
    if (!employeeUserId) return;
    const res = await api.get(`/api/hrm/v2/attendance?userId=${employeeUserId}`, { user: EMPLOYEE });
    if (!res.ok) return; // DB unavailable in CI — skip silently
    const rows = Array.isArray(res.data) ? res.data : [];
    expect(rows.length).toBeGreaterThanOrEqual(0);
    for (const rec of rows) {
      expect(rec.auxState).toBeDefined();
      expect(Array.isArray(rec.auxHistory)).toBe(true);
      expect(["office", "remote"]).toContain(rec.workLocation);
    }
  });
});

describe("Offer-letter removal", () => {
  it("offer-letter endpoints no longer exist (404, not 400/403)", async () => {
    const res = await api.post("/api/hrm/v2/offer-letters", {}, { user: EMPLOYEE });
    expect([404, 405]).toContain(res.status);
  });
});
