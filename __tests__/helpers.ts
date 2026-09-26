/**
 * API Test Helper
 *
 * Provides utility functions for testing HRMS API endpoints.
 * Tests run against the running dev server (must be started separately).
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

// ── Types ──────────────────────────────────────────────────

export interface TestUser {
  id?: string;
  email: string;
  password: string;
  displayName: string;
  role?: string;
  sessionCookie?: string;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

// ── Cookie Jar (per-user session tracking) ─────────────────

const cookieJars = new Map<string, string>();

export function getSessionCookie(email: string): string | undefined {
  return cookieJars.get(email);
}

export function setSessionCookie(email: string, cookie: string) {
  cookieJars.set(email, cookie);
}

export function clearSessionCookies() {
  cookieJars.clear();
}

// ── API Client ─────────────────────────────────────────────

export async function apiRequest<T = any>(
  method: string,
  path: string,
  options: {
    body?: any;
    user?: TestUser;
    headers?: Record<string, string>;
  } = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    ...options.headers,
  };

  // Attach session cookie if user is provided
  if (options.user?.sessionCookie) {
    headers["Cookie"] = options.user.sessionCookie;
  } else if (options.user?.email) {
    const cookie = getSessionCookie(options.user.email);
    if (cookie) headers["Cookie"] = cookie;
  }

  if (options.body && typeof options.body === "object") {
    headers["Content-Type"] = "application/json";
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (options.body) {
    fetchOptions.body =
      typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, fetchOptions);

    // Extract and store ALL cookies from response
    const setCookieHeaders = res.headers.getSetCookie?.() || [];
    const rawSetCookie = res.headers.get("set-cookie");
    if (rawSetCookie) setCookieHeaders.push(...rawSetCookie.split(/, (?=[^=]+=)/));

    if (options.user?.email && setCookieHeaders.length > 0) {
      for (const sc of setCookieHeaders) {
        const sessionMatch = sc.match(/session=([^;]+)/);
        if (sessionMatch) {
          setSessionCookie(options.user.email, `session=${sessionMatch[1]}`);
        }
      }
    }

    const json = await res.json().catch(() => null);

    return {
      ok: res.ok,
      status: res.status,
      data: json?.data ?? json,
      error: json?.error || (!res.ok ? `HTTP ${res.status}` : undefined),
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      error: err.message || "Network error",
    };
  }
}

// ── Convenience Methods ────────────────────────────────────

export const api = {
  get: (path: string, opts?: any) => apiRequest("GET", path, opts),
  post: (path: string, body: any, opts?: any) =>
    apiRequest("POST", path, { ...opts, body }),
  patch: (path: string, body: any, opts?: any) =>
    apiRequest("PATCH", path, { ...opts, body }),
  delete: (path: string, opts?: any) => apiRequest("DELETE", path, opts),
};

// ── Auth Helpers ───────────────────────────────────────────

/**
 * Create an employee through the real invite flow:
 *   1. POST /api/hrm/v2/auth {action:"request-invite"} — email + department only
 *   2. HR approves the onboarding request → account created with a temp password
 *   3. Login with the temp password and change it to the requested one
 *
 * Returns the final login response; `user.id` is set on success. Suites
 * treat registerUser failures as non-fatal, so any step may fail gracefully
 * when the DB/email transport is unavailable.
 */
export async function registerUser(user: TestUser): Promise<ApiResponse> {
  const HR: TestUser = {
    email: process.env.TEST_HR_EMAIL || "hr-admin@company.com",
    password: process.env.TEST_HR_PASSWORD || "HRAdmin@123",
    displayName: "Test HR Admin",
  };

  // 1. Account request (public, no session).
  await api.post("/api/hrm/v2/auth", {
    action: "request-invite",
    email: user.email,
    department: "Software Engineering",
  });

  // 2. HR login + approve the request.
  await loginUser(HR.email, HR.password);
  const queue = await api.get("/api/hrm/v2/onboarding?pending=true", { user: HR });
  const rows: any[] = Array.isArray(queue.data) ? queue.data : [];
  const request = rows.find((r) => r.email === user.email && r.status === "invite_requested");
  if (!request) {
    return { ok: false, status: queue.status || 404, error: "invite request not found in HR queue" };
  }
  const approve = await api.post("/api/hrm/v2/onboarding", {
    action: "update_task",
    taskId: request.id || request._id,
    status: "approved",
  }, { user: HR });
  if (!approve.ok) {
    return { ok: false, status: approve.status, error: approve.error || "approval failed" };
  }
  // tempPassword is surfaced to the approver only when the welcome email
  // could not be delivered (CI has no SMTP); otherwise use the suite password.
  const tempPassword: string = approve.data?.tempPassword || user.password;
  user.id = approve.data?.userId || (approve.data?._id ? String(approve.data._id) : undefined);

  // 3. First login with the temp password (mustChangePassword fence active).
  const firstLogin = await loginUser(user.email, tempPassword);
  if (!firstLogin.ok) {
    return { ok: false, status: firstLogin.status, error: firstLogin.error || "temp-password login failed" };
  }

  // 4. Create the real password.
  const changeRes = await api.patch("/api/hrm/v2/users", {
    userId: user.id,
    action: "force-change-password",
    newPassword: user.password,
  }, { user: { email: user.email, password: tempPassword, displayName: user.displayName } });
  if (!changeRes.ok) {
    return { ok: false, status: changeRes.status, error: changeRes.error || "force-change-password failed" };
  }

  // 5. Log in normally so the session jar holds a full session.
  return loginUser(user.email, user.password);
}

export async function loginUser(
  email: string,
  password: string
): Promise<ApiResponse> {
  // CRITICAL: pass a user context keyed by email so apiRequest stores the
  // signed session cookie in the jar. Without this, every subsequent
  // api.get/post with { user } silently sent NO cookie and the suite's
  // auth-dependent tests were vacuous (401 → early-return skips).
  const res = await api.post(
    "/api/auth/login",
    { email, password },
    { user: { email, password, displayName: "" } }
  );
  return res;
}

export async function getAuthUser(
  user: TestUser
): Promise<ApiResponse> {
  return api.get("/api/auth/session", { user });
}

// ── Assertion Helpers ──────────────────────────────────────

export function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function assertEqual<T>(
  actual: T,
  expected: T,
  message: string
): void {
  if (actual !== expected) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

export function assertIncludes(
  haystack: string,
  needle: string,
  message: string
): void {
  if (!haystack.includes(needle)) {
    throw new Error(
      `${message}: "${needle}" not found in "${haystack}"`
    );
  }
}

// ── Test Data Generator ────────────────────────────────────

let testCounter = 0;
export function uniqueEmail(prefix: string = "test"): string {
  testCounter++;
  const timestamp = Date.now();
  return `${prefix}-${timestamp}-${testCounter}@test.example.com`;
}

export function generateEmployeeCode(): string {
  return `EMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}
