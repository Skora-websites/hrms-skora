import "server-only";
import {
  settingsService,
  languagesService,
  translationsService,
  contactSupportService,
  idCardTemplatesService,
} from "@/lib/hrm/firestore";
import type {
  Setting,
  Language,
  Translation,
  ContactSupport,
  IDCardTemplate,
} from "@/types";

// ══════════════════════════════════════════════════════════════════
// Settings & Configuration Service
// ══════════════════════════════════════════════════════════════════

// ── Settings ───────────────────────────────────────────

export async function getSettings(
  tenantId: string,
  category?: Setting["category"]
): Promise<Setting[]> {
  const where = category
    ? [{ field: "category", op: "==" as const, value: category }]
    : [];
  return settingsService.findManyInTenant(tenantId, { where });
}

export async function getSetting(tenantId: string, key: string): Promise<Setting | null> {
  return settingsService.findOneInTenant(tenantId, "key", key);
}

export async function setSetting(
  tenantId: string,
  key: string,
  value: string,
  type: Setting["type"] = "string",
  category: Setting["category"] = "general"
): Promise<Setting> {
  const existing = await getSetting(tenantId, key);
  if (existing) {
    return (await settingsService.update(existing.id, { value } as any))!;
  }
  return settingsService.create({ key, value, type, category, tenantId } as any);
}

export async function deleteSetting(id: string): Promise<boolean> {
  return settingsService.delete(id);
}

export async function getBulkSettings(tenantId: string, keys: string[]): Promise<Record<string, string>> {
  const settings = await getSettings(tenantId);
  const result: Record<string, string> = {};
  for (const s of settings) {
    if (keys.includes(s.key)) {
      result[s.key] = s.value;
    }
  }
  return result;
}

// ── Languages ──────────────────────────────────────────

export async function getLanguages(): Promise<Language[]> {
  return languagesService.findMany({
    where: [{ field: "status", op: "==", value: "active" }],
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function createLanguage(data: Partial<Language>): Promise<Language> {
  return languagesService.create(data as any);
}

export async function updateLanguage(id: string, data: Partial<Language>): Promise<Language | null> {
  return languagesService.update(id, data as any);
}

// ── Translations ───────────────────────────────────────

export async function getTranslations(
  tenantId: string,
  languageId?: string
): Promise<Translation[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [
    { field: "tenantId", op: "==", value: tenantId },
  ];
  if (languageId) where.push({ field: "languageId", op: "==", value: languageId });

  return translationsService.findMany({ where });
}

export async function setTranslation(
  data: {
    tenantId: string;
    languageId: string;
    key: string;
    value: string;
    type: Translation["type"];
  }
): Promise<Translation> {
  const existing = await translationsService.findMany({
    where: [
      { field: "tenantId", op: "==", value: data.tenantId },
      { field: "languageId", op: "==", value: data.languageId },
      { field: "key", op: "==", value: data.key },
    ],
    limitCount: 1,
  });

  if (existing[0]) {
    return (await translationsService.update(existing[0].id, { value: data.value } as any))!;
  }

  return translationsService.create(data as any);
}

// ── Contact Support ────────────────────────────────────

export async function getSupportTickets(
  tenantId: string,
  status?: ContactSupport["status"]
): Promise<ContactSupport[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [];
  if (status) where.push({ field: "status", op: "==", value: status });

  return contactSupportService.findManyInTenant(tenantId, {
    where,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function createSupportTicket(
  tenantId: string,
  data: {
    userId: string;
    subject: string;
    message: string;
    priority?: ContactSupport["priority"];
  }
): Promise<ContactSupport> {
  return contactSupportService.create({
    ...data,
    priority: data.priority || "medium",
    status: "open",
    tenantId,
  } as any);
}

export async function updateSupportTicket(
  id: string,
  data: Partial<ContactSupport>
): Promise<ContactSupport | null> {
  return contactSupportService.update(id, data as any);
}

// ── ID Card Templates ──────────────────────────────────

export async function getIdCardTemplates(tenantId: string): Promise<IDCardTemplate[]> {
  return idCardTemplatesService.findManyInTenant(tenantId, {
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function createIdCardTemplate(tenantId: string, data: Partial<IDCardTemplate>): Promise<IDCardTemplate> {
  return idCardTemplatesService.create({ ...data, tenantId } as any);
}

export async function updateIdCardTemplate(id: string, data: Partial<IDCardTemplate>): Promise<IDCardTemplate | null> {
  return idCardTemplatesService.update(id, data as any);
}

export async function deleteIdCardTemplate(id: string): Promise<boolean> {
  return idCardTemplatesService.delete(id);
}
