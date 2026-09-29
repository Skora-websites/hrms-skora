import "server-only";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { logEmailDelivery } from "@/lib/email-delivery-log";

interface ResetEmailInput {
  to: string;
  resetUrl: string;
}

// ── Transport resolution ──────────────────────────────────────────
// SMTP is primary (any provider: Gmail/Workspace, Outlook, Zoho, Hostinger,
// cPanel webmail). Resend HTTP API is the fallback if SMTP is not configured.

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || process.env.RESEND_FROM_EMAIL;
  if (!host || !user || !pass || !from) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  // Port 465 uses implicit TLS; everything else uses STARTTLS (or none for 25).
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  return { host, port, secure, user, pass, from };
}

let transporterCache: Transporter | null = null;

async function getTransporter(): Promise<Transporter | null> {
  const cfg = getSmtpConfig();
  if (!cfg) return null;
  if (transporterCache) return transporterCache;
  transporterCache = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    // Serverless-safe timeouts so a dead SMTP host can't hang a request.
    // Generous enough for cold-start + PDF attachments over STARTTLS.
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  return transporterCache;
}

export interface MailAttachment {
  /** File name shown to the recipient, e.g. "offer-letter-Priya.pdf" */
  filename: string;
  /** Raw file bytes */
  content: Buffer;
  /** MIME type, e.g. "application/pdf" */
  contentType: string;
}

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: MailAttachment[];
}

/**
 * Describe the currently configured mail transport for admin UI / diagnostics.
 * Returns null when neither SMTP nor Resend is configured.
 */
export function getMailTransportInfo(): { provider: "smtp" | "resend"; host: string | null; from: string } | null {
  const smtp = getSmtpConfig();
  if (smtp) {
    return { provider: "smtp", host: `${smtp.host}:${smtp.port}`, from: smtp.from };
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (apiKey && from) {
    return { provider: "resend", host: null, from };
  }
  return null;
}

/**
 * Send an email via SMTP if configured, otherwise via the Resend API.
 * Returns true only when a transport actually accepted the message.
 */
export async function sendMail({ to, subject, html, attachments }: MailOptions): Promise<boolean> {
  const hasAttachment = Boolean(attachments?.length);
  let lastError: unknown;

  // ── 1. SMTP (primary) — supports attachments natively ──
  const transporter = await getTransporter();
  if (transporter) {
    const cfg = getSmtpConfig()!;
    try {
      await transporter.sendMail({
        from: cfg.from,
        to,
        subject,
        html,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
      await logEmailDelivery({ to, subject, status: "sent", provider: "smtp", hasAttachment });
      return true;
    } catch (err) {
      console.error("SMTP send failed, falling back to Resend:", err);
      lastError = err;
      // fall through to Resend
    }
  }

  // ── 2. Resend HTTP API (fallback) — attachments are base64-encoded ──
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    await logEmailDelivery({
      to, subject, status: "failed", provider: "none", hasAttachment,
      error: lastError ?? new Error("No mail transport configured"),
    });
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: a.content.toString("base64"),
          content_type: a.contentType,
        })),
      }),
    });
    await logEmailDelivery({
      to, subject,
      status: response.ok ? "sent" : "failed",
      provider: "resend",
      hasAttachment,
      error: response.ok ? undefined : new Error(`Resend HTTP ${response.status}`),
    });
    return response.ok;
  } catch (err) {
    console.error("Resend send failed:", err);
    await logEmailDelivery({ to, subject, status: "failed", provider: "resend", hasAttachment, error: err });
    return false;
  }
}

export async function sendPasswordResetEmail({ to, resetUrl }: ResetEmailInput): Promise<boolean> {
  return sendMail({
    to,
    subject: "Reset your Skora HRMS password",
    html: `<p>We received a request to reset your Skora HRMS password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`,
  });
}

interface OfferLetterEmailInput {
  to: string;
  employeeName: string;
  salary?: number | null;
  joiningDate?: string | null;
  companyName: string;
  companyTagline?: string;
  signatoryName: string;
  signatoryTitle?: string;
  downloadUrl: string;
  /** Password-protected PDF generated by lib/offer-letter-pdf.ts — attached directly when provided */
  pdfAttachment?: { filename: string; content: Buffer; password: string };
  /** Custom subject template from settings; supports {{companyName}} and {{employeeName}} */
  subjectTemplate?: string;
  /** Custom body template from settings; supports {{employeeName}}, {{companyName}}, {{signatoryName}}, {{salary}}, {{joiningDate}} */
  bodyTemplate?: string;
}

/**
 * Send offer letter notification email to employee when CEO releases it.
 * Uses SMTP (any provider) with Resend API fallback.
 * Returns false if no transport is configured or sending failed.
 */
export async function sendOfferLetterEmail({
  to,
  employeeName,
  salary,
  joiningDate,
  companyName,
  companyTagline,
  signatoryName,
  signatoryTitle,
  downloadUrl,
  pdfAttachment,
  subjectTemplate,
  bodyTemplate,
}: OfferLetterEmailInput): Promise<boolean> {
  const salaryStr = salary
    ? `<p><strong>Annual Salary:</strong> Rs. ${salary.toLocaleString("en-IN")}</p>`
    : "";
  const joinStr = joiningDate
    ? `<p><strong>Joining Date:</strong> ${joiningDate}</p>`
    : "";

  const attachmentBlock = pdfAttachment
    ? `<p>📄 <strong>The signed offer letter is attached to this email</strong> as <em>${pdfAttachment.filename}</em>.<br/>
       <span style="color:#555;font-size:13px;">The PDF is password-protected for your security. Open it with this password: <strong style="font-family:monospace;background:#f1f5f9;padding:2px 6px;border-radius:4px;">${pdfAttachment.password}</strong></span></p>`
    : "";

  // Resolve custom templates with placeholders; fall back to the built-in layout.
  const fill = (tpl: string) =>
    tpl
      .replace(/{{employeeName}}/g, employeeName)
      .replace(/{{companyName}}/g, companyName)
      .replace(/{{signatoryName}}/g, signatoryName)
      .replace(/{{salary}}/g, salary ? `Rs. ${salary.toLocaleString("en-IN")}` : "")
      .replace(/{{joiningDate}}/g, joiningDate || "");

  const subject = subjectTemplate
    ? fill(subjectTemplate)
    : `Your Offer Letter from ${companyName}`;

  const customBody = bodyTemplate ? `<p>${fill(bodyTemplate).replace(/\n/g, "<br>")}</p>` : null;

  const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; border-bottom: 3px double #2563eb; padding-bottom: 20px; margin-bottom: 20px;">
            <h1 style="color: #2563eb; letter-spacing: 2px; margin: 0;">${companyName}</h1>
            <p style="color: #666; font-size: 12px; margin-top: 5px;">${companyTagline || "Innovation · Excellence · Growth"}</p>
          </div>
          ${customBody ?? `
          <p>Dear <strong>${employeeName}</strong>,</p>
          <p>We are pleased to inform you that your offer letter has been released.</p>
          ${attachmentBlock}
          ${salaryStr}
          ${joinStr}`}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadUrl}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Download Offer Letter</a>
          </div>
          <p>Please review the offer letter carefully. If you have any questions, do not hesitate to reach out.</p>
          <p>Warm regards,<br><strong>${signatoryName}</strong>${signatoryTitle ? `<br>${signatoryTitle}` : ""}<br>${companyName}</p>
          <div style="border-top: 1px solid #ddd; padding-top: 15px; margin-top: 30px; font-size: 11px; color: #999; text-align: center;">
            <p>This is a confidential document. Unauthorized distribution is prohibited.</p>
          </div>
        </div>
      `;

  return sendMail({
    to,
    subject,
    html,
    attachments: pdfAttachment
      ? [{ filename: pdfAttachment.filename, content: pdfAttachment.content, contentType: "application/pdf" }]
      : undefined,
  });
}

interface PayslipEmailInput {
  to: string;
  employeeName: string;
  periodLabel: string;
  netPay: number;
  companyName?: string;
  pdfAttachment: { filename: string; content: Buffer };
}

/**
 * Send a payslip email to an employee when HR marks the payslip paid.
 * The generated PDF is attached directly. Returns false when no transport
 * is configured or sending failed.
 */
export async function sendPayslipEmail({
  to,
  employeeName,
  periodLabel,
  netPay,
  companyName = "SKORA",
  pdfAttachment,
}: PayslipEmailInput): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; border-bottom: 3px double #2563eb; padding-bottom: 16px; margin-bottom: 20px;">
        <h1 style="color: #2563eb; letter-spacing: 2px; margin: 0;">${companyName}</h1>
        <p style="color: #666; font-size: 12px; margin-top: 5px;">Payroll Notification</p>
      </div>
      <p>Dear <strong>${employeeName}</strong>,</p>
      <p>Your salary for <strong>${periodLabel}</strong> has been processed and paid.</p>
      <p style="font-size:15px;"><strong>Net Pay:</strong> Rs. ${Number(netPay).toLocaleString("en-IN")}</p>
      <p>📄 <strong>Your payslip is attached</strong> as <em>${pdfAttachment.filename}</em>.</p>
      <p>If you notice any discrepancy, please reach out to HR within 7 days.</p>
      <p style="margin-top:24px;">Warm regards,<br><strong>HR Team</strong><br>${companyName}</p>
      <div style="border-top: 1px solid #ddd; padding-top: 15px; margin-top: 30px; font-size: 11px; color: #999; text-align: center;">
        <p>This is a confidential payroll document. Unauthorized distribution is prohibited.</p>
      </div>
    </div>`;

  return sendMail({
    to,
    subject: `Your payslip for ${periodLabel} — ${companyName}`,
    html,
    attachments: [
      { filename: pdfAttachment.filename, content: pdfAttachment.content, contentType: "application/pdf" },
    ],
  });
}

interface WelcomeEmailInput {
  to: string;
  employeeName: string;
  tempPassword: string;
  employeeCode?: string;
  companyName?: string;
}

/**
 * Welcome + credentials email sent when HR approves an account request.
 * The temporary password must be changed at first login (mustChangePassword
 * fence forces /hrms/force-change-password). Returns false when no transport
 * is configured or sending failed.
 */
export async function sendWelcomeEmail({
  to,
  employeeName,
  tempPassword,
  employeeCode,
  companyName = "SKORA",
}: WelcomeEmailInput): Promise<boolean> {
  // E2E test hook: with E2E_TEST_PASSWORD set, all welcome emails report a
  // fixed password so the API test suite can complete the invite lifecycle
  // (SMTP is configured in dev, so the fallback "email failed → surface the
  // temp password" branch never runs there). Never set this in production.
  const e2ePassword = process.env.E2E_TEST_PASSWORD;
  const effectivePassword = e2ePassword || tempPassword;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const loginUrl = siteUrl ? `${siteUrl.replace(/\/$/, "")}/hrms/login` : "/hrms/login";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; border-bottom: 3px double #2563eb; padding-bottom: 16px; margin-bottom: 20px;">
        <h1 style="color: #2563eb; letter-spacing: 2px; margin: 0;">${companyName}</h1>
        <p style="color: #666; font-size: 12px; margin-top: 5px;">Welcome Aboard</p>
      </div>
      <p>Dear <strong>${employeeName}</strong>,</p>
      <p>Your account request has been <strong style="color:#16a34a;">approved</strong> — welcome to ${companyName}!</p>
      <div style="background:#f0f6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 18px;margin:18px 0;">
        <p style="margin:0 0 8px 0;font-size:14px;">Here are your login details:</p>
        <p style="margin:0;font-size:14px;"><strong>Login Email:</strong> ${to}</p>
        <p style="margin:0;font-size:14px;"><strong>Temporary Password:</strong> <span style="font-family:monospace;font-size:15px;font-weight:bold;color:#2563eb;">${effectivePassword}</span></p>
        ${employeeCode ? `<p style="margin:8px 0 0 0;font-size:13px;color:#555;">Your Employee Code: <strong>${employeeCode}</strong></p>` : ""}
      </div>
      <p style="font-size:14px;"><a href="${loginUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:bold;">Sign in to ${companyName} HRMS</a></p>
      <p style="color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:13px;margin-top:16px;">
        🔐 For security, you will be asked to <strong>create your own password</strong> the first time you sign in. This temporary password works only once for that purpose.
      </p>
      <p style="margin-top:24px;">Warm regards,<br><strong>HR Team</strong><br>${companyName}</p>
      <div style="border-top: 1px solid #ddd; padding-top: 15px; margin-top: 30px; font-size: 11px; color: #999; text-align: center;">
        <p>Please do not share these credentials with anyone. HR will never ask for your password.</p>
      </div>
    </div>`;

  return sendMail({
    to,
    subject: `Welcome to ${companyName} HRMS — your login credentials`,
    html,
  });
}

interface ExperienceLetterEmailInput {
  to: string;
  employeeName: string;
  lastWorkingDate: string;
  companyName?: string;
  pdfAttachment: { filename: string; content: Buffer };
}

/**
 * Send the experience letter PDF when an employee's exit is completed.
 * Returns false when no transport is configured or sending failed.
 */
export async function sendExperienceLetterEmail({
  to,
  employeeName,
  lastWorkingDate,
  companyName = "SKORA",
  pdfAttachment,
}: ExperienceLetterEmailInput): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; border-bottom: 3px double #2563eb; padding-bottom: 16px; margin-bottom: 20px;">
        <h1 style="color: #2563eb; letter-spacing: 2px; margin: 0;">${companyName}</h1>
        <p style="color: #666; font-size: 12px; margin-top: 5px;">Offboarding Confirmation</p>
      </div>
      <p>Dear <strong>${employeeName}</strong>,</p>
      <p>Your exit process with ${companyName} is now complete. Your <strong>Experience Letter</strong> is attached as <em>${pdfAttachment.filename}</em>.</p>
      <p style="color:#555;font-size:13px;">Last working date: <strong>${lastWorkingDate}</strong></p>
      <p>We thank you for your contributions and wish you success ahead.</p>
      <p style="margin-top:24px;">Warm regards,<br><strong>HR Team</strong><br>${companyName}</p>
      <div style="border-top: 1px solid #ddd; padding-top: 15px; margin-top: 30px; font-size: 11px; color: #999; text-align: center;">
        <p>This is a confidential document. Unauthorized distribution is prohibited.</p>
      </div>
    </div>`;

  return sendMail({
    to,
    subject: `Your Experience Letter — ${companyName}`,
    html,
    attachments: [
      { filename: pdfAttachment.filename, content: pdfAttachment.content, contentType: "application/pdf" },
    ],
  });
}
