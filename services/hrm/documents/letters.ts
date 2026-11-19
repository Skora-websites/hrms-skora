import "server-only";
import { createHash } from "crypto";
import {
  documentLetterTemplatesService,
  generatedEmployeeLettersService,
  hrmUsersService,
  employeeSalariesService,
  notificationsService,
} from "@/lib/hrm/firestore";
import type {
  DocumentLetterTemplate,
  GeneratedEmployeeLetter,
} from "@/types";

// ══════════════════════════════════════════════════════════════════
// Dynamic Document & Letter Generation Engine
// ══════════════════════════════════════════════════════════════════

export const DEFAULT_LETTER_TEMPLATES: Array<Omit<DocumentLetterTemplate, "id" | "createdAt" | "updatedAt">> = [
  {
    templateCode: "offer_letter",
    title: "Job Offer Letter",
    subject: "Offer of Employment at {{company_name}}",
    tokenVariables: ["employee_name", "designation", "department", "ctc", "joining_date", "company_name", "date"],
    contentHtml: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="margin: 0; color: #1e3a8a;">{{company_name}}</h2>
    <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">Human Resources Department</p>
  </div>
  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin-bottom: 20px;" />
  <p><strong>Date:</strong> {{date}}</p>
  <p>To,<br /><strong>{{employee_name}}</strong></p>
  <p>Dear <strong>{{employee_name}}</strong>,</p>
  <p>We are delighted to extend an offer of employment with <strong>{{company_name}}</strong> for the position of <strong>{{designation}}</strong> in the <strong>{{department}}</strong> team.</p>
  <p>Your annual Cost to Company (CTC) will be <strong>{{ctc}}</strong> per annum. Your expected date of joining will be <strong>{{joining_date}}</strong>.</p>
  <p>We are confident that your expertise and experience will make a significant contribution to the success of our organization.</p>
  <p>Please review and sign this offer letter within 5 working days as an acceptance of this offer.</p>
  <br />
  <p>Warm regards,</p>
  <p><strong>Head of People & Culture</strong><br />{{company_name}}</p>
</div>`,
    isActive: true,
    tenantId: "default",
  },
  {
    templateCode: "appointment_letter",
    title: "Official Appointment Letter",
    subject: "Appointment Letter - {{designation}}",
    tokenVariables: ["employee_name", "employee_code", "designation", "department", "joining_date", "company_name", "date"],
    contentHtml: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb;">
  <h2 style="color: #1e3a8a; text-align: center;">{{company_name}}</h2>
  <h3 style="text-align: center; color: #374151;">LETTER OF APPOINTMENT</h3>
  <hr style="border-top: 1px solid #e5e7eb;" />
  <p><strong>Date:</strong> {{date}}</p>
  <p><strong>Employee Code:</strong> {{employee_code}}</p>
  <p>Dear {{employee_name}},</p>
  <p>With reference to your acceptance of our offer, we are pleased to appoint you as <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department effective from <strong>{{joining_date}}</strong>.</p>
  <p>You will be on probation for a period of six months from your date of joining. Upon successful completion, your employment will be confirmed in writing.</p>
  <p>Sincerely,</p>
  <p><strong>Human Resources</strong><br />{{company_name}}</p>
</div>`,
    isActive: true,
    tenantId: "default",
  },
  {
    templateCode: "increment_letter",
    title: "Annual Compensation Revision / Increment Letter",
    subject: "Compensation Revision for FY 2026-27",
    tokenVariables: ["employee_name", "designation", "effective_date", "previous_ctc", "revised_ctc", "percentage_hike", "company_name", "date"],
    contentHtml: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb;">
  <h2 style="color: #1e3a8a; text-align: center;">{{company_name}}</h2>
  <h3 style="text-align: center; color: #10b981;">SALARY REVISION LETTER</h3>
  <p>Date: {{date}}</p>
  <p>Dear {{employee_name}},</p>
  <p>In recognition of your performance and dedication to {{company_name}}, we take great pleasure in revising your compensation structure effective <strong>{{effective_date}}</strong>.</p>
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr style="background-color: #f3f4f6;"><th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Particulars</th><th style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">Amount</th></tr>
    <tr><td style="padding: 8px; border: 1px solid #d1d5db;">Previous CTC</td><td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">{{previous_ctc}}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #d1d5db;">Revised CTC</td><td style="padding: 8px; border: 1px solid #d1d5db; text-align: right; font-weight: bold; color: #047857;">{{revised_ctc}}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #d1d5db;">Revision Percentage</td><td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">{{percentage_hike}}%</td></tr>
  </table>
  <p>All other terms and conditions of your employment contract remain unchanged.</p>
  <p>Congratulations and keep up the commendable work!</p>
  <p>Best Regards,<br /><strong>Management Team</strong><br />{{company_name}}</p>
</div>`,
    isActive: true,
    tenantId: "default",
  },
  {
    templateCode: "relieving_letter",
    title: "Relieving & Experience Certificate",
    subject: "Relieving Letter - {{employee_name}}",
    tokenVariables: ["employee_name", "employee_code", "designation", "joining_date", "last_working_date", "company_name", "date"],
    contentHtml: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb;">
  <h2 style="color: #1e3a8a; text-align: center;">{{company_name}}</h2>
  <h3 style="text-align: center; color: #374151;">RELIEVING & SERVICE CERTIFICATE</h3>
  <hr style="border-top: 1px solid #e5e7eb;" />
  <p>Date: {{date}}</p>
  <p>To Whom It May Concern,</p>
  <p>This is to certify that <strong>{{employee_name}}</strong> (Employee Code: {{employee_code}}) was employed with <strong>{{company_name}}</strong> from <strong>{{joining_date}}</strong> to <strong>{{last_working_date}}</strong>.</p>
  <p>At the time of leaving, they held the designation of <strong>{{designation}}</strong>.</p>
  <p>They have completed all exit formalities, asset returns, and Full & Final settlement clearances satisfactorily, and is hereby officially relieved from all organizational duties effective the close of business hours on <strong>{{last_working_date}}</strong>.</p>
  <p>We wish them the very best in all future endeavors.</p>
  <br />
  <p>For <strong>{{company_name}}</strong>,</p>
  <p><strong>Authorized Signatory</strong><br />Human Resources</p>
</div>`,
    isActive: true,
    tenantId: "default",
  },
];

export async function getLetterTemplates(tenantId: string = "default"): Promise<DocumentLetterTemplate[]> {
  let list = await documentLetterTemplatesService.findManyInTenant(tenantId, {
    orderByField: "title",
    orderByDirection: "asc",
  });

  if (!list || list.length === 0) {
    for (const t of DEFAULT_LETTER_TEMPLATES) {
      await documentLetterTemplatesService.createInTenant(tenantId, t as any);
    }
    list = await documentLetterTemplatesService.findManyInTenant(tenantId);
  }

  return list;
}

export async function getLetterTemplateById(id: string): Promise<DocumentLetterTemplate | null> {
  return documentLetterTemplatesService.findById(id);
}

export async function createLetterTemplate(
  tenantId: string = "default",
  data: Partial<DocumentLetterTemplate>
): Promise<DocumentLetterTemplate> {
  return documentLetterTemplatesService.createInTenant(tenantId, {
    ...data,
    isActive: data.isActive ?? true,
  } as any);
}

export async function updateLetterTemplate(
  id: string,
  data: Partial<DocumentLetterTemplate>
): Promise<DocumentLetterTemplate | null> {
  return documentLetterTemplatesService.update(id, data);
}

export async function deleteLetterTemplate(id: string): Promise<boolean> {
  return documentLetterTemplatesService.delete(id);
}

// ── Token Interpolation ───────────────────────────────────────────

export function interpolateLetterTokens(template: string, tokens: Record<string, any>): string {
  let rendered = template;
  for (const [key, val] of Object.entries(tokens)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    rendered = rendered.replace(regex, val !== undefined && val !== null ? String(val) : "");
  }
  return rendered;
}

export function generateDocumentVerificationHash(params: {
  tenantId: string;
  userId: string;
  templateCode: string;
  issueDateStr: string;
}): { verificationHash: string; verificationUrl: string } {
  const verificationHash = createHash("sha256")
    .update(`${params.tenantId}:${params.userId}:${params.templateCode}:${params.issueDateStr}:skora_hr_secure_seal`)
    .digest("hex")
    .slice(0, 24);
  return {
    verificationHash,
    verificationUrl: `/verify-document?doc=${params.templateCode}&token=${verificationHash}`,
  };
}

export function verifyDocumentAuthenticity(params: {
  tenantId: string;
  userId: string;
  templateCode: string;
  issueDateStr: string;
  tokenToVerify: string;
}): boolean {
  const expected = generateDocumentVerificationHash(params).verificationHash;
  return expected.toLowerCase() === params.tokenToVerify.trim().toLowerCase();
}

// ── Generation & Issuance ─────────────────────────────────────────

export async function generateEmployeeLetter(
  tenantId: string = "default",
  input: {
    templateCode: string;
    userId: string;
    issuedBy: string;
    customTokens?: Record<string, any>;
  }
): Promise<GeneratedEmployeeLetter> {
  const [templates, user, salaries] = await Promise.all([
    getLetterTemplates(tenantId),
    hrmUsersService.findById(input.userId),
    employeeSalariesService.findManyInTenant(tenantId, {
      where: [{ field: "userId", op: "==", value: input.userId }],
    }),
  ]);

  const template = templates.find((t) => t.templateCode === input.templateCode) || templates[0];
  if (!template) {
    throw new Error(`Letter template with code '${input.templateCode}' not found`);
  }

  const employeeName = user?.displayName || (user as any)?.name || user?.email || "Employee";
  const employeeEmail = user?.email || "";
  const designation = (user as any)?.designation || (user as any)?.designationName || user?.designationId || "Associate";
  const department = (user as any)?.department || (user as any)?.departmentName || user?.departmentId || "General";
  const employeeCode = user?.employeeCode || (user as any)?.empId || "EMP-" + (user?.id ? user.id.slice(-4).toUpperCase() : "001");
  const salary = salaries[0];
  const ctc = (salary as any)?.ctc ? `INR ${(salary as any).ctc.toLocaleString("en-IN")}` : "INR 6,00,000";

  const todayIso = new Date().toISOString().slice(0, 10);
  const { verificationHash, verificationUrl } = generateDocumentVerificationHash({
    tenantId,
    userId: input.userId,
    templateCode: template.templateCode,
    issueDateStr: todayIso,
  });

  const defaultTokens: Record<string, any> = {
    employee_name: employeeName,
    employee_code: employeeCode,
    employee_email: employeeEmail,
    designation,
    department,
    ctc,
    joining_date: (user as any)?.dateOfJoining ? new Date((user as any).dateOfJoining).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN"),
    last_working_date: new Date().toLocaleDateString("en-IN"),
    effective_date: new Date().toLocaleDateString("en-IN"),
    previous_ctc: "INR 5,00,000",
    revised_ctc: "INR 6,00,000",
    percentage_hike: "20",
    company_name: "Skora HR Solutions Pvt. Ltd.",
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    verification_hash: verificationHash,
    verification_url: verificationUrl,
    ...input.customTokens,
  };

  const baseHtml = interpolateLetterTokens(template.contentHtml, defaultTokens);
  const verificationFooter = `
<div style="margin-top: 32px; padding-top: 12px; border-top: 1px dashed #d1d5db; font-size: 11px; color: #6b7280; font-family: monospace;">
  <strong>Document Verification ID:</strong> ${verificationHash}<br />
  <em>This is a system-generated document issued by Skora HRMS. Authenticity can be verified at: ${verificationUrl}</em>
</div>`;
  const renderedHtml = `${baseHtml}${verificationFooter}`;

  const generated = await generatedEmployeeLettersService.createInTenant(tenantId, {
    userId: input.userId,
    employeeName,
    employeeEmail,
    templateCode: template.templateCode,
    templateTitle: interpolateLetterTokens(template.title, defaultTokens),
    renderedHtml,
    tokensData: defaultTokens,
    isAcknowledged: false,
  });

  // Notify employee
  await notificationsService.createInTenant(tenantId, {
    userId: input.userId,
    title: `Official Document Issued: ${template.title}`,
    body: `A new document (${template.title}) has been generated and issued to your employee self-service records.`,
    type: "general",
    isRead: false,
  }).catch(() => {});

  return generated;
}

export async function getGeneratedLetters(
  tenantId: string = "default",
  userId?: string
): Promise<GeneratedEmployeeLetter[]> {
  const where: any[] = [];
  if (userId) {
    where.push({ field: "userId", op: "==", value: userId });
  }

  return generatedEmployeeLettersService.findManyInTenant(tenantId, {
    where,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function getGeneratedLetterById(id: string): Promise<GeneratedEmployeeLetter | null> {
  return generatedEmployeeLettersService.findById(id);
}
