import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { hrmUsersService } from "@/lib/hrm/firestore";
import { ROLE_DEFINITIONS } from "@/services/hrm/auth";
import { normalizeRole, ROLE_HIERARCHY } from "@/lib/rbac";
import { requireAuth, requireAdmin, requireSuperAdmin, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest, notFound, forbidden } from "@/lib/api-handler";
import { getDb } from "@/lib/db/mongo-helper";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";
import { checkRateLimit, recordFailure, clearFailures, clientIp, type RateLimitOptions } from "@/lib/rate-limit";

// Abuse guards: registration spam and password-reset email bombing.
const REGISTER_LIMITS: RateLimitOptions = { max: 10, windowMs: 15 * 60 * 1000, lockoutMs: 15 * 60 * 1000 };
const RESET_LIMITS: RateLimitOptions = { max: 5, windowMs: 15 * 60 * 1000, lockoutMs: 15 * 60 * 1000 };

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const action = body.action;

  switch (action) {
    // ── Account request: email + department only ──────────────────────
    // No account is created and no session is issued. HR (or the CEO)
    // approves the request in the onboarding queue; only then does the
    // applicant receive a welcome email with a temporary password.
    case "request-invite": {
      const { email, department } = body;
      const regKey = `register:${clientIp(request.headers)}`;
      if (checkRateLimit(regKey, REGISTER_LIMITS).locked) {
        return NextResponse.json(
          { error: "Too many account requests. Please try again later." },
          { status: 429, headers: { "Retry-After": "900" } }
        );
      }
      if (!email) return badRequest("Email is required");
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return badRequest("Please enter a valid email address");
      if (!department || typeof department !== "string") return badRequest("Please choose your department");

      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await hrmUsersService.findOneInTenant("default", "email", normalizedEmail);
      if (existingUser) {
        recordFailure(regKey, REGISTER_LIMITS);
        return badRequest("An account with this email already exists");
      }

      const db = await getDb();
      if (!db) return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });

      // Idempotent: a pending request for this email is a success, not an error.
      const existingRequest = await db.collection("employee_onboarding_tasks").findOne({
        email: normalizedEmail, status: "invite_requested", tenantId: "default",
      });
      if (existingRequest) {
        clearFailures(regKey);
        return NextResponse.json({ data: { message: "Your account request is already awaiting approval." } }, { status: 200 });
      }

      const result = await db.collection("employee_onboarding_tasks").insertOne({
        userId: normalizedEmail, // resolved to the real user id at approval time
        tenantId: "default",
        employeeName: normalizedEmail.split("@")[0], // display only; HR sees the email as the identity
        email: normalizedEmail,
        department: department.trim(),
        status: "invite_requested",
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const hrAdmins = await db.collection("users").find({ role: { $in: ["hr_admin", "admin", "super_admin"] }, tenantId: "default" }).toArray();
      for (const admin of hrAdmins) {
        await db.collection("notifications").insertOne({
          userId: admin._id.toString(), title: "New Account Request",
          body: `${normalizedEmail} requested an account in ${department.trim()}.",`,
          type: "onboarding", isRead: false, referenceType: "onboarding",
          referenceId: result.insertedId.toString(), createdAt: new Date(), tenantId: "default",
        });
      }
      clearFailures(regKey);
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
      if (checkRateLimit(resetKey, RESET_LIMITS).locked) {
        return NextResponse.json(
          { data: { message: "If the email exists, a reset link has been sent." } },
          { status: 429 }
        );
      }
      const user = await hrmUsersService.findOneInTenant("default", "email", normalizedEmail);
      if (!user) {
        // Same generic message; the failure still counts toward the limit.
        recordFailure(resetKey, RESET_LIMITS);
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
        recordFailure(resetKey, RESET_LIMITS);
      } else {
        clearFailures(resetKey);
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
  switch (action) {
    case "roles": return NextResponse.json({ data: ROLE_DEFINITIONS });
    case "user": {
      if (!userId) return badRequest("userId required");
      const user = await hrmUsersService.findById(userId);
      if (!user || (user as any).tenantId !== auth.tenantId) return notFound("User not found");
      if (auth.role === "employee" && userId !== auth.userId) return forbidden();
      return NextResponse.json({ data: user });
    }
    case "users": {
      if (auth.role === "employee") return forbidden();
      return NextResponse.json({ data: await hrmUsersService.findManyInTenant(auth.tenantId) });
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
