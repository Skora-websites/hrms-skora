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

// Create/delete of employees is an HR function. requireAdmin alone would let
// any manager create or remove accounts, so these are gated explicitly.
const HR_LEVEL_ROLES = new Set(["super_admin", "hr_admin", "admin"]);

/** Resolve the manager-of relationship for direct-report scoping. */
async function isDirectReport(managerId: string, employeeId: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const employee = await db.collection("users").findOne({ _id: new ObjectId(employeeId) });
    return (employee as any)?.reportingManager === managerId;
  } catch {
    return false;
  }
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
    return NextResponse.json({ data: result });
  }

  if (id) {
    const employee = await getEmployeeById(id);
    if (!employee) {
      return notFound("Employee not found");
    }
    return NextResponse.json({ data: employee });
  }

  // Employees can only view their own data
  if (auth.role === "employee") {
    const employee = await getEmployeeById(auth.userId);
    if (!employee) {
      return notFound("Employee not found");
    }
    return NextResponse.json({ data: [employee] });
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
      data: result.data,
      totalItems: result.totalItems,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  }

  // Legacy full-list query
  const employees = await getEmployees(tenantId);
  return NextResponse.json({ data: employees });
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

  const rawName = body.displayName || body.name || `${body.firstName || ""} ${body.lastName || ""}`.trim() || body.email;
  const nameParts = rawName.trim().split(" ");
  const firstName = body.firstName || nameParts[0] || "";
  const lastName = body.lastName || nameParts.slice(1).join(" ") || "";
  const displayName = rawName;
  // Default credentials are intentionally weak — force a password change on
  // first login instead of leaving a permanent shared password in place.
  const password = body.password || "Employee@123";
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
    role: body.role || "employee",
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

  const employee = await updateEmployee(id, body);
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
