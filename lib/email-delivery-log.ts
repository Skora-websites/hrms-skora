import "server-only";
import { getDb } from "@/lib/db/mongo-helper";

/**
 * HR-visible delivery history for outbound emails (welcome, payslip, reset,
 * experience letter). Written best-effort from lib/email.ts
 * so a logging failure can never break an actual email send. The collection
 * holds only metadata — never passwords, PDF bytes, or email bodies.
 */
export interface EmailDeliveryEntry {
  kind:
    | "welcome_email"
    | "payslip"
    | "password_reset"
    | "experience_letter"
    | "other";
  to: string;
  status: "sent" | "failed";
  subject: string;
  provider: "smtp" | "resend" | "none";
  hasAttachment?: boolean;
  error?: string;
  createdAt: Date;
}

/** Classify an outbound email from its subject line (sendMail has no richer context). */
function classifyKind(subject: string): EmailDeliveryEntry["kind"] {
  const s = subject.toLowerCase();
  if (s.includes("welcome") || s.includes("temporary password") || s.includes("account request")) return "welcome_email";
  if (s.includes("payslip") || s.includes("salary slip")) return "payslip";
  if (s.includes("reset your") || s.includes("password reset")) return "password_reset";
  if (s.includes("experience letter") || s.includes("relieving")) return "experience_letter";
  return "other";
}

/** Truncate provider errors to keep rows small and avoid leaking internals. */
function cleanError(err: unknown): string | undefined {
  if (!err) return undefined;
  const msg = err instanceof Error ? err.message : String(err);
  return msg ? msg.slice(0, 200) : undefined;
}

export async function logEmailDelivery(entry: {
  to: string;
  subject: string;
  status: "sent" | "failed";
  provider: "smtp" | "resend" | "none";
  hasAttachment?: boolean;
  error?: unknown;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.collection("email_delivery_log").insertOne({
      kind: classifyKind(entry.subject),
      to: String(entry.to || "").toLowerCase().slice(0, 200),
      status: entry.status,
      subject: String(entry.subject || "").slice(0, 200),
      provider: entry.provider,
      hasAttachment: Boolean(entry.hasAttachment),
      error: cleanError(entry.error),
      createdAt: new Date(),
    });
  } catch {
    // Logging must never break email delivery.
  }
}

/** Latest entries, newest first, for the HR delivery-history panel. */
export async function getEmailDeliveryLog(limit = 100): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .collection("email_delivery_log")
    .find({})
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 200))
    .toArray();
}
