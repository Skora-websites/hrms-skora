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
  if (auth.role === "employee" && id !== auth.userId) {
    return forbidden("You can only view your own profile");
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

  const tenantId = "default";
  const body = await request.json();

  if (!body.email) {
    return badRequest("Missing required field: email");
  }

  const rawName = body.displayName || body.name || `${body.firstName || ""} ${body.lastName || ""}`.trim() || body.email;
  const nameParts = rawName.trim().split(" ");
  const firstName = body.firstName || nameParts[0] || "";
  const lastName = body.lastName || nameParts.slice(1).join(" ") || "";
  const displayName = rawName;
  const password = body.password || "Employee@123";

  const employee = await createEmployee(tenantId, {
    email: body.email,
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
  });

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

  const employee = await updateEmployee(id, body);
  if (!employee) {
    return notFound("Employee not found");
  }

  return NextResponse.json({ data: employee });
}, { label: "HRM Employees" });

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

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

  const deleted = await deleteEmployee(id);
  if (!deleted) {
    return notFound("Employee not found");
  }

  return NextResponse.json({ success: true });
}, { label: "HRM Employees" });
