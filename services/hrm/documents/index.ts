import "server-only";
import {
  documentsService,
  documentCategoriesService,
  documentTemplatesService,
} from "@/lib/hrm/firestore";
import type {
  Document,
  DocumentCategory,
  DocumentTemplate,
} from "@/types";

// ══════════════════════════════════════════════════════════════════
// Documents Service (MongoDB backed)
// ══════════════════════════════════════════════════════════════════

// ── Categories ─────────────────────────────────────────

export async function getDocumentCategories(tenantId: string): Promise<DocumentCategory[]> {
  return documentCategoriesService.findManyInTenant(tenantId, {
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function createDocumentCategory(tenantId: string, data: Partial<DocumentCategory>): Promise<DocumentCategory> {
  return documentCategoriesService.create({ ...data, tenantId } as any);
}

export async function updateDocumentCategory(id: string, data: Partial<DocumentCategory>): Promise<DocumentCategory | null> {
  return documentCategoriesService.update(id, data as any);
}

export async function deleteDocumentCategory(id: string): Promise<boolean> {
  return documentCategoriesService.delete(id);
}

// ── Documents ──────────────────────────────────────────

export async function getDocuments(
  tenantId: string,
  options: {
    userId?: string;
    categoryId?: string;
    status?: Document["status"];
    isVerified?: boolean;
  } = {}
): Promise<Document[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [];
  if (options.userId) where.push({ field: "userId", op: "==", value: options.userId });
  if (options.categoryId) where.push({ field: "categoryId", op: "==", value: options.categoryId });
  if (options.status) where.push({ field: "status", op: "==", value: options.status });
  if (options.isVerified !== undefined) where.push({ field: "isVerified", op: "==", value: options.isVerified });

  return documentsService.findManyInTenant(tenantId, {
    where,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function getDocumentById(id: string): Promise<Document | null> {
  return documentsService.findById(id);
}

export async function uploadDocument(
  tenantId: string,
  data: {
    categoryId: string;
    userId: string;
    title: string;
    description?: string;
    file: Buffer;
    fileName: string;
    mimeType: string;
    expiryDate?: Date;
  }
): Promise<Document> {
  const base64 = data.file.toString("base64");
  const fileURL = `data:${data.mimeType};base64,${base64}`;

  return documentsService.create({
    categoryId: data.categoryId,
    userId: data.userId,
    title: data.title,
    description: data.description,
    fileURL,
    fileType: data.mimeType,
    fileSize: data.file.length,
    expiryDate: data.expiryDate,
    status: "active",
    isVerified: false,
    tenantId,
  } as any);
}

export async function updateDocument(id: string, data: Partial<Document>): Promise<Document | null> {
  return documentsService.update(id, data as any);
}

export async function deleteDocument(id: string): Promise<boolean> {
  return documentsService.delete(id);
}

export async function verifyDocument(
  id: string,
  verifiedById: string
): Promise<Document | null> {
  return documentsService.update(id, {
    isVerified: true,
    verifiedById,
    verifiedAt: new Date(),
  } as any);
}

// ── Document Templates ─────────────────────────────────

export async function getDocumentTemplates(
  tenantId: string,
  type?: DocumentTemplate["type"]
): Promise<DocumentTemplate[]> {
  const where = type ? [{ field: "type", op: "==" as const, value: type }] : [];
  return documentTemplatesService.findManyInTenant(tenantId, {
    where,
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function getDocumentTemplateById(id: string): Promise<DocumentTemplate | null> {
  return documentTemplatesService.findById(id);
}

export async function createDocumentTemplate(tenantId: string, data: Partial<DocumentTemplate>): Promise<DocumentTemplate> {
  return documentTemplatesService.create({ ...data, tenantId } as any);
}

export async function updateDocumentTemplate(id: string, data: Partial<DocumentTemplate>): Promise<DocumentTemplate | null> {
  return documentTemplatesService.update(id, data as any);
}

export async function deleteDocumentTemplate(id: string): Promise<boolean> {
  return documentTemplatesService.delete(id);
}

// ── Template Rendering ─────────────────────────────────

export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return rendered;
}
