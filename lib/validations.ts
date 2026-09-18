import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

// ══════════════════════════════════════════════════════════════════
// Shared validation schemas (zod v4)
// Single source of truth for server-side input validation. Client forms
// keep native validation but mirror these messages.
// ══════════════════════════════════════════════════════════════════

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailField = z
  .string({ error: "Email is required" })
  .trim()
  .min(1, "Email is required")
  .max(254, "Email is too long")
  .regex(EMAIL_REGEX, "Please enter a valid email address")
  .transform((v) => v.toLowerCase());

export const passwordField = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const nameField = (label = "Name", min = 2, max = 100) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be less than ${max} characters`);

// ── Employee creation (HR Admin) ──────────────────────────────────

export const employeeCreateSchema = z.object({
  email: emailField,
  displayName: nameField("Full name").optional(),
  name: nameField("Full name").optional(),
  firstName: z.string().trim().max(50).optional(),
  lastName: z.string().trim().max(50).optional(),
  password: passwordField.optional(),
  phone: z.string().trim().max(20).optional(),
  role: z.enum(["employee", "manager", "hr_admin", "admin", "super_admin"]).optional(),
  status: z.enum(["active", "inactive", "pending_verification", "disabled"]).optional(),
  department: z.string().trim().min(1, "Department is required").max(100),
  departmentName: z.string().trim().max(100).optional(),
  designation: z.string().trim().min(1, "Designation is required").max(100),
  designationName: z.string().trim().max(100).optional(),
  joiningDate: z.string().optional(),
  employeeCode: z.string().trim().max(20).optional(),
  address: z.string().trim().max(500).optional(),
  emergencyContact: z.string().trim().max(100).optional(),
  emergencyPhone: z.string().trim().max(20).optional(),
  reportingManager: z.string().trim().max(100).optional(),
  employmentType: z.enum(["permanent", "contract", "probation", "intern", "trainee"]).optional(),
});

// ── Leave apply ───────────────────────────────────────────────────

const isoDate = z
  .string({ error: "Date is required" })
  .regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/, "Invalid date format");

export const leaveApplySchema = z
  .object({
    userId: z.string().trim().max(100).optional(),
    leaveTypeId: z.string({ error: "Leave type is required" }).trim().min(1, "Leave type is required"),
    fromDate: isoDate,
    toDate: isoDate,
    reason: z
      .string({ error: "Reason is required" })
      .trim()
      .min(3, "Reason must be at least 3 characters")
      .max(500, "Reason must be less than 500 characters"),
    attachmentURL: z.string().trim().max(500).optional(),
  })
  .refine((d) => new Date(d.toDate).getTime() >= new Date(d.fromDate).getTime(), {
    message: "End date must be on or after the start date",
    path: ["toDate"],
  })
  // Business rule: leave is requested for the future, not retroactively.
  // (Same-day requests remain allowed; yesterday-and-earlier is rejected.)
  .refine(
    (d) => new Date(`${d.fromDate}T23:59:59.999Z`).getTime() >= Date.now() - 24 * 60 * 60 * 1000,
    { message: "Leave cannot start in the past", path: ["fromDate"] }
  )
  .refine(
    (d) =>
      (new Date(d.toDate).getTime() - new Date(d.fromDate).getTime()) /
        (1000 * 60 * 60 * 24) +
        1 <=
      365,
    { message: "Leave cannot exceed 365 days", path: ["toDate"] }
  );

// ── Leave decision (approve/reject) ───────────────────────────────

export const leaveDecisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  id: z.string({ error: "Leave request id is required" }).trim().min(1, "Leave request id is required"),
  reason: z.string().trim().max(500).optional(),
});

// ── Onboarding document attach ────────────────────────────────────

export const onboardingAttachSchema = z.object({
  documentUrl: z.string({ error: "Document URL is required" }).trim().min(1, "Document URL is required").max(500),
  documentName: z.string().trim().max(200).optional(),
});

// ── Profile update (self-service) ─────────────────────────────────

export const profileUpdateSchema = z.object({
  displayName: nameField("Display name").optional(),
  firstName: z.string().trim().max(50).optional(),
  lastName: z.string().trim().max(50).optional(),
  phone: z
    .string()
    .trim()
    .max(20, "Phone must be less than 20 characters")
    .regex(/^[+\d][\d\s\-()]*$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  emergencyContact: z.string().trim().max(100).optional(),
  emergencyPhone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+\d][\d\s\-()]*$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  bankAccount: z.string().trim().max(50).optional(),
  image: z.string().trim().max(500).optional(),
});

// ── Ticket creation / reply ───────────────────────────────────────

export const ticketCreateSchema = z.object({
  subject: z.string({ error: "Subject is required" }).trim().min(3, "Subject must be at least 3 characters").max(150, "Subject must be less than 150 characters"),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  category: z.string().trim().max(50).optional(),
});

export const ticketReplySchema = z.object({
  ticketId: z.string({ error: "Ticket id is required" }).trim().min(1),
  content: z.string({ error: "Reply content is required" }).trim().min(1, "Reply cannot be empty").max(2000, "Reply must be less than 2000 characters"),
  autoReopen: z.boolean().optional(),
});

// ── Goal creation ─────────────────────────────────────────────────

export const goalCreateSchema = z.object({
  title: z.string({ error: "Goal title is required" }).trim().min(3, "Goal title must be at least 3 characters").max(150),
  description: z.string().trim().max(1000).optional(),
  userId: z.string().trim().max(100).optional(),
  weight: z.number().min(0).max(100).optional(),
  dueDate: z.string().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────

export interface ParseBodyResult<T> {
  success: boolean;
  data?: T;
  response?: NextResponse;
}

/** Parse and validate a JSON request body against a zod schema.
 *  Returns a 400 NextResponse with field-level details on failure. */
export async function parseBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>
): Promise<ParseBodyResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    return {
      success: false,
      response: NextResponse.json(
        {
          error: first?.message || "Validation failed",
          details: result.error.issues.map((i) => ({
            field: i.path.join(".") || "_form",
            message: i.message,
          })),
        },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: result.data };
}
