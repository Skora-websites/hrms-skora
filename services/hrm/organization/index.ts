import "server-only";
import {
  organizationsService,
  departmentsService,
  designationsService,
  businessUnitsService,
  locationsService,
} from "@/lib/hrm/firestore";
import type { Organization, Department, Designation, BusinessUnit, Location } from "@/types";

// ══════════════════════════════════════════════════════════════════
// Organization Service
// ══════════════════════════════════════════════════════════════════

// ── Organization ───────────────────────────────────────

export async function getOrganizations(tenantId: string): Promise<Organization[]> {
  return organizationsService.findManyInTenant(tenantId, {
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  return organizationsService.findById(id);
}

export async function createOrganization(
  tenantId: string,
  data: Partial<Organization>
): Promise<Organization> {
  return organizationsService.create({ ...data, tenantId } as any);
}

export async function updateOrganization(
  id: string,
  data: Partial<Organization>
): Promise<Organization | null> {
  return organizationsService.update(id, data as any);
}

export async function deleteOrganization(id: string): Promise<boolean> {
  return organizationsService.delete(id);
}

// ── Department ─────────────────────────────────────────

export async function getDepartments(tenantId: string, organizationId?: string): Promise<Department[]> {
  const where = organizationId
    ? [{ field: "organizationId", op: "==" as const, value: organizationId }]
    : [];
  return departmentsService.findManyInTenant(tenantId, {
    where,
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function getDepartmentById(id: string): Promise<Department | null> {
  return departmentsService.findById(id);
}

export async function createDepartment(
  tenantId: string,
  data: Partial<Department>
): Promise<Department> {
  return departmentsService.create({ ...data, tenantId } as any);
}

export async function updateDepartment(
  id: string,
  data: Partial<Department>
): Promise<Department | null> {
  return departmentsService.update(id, data as any);
}

export async function deleteDepartment(id: string): Promise<boolean> {
  return departmentsService.delete(id);
}

// ── Designation ────────────────────────────────────────

export async function getDesignations(tenantId: string, organizationId?: string, departmentId?: string): Promise<Designation[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [];
  if (organizationId) where.push({ field: "organizationId", op: "==", value: organizationId });
  if (departmentId) where.push({ field: "departmentId", op: "==", value: departmentId });
  return designationsService.findManyInTenant(tenantId, {
    where,
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function getDesignationById(id: string): Promise<Designation | null> {
  return designationsService.findById(id);
}

export async function createDesignation(
  tenantId: string,
  data: Partial<Designation>
): Promise<Designation> {
  return designationsService.create({ ...data, tenantId } as any);
}

export async function updateDesignation(
  id: string,
  data: Partial<Designation>
): Promise<Designation | null> {
  return designationsService.update(id, data as any);
}

export async function deleteDesignation(id: string): Promise<boolean> {
  return designationsService.delete(id);
}

// ── Business Unit ──────────────────────────────────────

export async function getBusinessUnits(tenantId: string): Promise<BusinessUnit[]> {
  return businessUnitsService.findManyInTenant(tenantId, {
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function getBusinessUnitById(id: string): Promise<BusinessUnit | null> {
  return businessUnitsService.findById(id);
}

export async function createBusinessUnit(
  tenantId: string,
  data: Partial<BusinessUnit>
): Promise<BusinessUnit> {
  return businessUnitsService.create({ ...data, tenantId } as any);
}

export async function updateBusinessUnit(
  id: string,
  data: Partial<BusinessUnit>
): Promise<BusinessUnit | null> {
  return businessUnitsService.update(id, data as any);
}

export async function deleteBusinessUnit(id: string): Promise<boolean> {
  return businessUnitsService.delete(id);
}

// ── Location ───────────────────────────────────────────

export async function getLocations(tenantId: string): Promise<Location[]> {
  return locationsService.findManyInTenant(tenantId, {
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function getLocationById(id: string): Promise<Location | null> {
  return locationsService.findById(id);
}

export async function createLocation(
  tenantId: string,
  data: Partial<Location>
): Promise<Location> {
  return locationsService.create({ ...data, tenantId } as any);
}

export async function updateLocation(
  id: string,
  data: Partial<Location>
): Promise<Location | null> {
  return locationsService.update(id, data as any);
}

export async function deleteLocation(id: string): Promise<boolean> {
  return locationsService.delete(id);
}

// ── Organization Tree (composite) ──────────────────────

export interface OrganizationNode extends Organization {
  departments: (Department & {
    designations: Designation[];
  })[];
}

export async function getOrganizationTree(tenantId: string): Promise<OrganizationNode[]> {
  const [orgs, depts, desigs] = await Promise.all([
    getOrganizations(tenantId),
    getDepartments(tenantId),
    getDesignations(tenantId),
  ]);

  return orgs.map((org) => ({
    ...org,
    departments: depts
      .filter((d) => d.organizationId === org.id)
      .map((dept) => ({
        ...dept,
        designations: desigs.filter((ds) => ds.departmentId === dept.id),
      })),
  }));
}
