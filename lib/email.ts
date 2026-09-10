import "server-only";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

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
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transporterCache;
}

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email via SMTP if configured, otherwise via the Resend API.
 * Returns true only when a transport actually accepted the message.
 */
export async function sendMail({ to, subject, html }: MailOptions): Promise<boolean> {
  // ── 1. SMTP (primary) ──
  const transporter = await getTransporter();
  if (transporter) {
    const cfg = getSmtpConfig()!;
    try {
      await transporter.sendMail({
        from: cfg.from,
        to,
        subject,
        html,
      });
      return true;
    } catch (err) {
      console.error("SMTP send failed, falling back to Resend:", err);
      // fall through to Resend
    }
  }

  // ── 2. Resend HTTP API (fallback) ──
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    return response.ok;
  } catch (err) {
    console.error("Resend send failed:", err);
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
  subjectTemplate,
  bodyTemplate,
}: OfferLetterEmailInput): Promise<boolean> {
  const salaryStr = salary
    ? `<p><strong>Annual Salary:</strong> Rs. ${salary.toLocaleString("en-IN")}</p>`
    : "";
  const joinStr = joiningDate
    ? `<p><strong>Joining Date:</strong> ${joiningDate}</p>`
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
          <p>We are pleased to inform you that your offer letter has been released and is ready for download.</p>
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

  return sendMail({ to, subject, html });
}
