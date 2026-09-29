import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { hrmUsersService } from "@/lib/hrm/firestore";
import { ROLE_DEFINITIONS } from "@/services/hrm/auth";
import { normalizeRole, ROLE_HIERARCHY } from "@/lib/rbac";
import { requireAuth, requireAdmin, requireSuperAdmin, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest, notFound, forbidden } from "@/lib/api-handler";
import { getDb } from "@/lib/db/mongo-helper";
import { sendPasswordResetEmail } from "@/lib/email";
import type { OnboardingDetails } from "@/types";
import crypto from "crypto";
import { checkRateLimit, recordFailure, clearFailures, clientIp, type RateLimitOptions } from "@/lib/rate-limit";

// Abuse guards: registration spam and password-reset email bombing.
const REGISTER_LIMITS: RateLimitOptions = { max: 10, windowMs: 15 * 60 * 1000, lockoutMs: 15 * 60 * 1000 };
const RESET_LIMITS: RateLimitOptions = { max: 5, windowMs: 15 * 60 * 1000, lockoutMs: 15 * 60 * 1000 };

/** Reference-form departments (SKORA HRMS onboarding form). */
const ONBOARDING_DEPARTMENTS = new Set([
  "Software Development", "Quality Assurance", "IT Infrastructure", "DevOps",
  "Technical Support", "Mobile Technology", "HR Recruitment",
]);

/** Validate + normalize the reference-form payload. Required fields mirror the
 *  SKORA HRMS form; everything else passes through as optional. Returns the
 *  sanitized OnboardingDetails or an error message. */
function parseOnboardingDetails(input: any, department: string, email: string): { details?: OnboardingDetails; error?: string } {
  const str = (v: unknown, max = 200): string =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  const required = (v: string, label: string): string | null =>
    v ? null : `${label} is required`;

  const d: OnboardingDetails = {
    // ── Personal and Contact Details ──
    employeeName: str(input.employeeName, 120),
    gender: input.gender === "Female" ? "Female" : "Male",
    designation: str(input.designation, 120),
    dateOfJoining: str(input.dateOfJoining, 10),
    department,
    dateOfBirth: str(input.dateOfBirth, 10),
    // ── Employment Details ──
    uanNo: str(input.uanNo, 20),
    joiningLocation: str(input.joiningLocation, 120),
    panNo: str(input.panNo, 20).toUpperCase(),
    mobileNo: str(input.mobileNo, 15),
    aadharNo: str(input.aadharNo, 14),
    presentAddress: str(input.presentAddress, 500),
    permanentAddress: str(input.permanentAddress, 500),
    annualCtc: str(input.annualCtc, 30),
    maritalStatus: input.maritalStatus === "No" ? "No" : "Yes",
    spouseName: str(input.spouseName, 120),
    hasPf: input.hasPf === "No" ? "No" : "Yes",
    previousPfNumber: str(input.previousPfNumber, 30),
    epfSalary: str(input.epfSalary, 20),
    previousEsiNo: str(input.previousEsiNo, 22),
    esicDispensary: str(input.esicDispensary, 120),
    // ── Nominee Details ──
    nomineeName: str(input.nomineeName, 120),
    nomineeDob: str(input.nomineeDob, 10),
    nomineeAadhar: str(input.nomineeAadhar, 14),
    nomineeRelation: str(input.nomineeRelation, 60),
    fatherName: str(input.fatherName, 120),
    husbandName: str(input.husbandName, 120),
    // ── Bank Details ──
    nameInBank: str(input.nameInBank, 120),
    bankAccountNumber: str(input.bankAccountNumber, 25),
    bankName: str(input.bankName, 120),
    branchName: str(input.branchName, 120),
    ifscCode: str(input.ifscCode, 11).toUpperCase(),
  };

  // Only the email address is mandatory — it identifies the account the
  // credentials and offer letter are mailed to. Every other field (name,
  // designation, joining date, mobile, UAN, PAN, Aadhar, addresses,
  // nominee, bank) is optional; HR completes statutory details during
  // onboarding. Format checks still run when a value IS provided.
  const missing = required(email, "Email");
  if (missing) return { error: missing };

  // Format checks on provided values only.
  if (d.dateOfJoining && !/^\d{4}-\d{2}-\d{2}$/.test(d.dateOfJoining)) return { error: "Date of Joining must be a valid date" };
  if (d.mobileNo && !/^[0-9+\-\s]{10,15}$/.test(d.mobileNo)) return { error: "Mobile No must be 10–15 digits" };
  if (d.panNo && !/^[A-Z]{5}\d{4}[A-Z]$/.test(d.panNo)) return { error: "PAN No must look like ABCDE1234F" };
  if (d.aadharNo && !/^\d{12}$/.test(d.aadharNo)) return { error: "Aadhar No must be exactly 12 digits" };
  if (d.uanNo && !/^\d{12}$/.test(d.uanNo)) return { error: "UAN No must be exactly 12 digits" };
  if (d.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(d.ifscCode)) return { error: "IFSC Code must look like SBIN0001234" };

  return { details: d };
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const action = body.action;

  switch (action) {
    // ── Account request: full onboarding form + email + department ──
    // No account is created and no session is issued. HR (or the CEO)
    // approves the request in the onboarding queue; only then does the
    // applicant receive a welcome email with a temporary password.
    case "request-invite": {
      const { email, department } = body;
      const regKey = `register:${clientIp(request.headers)}`;
      if ((await checkRateLimit(regKey, REGISTER_LIMITS)).locked) {
        return NextResponse.json(
          { error: "Too many account requests. Please try again later." },
          { status: 429, headers: { "Retry-After": "900" } }
        );
      }
      if (!email) return badRequest("Email is required");
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return badRequest("Please enter a valid email address");
      if (!department || typeof department !== "string") return badRequest("Please choose your department");
      const departmentTrimmed = department.trim();
      if (!ONBOARDING_DEPARTMENTS.has(departmentTrimmed)) {
        return badRequest("Please choose a valid department");
      }

      // Full reference-form data (personal/employment/nominee/bank) — required
      // since the SKORA HRMS onboarding form replaced the email+department stub.
      const normalizedEmail = email.toLowerCase().trim();
      const parsed = parseOnboardingDetails(body, departmentTrimmed, normalizedEmail);
      if (parsed.error) return badRequest(parsed.error);
      const onboardingDetails = parsed.details!;
      if (onboardingDetails.email !== undefined) onboardingDetails.email = normalizedEmail;
      if (onboardingDetails.department !== undefined) onboardingDetails.department = departmentTrimmed;

      const existingUser = await hrmUsersService.findOneInTenant("default", "email", normalizedEmail);
      if (existingUser) {
        await recordFailure(regKey, REGISTER_LIMITS);
        return badRequest("An account with this email already exists");
      }

      const db = await getDb();
      if (!db) return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });

      // Idempotent: a pending request for this email is a success, not an error.
      const existingRequest = await db.collection("employee_onboarding_tasks").findOne({
        email: normalizedEmail, status: "invite_requested", tenantId: "default",
      });
      if (existingRequest) {
        await clearFailures(regKey);
        return NextResponse.json({ data: { message: "Your account request is already awaiting approval." } }, { status: 200 });
      }

      const result = await db.collection("employee_onboarding_tasks").insertOne({
        userId: normalizedEmail, // resolved to the real user id at approval time
        tenantId: "default",
        employeeName: onboardingDetails.employeeName || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        department: departmentTrimmed,
        onboardingDetails, // full reference-form data, copied to the user at approval
        status: "invite_requested",
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const hrAdmins = await db.collection("users").find({ role: { $in: ["hr_admin", "admin", "super_admin"] }, tenantId: "default" }).toArray();
      for (const admin of hrAdmins) {
        await db.collection("notifications").insertOne({
          userId: admin._id.toString(), title: "New Account Request",
          body: `${normalizedEmail} requested an account in ${departmentTrimmed}.",`,
          type: "onboarding", isRead: false, referenceType: "onboarding",
          referenceId: result.insertedId.toString(), createdAt: new Date(), tenantId: "default",
        });
      }
      await clearFailures(regKey);
      return NextResponse.json({ data: { message: "Request sent to HR. You'll receive a welcome email with a temporary password once approved." } }, { status: 201 });
    }

    // Legacy self-registration is retired — the only door in is an approved
    // invite. Old clients get a clear pointer to the new flow.
    case "register": {
      return NextResponse.json(
        { error: "Self-registration has been retired. Submit an account request (action: \"request-invite\") with your email and department; HR will email you a temporary password." },
        { status: 410 }
      );
    }

    case "reset-password": {
      const { email } = body;
      if (!email) return badRequest("Email is required");
      const normalizedEmail = email.toLowerCase().trim();
      const resetKey = `reset:${normalizedEmail}|${clientIp(request.headers)}`;
      if ((await checkRateLimit(resetKey, RESET_LIMITS)).locked) {
        return NextResponse.json(
          { data: { message: "If the email exists, a reset link has been sent." } },
          { status: 429 }
        );
      }
      const user = await hrmUsersService.findOneInTenant("default", "email", normalizedEmail);
      if (!user) {
        // Same generic message; the failure still counts toward the limit.
        await recordFailure(resetKey, RESET_LIMITS);
        return NextResponse.json({ data: { message: "If the email exists, a reset link has been sent." } });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);
      const db = await getDb();
      if (!db) return NextResponse.json({ data: { message: "If the email exists, a reset link has been sent." } });
      await db.collection("password_resets").updateOne(
        { userId: user.id },
        { $set: { token: resetToken, expiresAt: resetExpiry, createdAt: new Date(), tenantId: "default" } },
        { upsert: true }
      );

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      const resetUrl = siteUrl ? `${siteUrl.replace(/\/$/, "")}/hrms/forgot-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(normalizedEmail)}` : "";
      const sent = resetUrl ? await sendPasswordResetEmail({ to: normalizedEmail, resetUrl }) : false;
      if (!sent) {
        await db.collection("password_resets").deleteOne({ userId: user.id });
        await recordFailure(resetKey, RESET_LIMITS);
      } else {
        await clearFailures(resetKey);
      }
      return NextResponse.json({ data: { message: "If the email exists, a reset link has been sent." } });
    }

    case "confirm-reset-password": {
      const { token, email: resetEmail, newPassword } = body;
      if (!token || !resetEmail || !newPassword) return badRequest("Token, email, and new password are required");
      if (newPassword.length < 8) return badRequest("Password must be at least 8 characters");
      const resetUser = await hrmUsersService.findOneInTenant("default", "email", resetEmail.toLowerCase().trim());
      if (!resetUser) return badRequest("Invalid reset request");
      const db = await getDb();
      if (!db) return badRequest("Database not available");
      const resetRecord = await db.collection("password_resets").findOne({ userId: resetUser.id, tenantId: "default", token, expiresAt: { $gt: new Date() } });
      if (!resetRecord) return badRequest("Invalid or expired reset token");
      const newHash = await bcrypt.hash(newPassword, 12);
      await hrmUsersService.update(resetUser.id, { passwordHash: newHash, mustChangePassword: false } as any);
      await db.collection("password_resets").deleteOne({ userId: resetUser.id, tenantId: "default" });
      return NextResponse.json({ data: { message: "Password has been reset successfully" } });
    }

    case "create-user": {
      const auth = await requireAdmin();
      if (isErrorResponse(auth)) return auth;
      const { email, password, displayName, role: rawRole } = body;
      if (!email || !password) return badRequest("Email and password are required");
      if (password.length < 8) return badRequest("Password must be at least 8 characters");
      const requestedRole = rawRole ? normalizeRole(rawRole) : "employee";
      if (auth.role !== "super_admin" && requestedRole !== "employee") return forbidden("Only Super Admin can create privileged accounts");
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await hrmUsersService.findOneInTenant(auth.tenantId, "email", normalizedEmail);
      if (existing) return badRequest("An account with this email already exists");
      const passwordHash = await bcrypt.hash(password, 12);
      const newUser = await hrmUsersService.create({ email: normalizedEmail, displayName: displayName || normalizedEmail, role: requestedRole, status: "active", loginStatus: "enabled", passwordHash, tenantId: auth.tenantId, mustChangePassword: true } as any);
      return NextResponse.json({ data: { uid: newUser.id, email: normalizedEmail, role: requestedRole } }, { status: 201 });
    }

    case "tenant-setup":
      return NextResponse.json({ error: "Multi-tenancy disabled. Single company mode." }, { status: 400 });
    default:
      return badRequest("Invalid action");
  }
}, { label: "HRM Auth" });

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const userId = searchParams.get("userId");
  // Credential fields (passwordHash, legacy plaintext password) never ride
  // user reads from this route — mirrors the employees/users projection.
  const SAFE_FIELDS = [
    "id", "_id", "email", "displayName", "firstName", "lastName",
    "role", "status", "loginStatus", "department", "departmentName",
    "designation", "employeeCode", "joiningDate", "phone", "employmentType",
    "reportingManager", "image", "tenantId", "mustChangePassword",
    "createdAt", "updatedAt",
  ] as const;
  const project = (u: any) => {
    if (!u || typeof u !== "object") return u;
    const out: Record<string, unknown> = {};
    for (const f of SAFE_FIELDS) if (u[f] !== undefined) out[f] = u[f];
    return out;
  };
  switch (action) {
    case "roles": return NextResponse.json({ data: ROLE_DEFINITIONS });
    case "user": {
      if (!userId) return badRequest("userId required");
      const user = await hrmUsersService.findById(userId);
      if (!user || (user as any).tenantId !== auth.tenantId) return notFound("User not found");
      if (auth.role === "employee" && userId !== auth.userId) return forbidden();
      return NextResponse.json({ data: project(user) });
    }
    case "users": {
      // Org-wide user reads are HR-level; managers use scoped routes.
      if (auth.role === "employee" || auth.role === "manager") return forbidden();
      return NextResponse.json({ data: (await hrmUsersService.findManyInTenant(auth.tenantId)).map(project) });
    }
    default: return badRequest("Invalid action. Use: roles, user, users");
  }
}, { label: "HRM Auth" });

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;
  const body = await request.json();
  const { userId, role, loginStatus } = body;
  if (!userId) return badRequest("userId required");
  const target = await hrmUsersService.findById(userId);
  if (!target || (target as any).tenantId !== auth.tenantId) return notFound("User not found");
  const targetRole = normalizeRole((target as any).role);
  if (role) {
    if (auth.role !== "super_admin") return forbidden("Only Super Admin can change roles");
    await hrmUsersService.update(userId, { role: normalizeRole(role) } as any);
    return NextResponse.json({ success: true });
  }
  if (loginStatus) {
    if (auth.role === "employee") return forbidden("Insufficient permissions");
    if (!["enabled", "disabled"].includes(loginStatus)) return badRequest("Invalid loginStatus");
    if (auth.role !== "super_admin" && ROLE_HIERARCHY[normalizeRole(auth.role)] <= ROLE_HIERARCHY[targetRole]) return forbidden("You cannot manage an account at or above your role");
    if (loginStatus === "disabled") {
      const db = await getDb();
      if (db) await db.collection("sessions").deleteMany({ userId });
    }
    await hrmUsersService.update(userId, { loginStatus } as any);
    return NextResponse.json({ success: true });
  }
  return badRequest("Provide userId with role or loginStatus");
}, { label: "HRM Auth" });

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireSuperAdmin();
  if (isErrorResponse(auth)) return auth;
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return badRequest("userId required");
  const target = await hrmUsersService.findById(userId);
  if (!target || (target as any).tenantId !== auth.tenantId) return notFound("User not found");
  if (userId === auth.userId) return badRequest("You cannot delete your own account");
  const db = await getDb();
  if (db) await db.collection("sessions").deleteMany({ userId });
  await hrmUsersService.delete(userId);
  return NextResponse.json({ success: true });
}, { label: "HRM Auth" });
