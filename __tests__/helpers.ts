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

export async function registerUser(user: TestUser): Promise<ApiResponse> {
  const res = await api.post("/api/hrm/v2/auth", {
    action: "register",
    email: user.email,
    password: user.password,
    displayName: user.displayName,
    role: "employee", // Registration always creates employees
  });
  return res;
}

export async function loginUser(
  email: string,
  password: string
): Promise<ApiResponse> {
  const res = await api.post("/api/auth/login", {
    email,
    password,
  });
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
