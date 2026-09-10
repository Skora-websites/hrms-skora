import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { tenantsService, hrmUsersService } from "@/lib/hrm/firestore";
import { requireSuperAdmin, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest, created, ok, noContent } from "@/lib/api-handler";
import { normalizeRole } from "@/lib/rbac";

export const GET = withErrorHandler(async () => {
  const auth = await requireSuperAdmin();
  if (isErrorResponse(auth)) return auth;

  const tenants = await tenantsService.findMany({
    orderByField: "createdAt",
    orderByDirection: "desc",
  });

  return ok(tenants);
}, { label: "Tenants GET" });

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireSuperAdmin();
  if (isErrorResponse(auth)) return auth;

  const body = await request.json();
  const { name, domain, subscriptionTier, modulesEnabled, officeLatitude, officeLongitude, assignedHrAdmin } = body;

  if (!name || typeof name !== "string") {
    return badRequest("Company name is required");
  }

  // 1. Create the tenant in MongoDB
  const tenant = await tenantsService.create({
    name: name.trim(),
    domain: domain || "",
    email: assignedHrAdmin || "",
    status: "active" as const,
    plan: subscriptionTier || "basic",
    subscriptionTier: subscriptionTier || "basic",
    isActive: true,
    modulesEnabled: modulesEnabled || { pms: true, ats: false, payroll: true },
    officeLatitude: officeLatitude != null ? Number(officeLatitude) : undefined,
    officeLongitude: officeLongitude != null ? Number(officeLongitude) : undefined,
    assignedHrAdmin: assignedHrAdmin || "",
  } as any);

  // 2. If an HR Admin email was provided, create their account in MongoDB
  let hrAdminInvite: { email: string; tempPassword?: string } | null = null;

  if (assignedHrAdmin && typeof assignedHrAdmin === "string" && assignedHrAdmin.includes("@")) {
    const hrEmail = assignedHrAdmin.trim().toLowerCase();
    try {
      const existingUser = await hrmUsersService.findOne("email", hrEmail);
      if (!existingUser) {
        const tempPassword = generateTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        await hrmUsersService.create({
          email: hrEmail,
          displayName: hrEmail.split("@")[0],
          firstName: hrEmail.split("@")[0],
          lastName: "",
          role: "hr_admin",
          status: "active",
          loginStatus: "enabled",
          tenantId: tenant.id,
          passwordHash,
        } as any);
        hrAdminInvite = { email: hrEmail, tempPassword };
      } else {
        await hrmUsersService.update(existingUser.id, {
          role: "hr_admin",
          tenantId: tenant.id,
        } as any);
        hrAdminInvite = { email: hrEmail };
      }
    } catch (err) {
      console.error("Failed to create HR Admin account in MongoDB:", err);
    }
  }

  return created({ ...tenant, hrAdminInvite });
}, { label: "Tenants POST" });

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireSuperAdmin();
  if (isErrorResponse(auth)) return auth;

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return badRequest("Tenant ID is required");
  }

  const updated = await tenantsService.update(id, updates as any);
  if (!updated) {
    return badRequest("Tenant not found");
  }

  return ok(updated);
}, { label: "Tenants PATCH" });

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireSuperAdmin();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return badRequest("Tenant ID is required");
  }

  await tenantsService.delete(id);
  return noContent();
}, { label: "Tenants DELETE" });

/** Generate a random temporary password (12 chars, mixed) */
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const special = "!@#$%&*";
  let password = "";
  password += "A";
  password += "a";
  password += "3";
  password += "!";
  for (let i = 4; i < 12; i++) {
    const allChars = chars + special;
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  return password.split("").sort(() => Math.random() - 0.5).join("");
}
