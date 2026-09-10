import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { hrmUsersService } from "@/lib/hrm/firestore";
import { ROLE_DEFINITIONS } from "@/services/hrm/auth";
import { normalizeRole, ROLE_HIERARCHY } from "@/lib/rbac";
import { requireAuth, requireAdmin, requireSuperAdmin, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest, notFound, forbidden } from "@/lib/api-handler";
import { createSession, SESSION_COOKIE_OPTIONS, SESSION_EXPIRES_IN_MS } from "@/lib/auth";
import { getDb } from "@/lib/db/mongo-helper";
import { sendPasswordResetEmail } from "@/lib/email";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const action = body.action;

  switch (action) {
    case "register": {
      const { email, password, displayName, firstName, lastName } = body;
      if (!email || !password) return badRequest("Email and password are required");
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return badRequest("Please enter a valid email address");
      if (password.length < 8) return badRequest("Password must be at least 8 characters");
      if (password.length > 128) return badRequest("Password must be less than 128 characters");
      const name = displayName || firstName;
      if (!name || name.trim().length < 2) return badRequest("Name must be at least 2 characters");
      if (name.length > 100) return badRequest("Name must be less than 100 characters");

      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await hrmUsersService.findOneInTenant("default", "email", normalizedEmail);
      if (existingUser) return badRequest("An account with this email already exists");

      const role = "employee";
      const passwordHash = await bcrypt.hash(password, 12);
      const newUser = await hrmUsersService.create({
        email: normalizedEmail, emailVerified: false, displayName: displayName || firstName || normalizedEmail,
        firstName: firstName || displayName || "", lastName: lastName || "", role,
        status: "pending_verification", loginStatus: "enabled", passwordHash, tenantId: "default",
        onboardingStatus: "pending", mustChangePassword: true,
      } as any);

      const db = await getDb();
      if (db) {
        await db.collection("employee_onboarding_tasks").insertOne({
          userId: newUser.id, tenantId: "default", employeeName: displayName || firstName || normalizedEmail,
          email: normalizedEmail, department: body.department || "", documentName: body.documentName || "",
          documentUrl: body.documentUrl || "", status: "pending", submittedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
        });
        const hrAdmins = await db.collection("users").find({ role: { $in: ["hr_admin", "admin"] }, tenantId: "default" }).toArray();
        for (const admin of hrAdmins) {
          await db.collection("notifications").insertOne({
            userId: admin._id.toString(), title: "New Employee Registration",
            body: `${displayName || firstName || normalizedEmail} (${normalizedEmail}) has registered and submitted documents for verification.`,
            type: "onboarding", isRead: false, referenceType: "onboarding", referenceId: newUser.id, createdAt: new Date(), tenantId: "default",
          });
        }
      }

      const sessionToken = await createSession(newUser.id);
      const response = NextResponse.json({ data: { uid: newUser.id, email: normalizedEmail, displayName: displayName || firstName || normalizedEmail, role } }, { status: 201 });
      response.cookies.set("session", sessionToken, { ...SESSION_COOKIE_OPTIONS, maxAge: SESSION_EXPIRES_IN_MS / 1000 });
      response.cookies.set("user_role", role, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_EXPIRES_IN_MS / 1000 });
      return response;
    }

    case "reset-password": {
      const { email } = body;
      if (!email) return badRequest("Email is required");
      const normalizedEmail = email.toLowerCase().trim();
      const user = await hrmUsersService.findOneInTenant("default", "email", normalizedEmail);
      if (!user) return NextResponse.json({ data: { message: "If the email exists, a reset link has been sent." } });

      const crypto = require("crypto");
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
