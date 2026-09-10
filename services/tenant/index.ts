import "server-only";
import { tenantsService, settingsService, languagesService, tenantLanguagesService } from "@/lib/hrm/firestore";
import type { Tenant } from "@/types";

// ══════════════════════════════════════════════════════════════════
// Multi-Tenancy Service
// ══════════════════════════════════════════════════════════════════

export interface TenantContext {
  tenant: Tenant;
  tenantId: string;
  domain: string;
}

/**
 * Resolve tenant from a domain string (extracted from Origin header).
 */
export async function resolveTenant(domain: string): Promise<TenantContext | null> {
  try {
    const tenant = await tenantsService.findOne("domain", domain);
    if (!tenant) return null;
    return {
      tenant,
      tenantId: tenant.id,
      domain,
    };
  } catch (error) {
    console.error("Tenant resolution error:", error);
    return null;
  }
}

/**
 * Resolve tenant from a request's Origin header.
 */
export async function resolveTenantFromOrigin(origin: string | null): Promise<TenantContext | null> {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    const domain = url.hostname;
    return resolveTenant(domain);
  } catch {
    return null;
  }
}

/**
 * Get tenant by ID (for direct lookups).
 */
export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  return tenantsService.findById(tenantId);
}

/**
 * Check if a user belongs to a tenant.
 */
export async function userBelongsToTenant(tenantId: string, userId: string): Promise<boolean> {
  try {
    const user = await tenantsService.findOneInTenant(tenantId, "id", userId);
    return !!user;
  } catch {
    // Fall back to checking the users collection
    const { hrmUsersService } = await import("@/lib/hrm/firestore");
    const found = await hrmUsersService.findById(userId);
    return found?.tenantId === tenantId;
  }
}

/**
 * Get all active tenants (for super admin).
 */
export async function getAllActiveTenants(): Promise<Tenant[]> {
  return tenantsService.findMany({
    where: [{ field: "status", op: "==", value: "active" }],
    orderByField: "name",
    orderByDirection: "asc",
  });
}

/**
 * Create a new tenant with default settings.
 */
export async function createTenant(data: {
  name: string;
  domain: string;
  email: string;
  plan?: "basic" | "standard" | "enterprise";
}): Promise<Tenant> {
  const tenant = await tenantsService.create({
    ...data,
    plan: data.plan || "basic",
    status: "active",
  });

  // Create default settings for the new tenant
  const defaultSettings = [
    { key: "language", value: "en", category: "general", type: "string" },
    { key: "timezone", value: "UTC", category: "general", type: "string" },
    { key: "date_format", value: "YYYY-MM-DD", category: "general", type: "string" },
    { key: "time_format", value: "24h", category: "general", type: "string" },
    { key: "currency", value: "USD", category: "general", type: "string" },
    { key: "attendance_type", value: "manual", category: "attendance", type: "string" },
    { key: "ai_enabled", value: "false", category: "modules", type: "boolean" },
    { key: "payroll_enabled", value: "false", category: "modules", type: "boolean" },
    { key: "project_tracking_enabled", value: "false", category: "modules", type: "boolean" },
  ];

  for (const setting of defaultSettings) {
    await settingsService.create({
      ...setting,
      tenantId: tenant.id,
    } as any);
  }

  return tenant;
}

/**
 * Update tenant plan.
 */
export async function updateTenantPlan(
  tenantId: string,
  plan: "basic" | "standard" | "enterprise"
): Promise<Tenant | null> {
  return tenantsService.update(tenantId, { plan } as any);
}

/**
 * Update tenant status.
 */
export async function updateTenantStatus(
  tenantId: string,
  status: "active" | "inactive" | "suspended"
): Promise<Tenant | null> {
  return tenantsService.update(tenantId, { status } as any);
}

/**
 * Check if a feature is enabled for a tenant based on plan and settings.
 */
export async function isFeatureEnabled(
  tenantId: string,
  feature: "ai" | "payroll" | "project_tracking" | "geo_fencing"
): Promise<boolean> {
  const tenant = await tenantsService.findById(tenantId);
  if (!tenant) return false;

  // Check plan-based feature availability
  const planFeatureMap: Record<string, string[]> = {
    basic: [],
    standard: ["ai", "payroll", "project_tracking", "geo_fencing"],
    enterprise: ["ai", "payroll", "project_tracking", "geo_fencing"],
  };

  const planFeatures = planFeatureMap[tenant.plan] || [];
  if (!planFeatures.includes(feature)) return false;

  // Check per-tenant setting override
  const settingKey = `${feature}_enabled`;
  const setting = await settingsService.findOneInTenant(tenantId, "key", settingKey);
  if (setting && setting.value === "false") return false;

  return true;
}

/**
 * Get hierarchical setting (user preference → org setting → tenant setting → default).
 */
export async function getHierarchicalSetting(
  tenantId: string,
  key: string,
  defaults: Record<string, string> = {}
): Promise<string | null> {
  // 1. Check tenant-level setting
  const tenantSetting = await settingsService.findOneInTenant(tenantId, "key", key);
  if (tenantSetting) return tenantSetting.value;

  // 2. Check default
  return defaults[key] || null;
}
