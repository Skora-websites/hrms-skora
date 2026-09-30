import { NextRequest, NextResponse } from "next/server";
import {
  getEmployees,
  getEmployeesPaginated,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeProfile,
} from "@/services/hrm/employee";
import { requireAuth, requireAdmin, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest, notFound, forbidden } from "@/lib/api-handler";
import { employeeCreateSchema, parseBody } from "@/lib/validations";
import { getDb } from "@/lib/db/mongo-helper";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { normalizeRole } from "@/lib/rbac";
import { validatePasswordPolicy } from "@/lib/password-policy";

// Create/delete of employees is an HR function. requireAdmin alone would let
// any manager create or remove accounts, so these are gated explicitly.
const HR_LEVEL_ROLES = new Set(["super_admin", "hr_admin", "admin"]);

/** Resolve the manager-of relationship for direct-report scoping. */
async function isDirectReport(managerId: string, employeeId: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const employee = await db.collection("users").findOne({ _id: new ObjectId(employeeId) });
    const rm = (employee as any)?.reportingManager;
    if (!rm) return false;
    // reportingManager stores either the manager's ObjectId or the manager's
    // display name (CEO assigns via dropdown). Accept either representation.
    if (rm === managerId) return true;
    const manager = await db.collection("users").findOne({ _id: new ObjectId(managerId) });
    return !!manager && rm === (manager as any).displayName;
  } catch {
    return false;
  }
}

/** Fields safe to return in list/detail reads and to accept on HR updates.
 *  Credential fields (passwordHash, legacy plaintext password) and statutory
 *  onboarding PII never ride responses, and HR callers cannot write role or
 *  credential fields through this route (role changes are CEO-only via
 *  /api/hrm/v2/users action=role; passwords are set via dedicated flows). */
const SAFE_USER_FIELDS = [
  "id", "_id", "email", "displayName", "name", "firstName", "lastName",
  "role", "status", "department", "departmentName", "departmentId",
  "designation", "designationName", "designationId", "employeeCode",
  "joiningDate", "phone", "employmentType", "reportingManager", "image",
  "address", "emergencyContact", "emergencyPhone", "tenantId", "createdAt",
  "updatedAt",
] as const;

/** Project a user document down to non-sensitive fields. */
function projectUser(u: any): Record<string, unknown> {
  if (!u || typeof u !== "object") return u;
  const out: Record<string, unknown> = {};
  for (const f of SAFE_USER_FIELDS) {
    if (u[f] !== undefined) out[f] = u[f];
  }
  return out;
}

/** Can the caller view the given employee record? Managers see their own
 *  record plus direct reports; employees only themselves; HR all. */
async function canViewEmployee(caller: { userId: string; role: string }, targetId: string): Promise<boolean> {
  if (HR_LEVEL_ROLES.has(caller.role)) return true;
  if (caller.role === "manager") {
    return targetId === caller.userId || (await isDirectReport(caller.userId, targetId));
  }
  return targetId === caller.userId;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const profile = searchParams.get("profile");

  // Check for server-table pagination params
  const page = searchParams.get("page");
  const pageSize = searchParams.get("pageSize");
  const search = searchParams.get("search");
  const sortKey = searchParams.get("sortKey");
  const sortDir = searchParams.get("sortDir");
  const status = searchParams.get("status");

  const hasPagination = page !== null && pageSize !== null;

  // Employees can only view their own profile
  if (auth.role === "employee" && id && id !== auth.userId) {
    return forbidden("You can only view your own profile");
  }

  // Managers may only view their own record or their direct reports (IDOR guard).
  if (auth.role === "manager" && id && !(await canViewEmployee(auth, id))) {
    return forbidden("You can only view your own record or your direct reports");
  }

  if (id && profile === "true") {
    const result = await getEmployeeProfile(id);
    if (!result.user) {
      return notFound("Employee not found");
    }
    return NextResponse.json({ data: { ...result, user: projectUser(result.user) } });
  }

  if (id) {
    const employee = await getEmployeeById(id);
    if (!employee) {
      return notFound("Employee not found");
    }
    return NextResponse.json({ data: projectUser(employee) });
  }

  // Employees can only view their own data
  if (auth.role === "employee") {
    const employee = await getEmployeeById(auth.userId);
    if (!employee) {
      return notFound("Employee not found");
    }
    return NextResponse.json({ data: [projectUser(employee)] });
  }

  // Managers are scoped to their direct reports (plus themselves) on every
  // list path — the org-wide directory is an HR-level view.
  let scopedEmployees = null;
  if (auth.role === "manager") {
    const all = await getEmployees(tenantId);
    // reportingManager stores the manager's ObjectId OR display name
    // (CEO-assigned dropdown), so match both representations.
    const me = await getEmployeeById(auth.userId);
    const myName = (me as any)?.displayName || "";
    scopedEmployees = all.filter(
      (e: any) =>
        e.id === auth.userId ||
        e.reportingManager === auth.userId ||
        (!!myName && e.reportingManager === myName)
    );
  }

  // Server-side paginated query
  if (hasPagination) {
    const result = await getEmployeesPaginated(tenantId, {
      page: page ? parseInt(page) : 0,
      pageSize: pageSize ? parseInt(pageSize) : 10,
      search: search || undefined,
      sortKey: sortKey || undefined,
      sortDir: sortDir === "asc" || sortDir === "desc" ? sortDir : undefined,
      status: status || undefined,
    });
    return NextResponse.json({
      data: result.data.map(projectUser),
      totalItems: result.totalItems,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  }

  // Legacy full-list query
  const employees = scopedEmployees ?? (await getEmployees(tenantId));
  return NextResponse.json({ data: employees.map(projectUser) });
}, { label: "HRM Employees" });

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  if (!HR_LEVEL_ROLES.has(auth.role)) {
    return forbidden("Only HR admins can create employees");
  }

  const tenantId = "default";

  const parsed = await parseBody(request, employeeCreateSchema);
  if (!parsed.success) return parsed.response!;
  const body: any = parsed.data;

  // Duplicate email → 409 with an actionable message (previously a raw 500).
  const normalizedEmail = body.email;
  const db = await getDb();
  if (db) {
    const existing = await db.collection("users").findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json(
        { error: "An employee with this email already exists" },
        { status: 409 }
      );
    }
  }

  // Privilege clamp: HR cannot mint super_admin accounts. CEO-only, same
  // rule as PATCH and the users route.
  const requestedRole = normalizeRole(body.role || "employee");
  if (requestedRole === "super_admin" && auth.role !== "super_admin") {
    return forbidden("Only Super Admin can create super_admin accounts");
  }

  const rawName = body.displayName || body.name || `${body.firstName || ""} ${body.lastName || ""}`.trim() || body.email;
  const nameParts = rawName.trim().split(" ");
  const firstName = body.firstName || nameParts[0] || "";
  const lastName = body.lastName || nameParts.slice(1).join(" ") || "";
  const displayName = rawName;
  // Default credentials are intentionally weak — force a password change on
  // first login instead of leaving a permanent shared password in place.
  // HR-provided passwords must satisfy the CEO's minimum-length policy.
  const password = body.password || "Employee@123";
  if (body.password) {
    const policyError = await validatePasswordPolicy(body.password);
    if (policyError) return badRequest(policyError);
  }
  const passwordHash = await bcrypt.hash(password, 12);

  const employee = await createEmployee(tenantId, {
    email: normalizedEmail,
    passwordHash,
    password,
    displayName,
    name: displayName,
    firstName,
    lastName,
    phone: body.phone || "",
    role: requestedRole,
    status: body.status || "active",
    department: body.department || body.departmentName || "Engineering",
    departmentId: body.departmentId || "",
    departmentName: body.department || body.departmentName || "Engineering",
    designation: body.designation || body.designationName || "Staff",
    designationId: body.designationId || "",
    designationName: body.designation || body.designationName || "Staff",
    joiningDate: body.joiningDate ? new Date(body.joiningDate) : new Date(),
    employeeCode: body.employeeCode || "",
    address: body.address || "",
    emergencyContact: body.emergencyContact || "",
    emergencyPhone: body.emergencyPhone || "",
    reportingManager: body.reportingManager || "",
    employmentType: body.employmentType || "permanent",
    mustChangePassword: !body.password,
  } as any);

  return NextResponse.json({ data: employee }, { status: 201 });
}, { label: "HRM Employees" });

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const body = await request.json();
  const id = searchParams.get("id") || body.id || body.userId || body._id;

  if (!id) {
    return badRequest("id parameter required");
  }

  // Managers may only edit their own direct reports.
  if (auth.role === "manager") {
    const target = await getEmployeeById(id);
    if (!target) return notFound("Employee not found");
    if ((target as any).reportingManager !== auth.userId) {
      return forbidden("You can only edit your direct reports");
    }
    // Managers must not touch role/status/employment fields.
    const allowedForManager = new Set([
      "notes", "projectIds", "teamNotes",
    ]);
    const filtered: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (allowedForManager.has(k)) filtered[k] = v;
    }
    if (Object.keys(filtered).length === 0) {
      return forbidden("Managers can only update project/team notes for direct reports");
    }
    const employee = await updateEmployee(id, filtered as any);
    if (!employee) return notFound("Employee not found");
    return NextResponse.json({ data: employee });
  }

  // HR callers update a fixed allowlist of profile/employment fields.
  // Credential fields (password, passwordHash, loginStatus) are never
  // writable here, so a compromised HR account cannot overwrite credentials.
  // Role is writable only downward: HR may move employees among
  // employee/manager/hr_admin (matching the edit UI) but super_admin is
  // CEO-assignable only. Status is writable with the standard value check.
  const HR_SAFE_FIELDS = [
    "displayName", "firstName", "lastName", "phone", "image", "address",
    "emergencyContact", "emergencyPhone", "department", "departmentName",
    "departmentId", "designation", "designationName", "designationId",
    "joiningDate", "employmentType", "employeeCode",
  ];
  const updateBody: Record<string, unknown> = {};
  for (const field of HR_SAFE_FIELDS) {
    if (body[field] !== undefined) updateBody[field] = body[field];
  }
  if (body.role !== undefined) {
    const normalizedRole = normalizeRole(body.role);
    if (normalizedRole === "super_admin" && auth.role !== "super_admin") {
      return forbidden("Only Super Admin can assign the super_admin role");
    }
    updateBody.role = normalizedRole;
  }
  if (body.status !== undefined) {
    if (!["active", "inactive", "disabled", "pending_verification"].includes(body.status)) {
      return badRequest("Invalid status value");
    }
    updateBody.status = body.status;
  }
  // Reporting structure is CEO-controlled: reportingManager moves only
  // through the super_admin users route, never this one.
  if (auth.role !== "super_admin") {
    delete (body as any).reportingManager;
    delete (body as any).managerEmail;
  } else if (body.reportingManager !== undefined) {
    updateBody.reportingManager = body.reportingManager;
  }
  if (Object.keys(updateBody).length === 0) {
    return badRequest("No valid fields to update");
  }

  const employee = await updateEmployee(id, updateBody as any);
  if (!employee) {
    return notFound("Employee not found");
  }

  return NextResponse.json({ data: employee });
}, { label: "HRM Employees" });

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  if (!HR_LEVEL_ROLES.has(auth.role)) {
    return forbidden("Only HR admins can delete employees");
  }

  const { searchParams } = new URL(request.url);
  let id = searchParams.get("id");
  if (!id) {
    try {
      const body = await request.json();
      id = body?.id || body?.userId || body?._id;
    } catch {}
  }

  if (!id) {
    return badRequest("id parameter required");
  }

  if (id === auth.userId) {
    return badRequest("You cannot delete your own account");
  }

  // Destructive HR action — managers must never delete employees.
  if (!HR_LEVEL_ROLES.has(auth.role)) {
    return forbidden("Only HR admins can delete employees");
  }

  const deleted = await deleteEmployee(id);
  if (!deleted) {
    return notFound("Employee not found");
  }

  // Revoke the deleted employee's sessions so their cookie stops working.
  try {
    const db = await getDb();
    if (db) await db.collection("sessions").deleteMany({ userId: id });
  } catch {
    // Best-effort.
  }

  return NextResponse.json({ success: true });
}, { label: "HRM Employees" });
