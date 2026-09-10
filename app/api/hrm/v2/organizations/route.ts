import { NextRequest, NextResponse } from "next/server";
import {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation,
  getOrganizationTree,
} from "@/services/hrm/organization";
import { requireAdmin, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest, notFound } from "@/lib/api-handler";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");
  const orgId = searchParams.get("organizationId");
  const tree = searchParams.get("tree");

  if (tree === "true") {
    const orgTree = await getOrganizationTree(tenantId);
    return NextResponse.json({ data: orgTree });
  }

  if (type === "departments") {
    const departments = await getDepartments(tenantId, orgId || undefined);
    return NextResponse.json({ data: departments });
  }

  if (type === "designations") {
    const designations = await getDesignations(tenantId, orgId || undefined);
    return NextResponse.json({ data: designations });
  }

  if (id) {
    const org = await getOrganizationById(id);
    if (!org) {
      return notFound("Organization not found");
    }
    return NextResponse.json({ data: org });
  }

  const organizations = await getOrganizations(tenantId);
  return NextResponse.json({ data: organizations });
}, { label: "HRM Organizations" });

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";

  const body = await request.json();
  const type = body.type;

  let result;
  if (type === "department") {
    result = await createDepartment(tenantId, body);
  } else if (type === "designation") {
    result = await createDesignation(tenantId, body);
  } else {
    result = await createOrganization(tenantId, body);
  }

  return NextResponse.json({ data: result }, { status: 201 });
}, { label: "HRM Organizations" });

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return badRequest("id parameter required");
  }

  const body = await request.json();
  const type = body.type;

  let result;
  if (type === "department") {
    result = await updateDepartment(id, body);
  } else if (type === "designation") {
    result = await updateDesignation(id, body);
  } else {
    result = await updateOrganization(id, body);
  }

  if (!result) {
    return notFound("Record not found");
  }

  return NextResponse.json({ data: result });
}, { label: "HRM Organizations" });

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");

  if (!id) {
    return badRequest("id parameter required");
  }

  let deleted;
  if (type === "department") {
    deleted = await deleteDepartment(id);
  } else if (type === "designation") {
    deleted = await deleteDesignation(id);
  } else {
    deleted = await deleteOrganization(id);
  }

  if (!deleted) {
    return notFound("Record not found");
  }

  return NextResponse.json({ success: true });
}, { label: "HRM Organizations" });
