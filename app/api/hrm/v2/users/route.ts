import { NextRequest, NextResponse } from "next/server";
import { hrmUsersService } from "@/lib/hrm/firestore";
import { normalizeRole } from "@/lib/rbac";
import bcrypt from "bcryptjs";
import { requireAuth, requireAdmin, requireSuperAdmin, isErrorResponse } from "@/lib/api-auth";
import { recordAuditLog, getAuditLogs } from "@/services/hrm/audit";
import type { AuditAction } from "@/services/hrm/audit";
import { ROLE_HIERARCHY } from "@/lib/rbac";
import { parseBody, profileUpdateSchema } from "@/lib/validations";
import { getDb } from "@/lib/db/mongo-helper";
import crypto from "crypto";

const VALID_STATUSES = new Set(["active", "inactive", "disabled", "pending_verification"]);

/**
 * Hierarchy guard: the caller may only act on users strictly below their own
 * role level (managers additionally only on their direct reports). Prevents
 * privilege-escalation paths like a manager editing an HR admin's email and
 * then triggering a password-reset takeover.
 */
async function canActOnTarget(callerRole: string, callerId: string, target: any): Promise<boolean> {
  if (callerRole === "super_admin") return true;
  const callerLevel = ROLE_HIERARCHY[callerRole as keyof typeof ROLE_HIERARCHY] ?? 0;
  const targetRole = String(target?.role || "employee");
  const targetLevel = ROLE_HIERARCHY[targetRole as keyof typeof ROLE_HIERARCHY] ?? 20;
  if (callerLevel < targetLevel) return false;
  // Managers may only manage their own direct reports.
  if (callerRole === "manager") {
    return String(target?.reportingManager || "") === callerId;
  }
  return true;
}

// ── GET: List users, get single user, get audit logs ───

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";
    const userId = searchParams.get("userId");
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const role = searchParams.get("role");

    const tenantId = "default";

    switch (action) {
      case "list": {
        // Only admins can list all users
        if (auth.role === "employee") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const where: { field: string; op: "=="; value: unknown }[] = [];

        if (status) where.push({ field: "status", op: "==", value: status });
        if (role) where.push({ field: "role", op: "==", value: role });

        const users = await hrmUsersService.findManyInTenant(tenantId, {
          where: where.length > 0 ? where : undefined,
          orderByField: "createdAt",
          orderByDirection: "desc",
        });

        // Always exclude super_admin from general list
        let filtered = users.filter((u: any) => {
          const r = (u.role || "").toLowerCase();
          if (r === "super_admin" || r === "superadmin" || r === "ceo") return false;
          return true;
        });
        if (search) {
          const term = search.toLowerCase();
          filtered = filtered.filter(
            (u: any) =>
              (u.displayName || "").toLowerCase().includes(term) ||
              (u.firstName || "").toLowerCase().includes(term) ||
              (u.lastName || "").toLowerCase().includes(term) ||
              (u.email || "").toLowerCase().includes(term)
          );
        }

        return NextResponse.json({ data: filtered });
      }

      case "get": {
        if (!userId) {
          return NextResponse.json({ error: "userId required" }, { status: 400 });
        }
        // Employees can only view themselves
        if (auth.role === "employee" && userId !== auth.userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const user = await hrmUsersService.findById(userId);
        if (!user) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ data: user });
      }

      case "audit-logs": {
        // Only admins can view audit logs
        if (auth.role === "employee") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const targetUserId = searchParams.get("targetUserId") || undefined;
        const limit = parseInt(searchParams.get("limit") || "50", 10);

        const logs = await getAuditLogs(tenantId, { targetUserId, limit });
        return NextResponse.json({ data: logs });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: list, get, audit-logs" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("GET /api/hrm/v2/users error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// ── POST: Create user ─────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const body = await request.json();
    const { email, password, displayName, firstName, lastName, role: rawRole } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const role = normalizeRole(rawRole);

    // Hash password with bcryptjs
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user in MongoDB
    const newUser = await hrmUsersService.create({
      email,
      emailVerified: false,
      displayName: displayName || firstName || email,
      firstName: firstName || displayName || "",
      lastName: lastName || "",
      role,
      status: "active",
      loginStatus: "enabled",
      passwordHash,
      tenantId,
      mustChangePassword: true,
    } as any);

    const authUser = { uid: newUser.id, email, displayName: displayName || firstName || email };

    // Record audit log
    await recordAuditLog({
      tenantId,
      action: "create_user",
      performedById: auth.userId,
      performedByName: body._performedByName || "Super Admin",
      targetUserId: authUser.uid,
      targetUserEmail: email,
      details: `Created user ${email} with role ${role}`,
      metadata: { role },
    });

    return NextResponse.json(
      {
        data: {
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/hrm/v2/users error:", error);

    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// ── PATCH: Update user (role, status, profile, reset password) ──

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const body = await request.json();
    const { userId, action: updateAction, role, status, displayName, firstName, lastName, email, phone, emergencyContact, bankAccount, reportingManager, managerEmail, domainWork, allottedTeam, department, designation } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Resolve the target. Callers may pass an email (e.g. onboarding rows store
    // userId as the candidate's email in older UI flows) instead of an ObjectId.
    let targetUser = await hrmUsersService.findById(userId);
    if (!targetUser && typeof userId === "string" && userId.includes("@")) {
      targetUser = await hrmUsersService.findOneInTenant(tenantId, "email", userId.toLowerCase().trim());
    }
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const resolvedUserId = (targetUser as any).id || userId;

    const targetUserEmail = (targetUser as any).email || "unknown";
    let auditAction: AuditAction = "update_user";
    let auditDetails = "";

    switch (updateAction) {
      case "role": {
        // Only super_admin can change roles
        if (auth.role !== "super_admin") {
          return NextResponse.json(
            { error: "Forbidden: only Super Admin can change roles" },
            { status: 403 }
          );
        }
        const normalizedRole = normalizeRole(role);
        await hrmUsersService.update(resolvedUserId, { role: normalizedRole } as any);
        auditAction = "update_role";
        auditDetails = `Changed role from ${(targetUser as any).role} to ${normalizedRole}`;
        break;
      }

      case "status": {
        // Only admins can change user status
        if (auth.role === "employee") {
          return NextResponse.json(
            { error: "Forbidden: insufficient permissions" },
            { status: 403 }
          );
        }
        // Validate the status value (mass-assignment guard)
        if (!status || !VALID_STATUSES.has(status)) {
          return NextResponse.json(
            { error: "Invalid status. Use: active, inactive, disabled, pending_verification" },
            { status: 400 }
          );
        }
        // Hierarchy guard: no acting on equal-or-higher roles (and no
        // disabling yourself, which would lock you out mid-session).
        if (!(await canActOnTarget(auth.role, auth.userId, targetUser))) {
          return NextResponse.json(
            { error: "Forbidden: you cannot change the status of this account" },
            { status: 403 }
          );
        }
        if (resolvedUserId === auth.userId) {
          return NextResponse.json(
            { error: "You cannot change your own account status" },
            { status: 400 }
          );
        }
        await hrmUsersService.update(resolvedUserId, { status } as any);
        auditAction = status === "active" ? "login_enabled" : "login_disabled";
        auditDetails = `Changed status from ${(targetUser as any).status} to ${status}`;

        // Disabling an account must kill its live sessions immediately —
        // otherwise a disabled user keeps their 5-day cookie until expiry.
        if (status === "disabled" || status === "inactive") {
          try {
            const { getDb } = await import("@/lib/db/mongo-helper");
            const db2 = await getDb();
            if (db2) await db2.collection("sessions").deleteMany({ userId: resolvedUserId });
          } catch { /* best-effort */ }
        }
        break;
      }

      case "login-status": {
        const adminAuth = await requireAdmin();
        if (isErrorResponse(adminAuth)) return adminAuth;
        const loginStatus = body.loginStatus;
        if (!["enabled", "disabled"].includes(loginStatus)) {
          return NextResponse.json({ error: "Invalid loginStatus. Use: enabled, disabled" }, { status: 400 });
        }
        if (!(await canActOnTarget(auth.role, auth.userId, targetUser))) {
          return NextResponse.json(
            { error: "Forbidden: you cannot manage this account" },
            { status: 403 }
          );
        }
        await hrmUsersService.update(resolvedUserId, { loginStatus } as any);
        auditAction = loginStatus === "disabled" ? "login_disabled" : "login_enabled";
        auditDetails = `Changed login status to ${loginStatus}`;

        if (loginStatus === "disabled") {
          try { const db = await getDb(); if (db) await db.collection("sessions").deleteMany({ userId: resolvedUserId }); } catch {}
        }
        break;
      }

      case "profile": {
        // Users can update their own profile; admins can update any (within
        // hierarchy rules — a manager cannot edit an HR admin's profile).
        if (userId !== auth.userId && !(await canActOnTarget(auth.role, auth.userId, targetUser))) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const updateData: Record<string, any> = {};
        if (displayName !== undefined) updateData.displayName = displayName;
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (email !== undefined) {
          // Email changes are sensitive: only self or super_admin.
          if (userId !== auth.userId && auth.role !== "super_admin") {
            return NextResponse.json(
              { error: "Forbidden: only Super Admin can change another user's email" },
              { status: 403 }
            );
          }
          const emailNorm = String(email).toLowerCase().trim();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
            return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
          }
          const duplicate = await hrmUsersService.findOneInTenant(tenantId, "email", emailNorm);
          if (duplicate && String((duplicate as any).id) !== resolvedUserId) {
            return NextResponse.json(
              { error: "An account with this email already exists" },
              { status: 409 }
            );
          }
          updateData.email = emailNorm;
        }
        if (phone !== undefined) updateData.phone = phone;
        // Department/designation are stored under both naming conventions —
        // the profile UI reads/writes `department`, the HRMUser model uses
        // `departmentName`. Keeping both in sync fixes silent data loss where
        // the profile page said "Saved" but the fields never persisted.
        if (department !== undefined) {
          updateData.department = department;
          updateData.departmentName = department;
        }
        if (designation !== undefined) {
          updateData.designation = designation;
          updateData.designationName = designation;
        }
        if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
        if (bankAccount !== undefined) updateData.bankAccount = bankAccount;
        if (reportingManager !== undefined) {
          // Reassignment changes reporting structure — HR-level only.
          if (auth.role === "manager") {
            return NextResponse.json(
              { error: "Forbidden: HR access required to change reporting manager" },
              { status: 403 }
            );
          }
          updateData.reportingManager = reportingManager;
        }
        if (managerEmail !== undefined) updateData.managerEmail = managerEmail;
        if (domainWork !== undefined) updateData.domainWork = domainWork;
        if (allottedTeam !== undefined) updateData.allottedTeam = allottedTeam;
        if (body.image !== undefined) updateData.image = body.image;
        if (Object.keys(updateData).length === 0) {
          return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }
        await hrmUsersService.update(resolvedUserId, updateData as any);
        auditAction = "update_user";
        auditDetails = `Updated profile fields: ${Object.keys(updateData).join(", ")}`;
        break;
      }

      case "reset-password": {
        // Only admins can reset other users' passwords
        if (auth.role === "employee" && userId !== auth.userId) {
          return NextResponse.json(
            { error: "Forbidden: insufficient permissions" },
            { status: 403 }
          );
        }
        // Hierarchy guard: prevents a manager from resetting an HR admin's
        // password and hijacking the privileged account.
        if (userId !== auth.userId && !(await canActOnTarget(auth.role, auth.userId, targetUser))) {
          return NextResponse.json(
            { error: "Forbidden: you cannot reset this account's password" },
            { status: 403 }
          );
        }
        // Issue a real single-use token (1h) and email the reset link — same
        // flow as the self-service forgot-password route.
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);
        const { getDb } = await import("@/lib/db/mongo-helper");
        const db = await getDb();
        if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });
        await db.collection("password_resets").updateOne(
          { userId: resolvedUserId },
          { $set: { token: resetToken, expiresAt: resetExpiry, createdAt: new Date(), tenantId } },
          { upsert: true }
        );
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
        const resetUrl = siteUrl
          ? `${siteUrl.replace(/\/$/, "")}/hrms/forgot-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(targetUserEmail)}`
          : "";
        const { sendPasswordResetEmail } = await import("@/lib/email");
        const sent = resetUrl ? await sendPasswordResetEmail({ to: targetUserEmail, resetUrl }) : false;
        if (!sent) {
          await db.collection("password_resets").deleteOne({ userId: resolvedUserId, tenantId });
          return NextResponse.json({ error: "Email could not be sent. Check SMTP configuration." }, { status: 502 });
        }
        auditAction = "reset_password";
        auditDetails = `Password reset link sent to ${targetUserEmail}`;

        return NextResponse.json({
          data: {
            success: true,
            message: `Password reset link sent to ${targetUserEmail}`,
          },
        });
      }

      case "change-password": {
        const { currentPassword: cp, newPassword: np } = body;
        if (!cp || !np) {
          return NextResponse.json({ error: "Current and new password are required" }, { status: 400 });
        }
        // Self-service only — admins use reset-password for other users.
        if (userId !== auth.userId) {
          return NextResponse.json({ error: "Can only change your own password here" }, { status: 403 });
        }
        if (np.length < 8) {
          return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
        }
        if (!/[a-zA-Z]/.test(np) || !/[0-9]/.test(np)) {
          return NextResponse.json({ error: "Password must contain at least one letter and one number" }, { status: 400 });
        }
        const targetUserForPw = await hrmUsersService.findById(userId);
        if (!targetUserForPw) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        const pwHash = (targetUserForPw as any).passwordHash || (targetUserForPw as any).password;
        if (!pwHash) {
          return NextResponse.json({ error: "No password set for this user" }, { status: 400 });
        }
        const pwValid = await bcrypt.compare(cp, pwHash);
        if (!pwValid) {
          return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
        }
        const newHash = await bcrypt.hash(np, 12);
        await hrmUsersService.update(resolvedUserId, { passwordHash: newHash, mustChangePassword: false } as any);
        // Invalidate every OTHER session for this user — a password change must
        // not leave a stolen session (or an old device) still authenticated.
        try {
          const { getDb } = await import("@/lib/db/mongo-helper");
          const sessionDb = await getDb();
          if (sessionDb) {
            await sessionDb.collection("sessions").deleteMany({
              userId: resolvedUserId,
              token: { $ne: auth.token },
            });
          }
        } catch { /* best-effort */ }
        auditAction = "update_user";
        auditDetails = "Password changed";
        // Clear must_change_password cookie if present
        const pwResponse = NextResponse.json({ success: true });
        pwResponse.cookies.set("must_change_password", "", { path: "/", maxAge: 0 });
        // Record audit log (self-service change is still worth logging)
        await recordAuditLog({ tenantId, action: auditAction, performedById: auth.userId, performedByName: body._performedByName || "Self", targetUserId: resolvedUserId, targetUserEmail, details: auditDetails });
        return pwResponse;
      }

      case "force-change-password": {
        // Used on first login when mustChangePassword is true — no current password required
        // Only allowed for the logged-in user changing their own password
        if (userId !== auth.userId) {
          return NextResponse.json({ error: "Can only change your own password" }, { status: 403 });
        }
        const { newPassword: fnp } = body;
        if (!fnp) {
          return NextResponse.json({ error: "New password is required" }, { status: 400 });
        }
        if (fnp.length < 8) {
          return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        }
        if (!/[a-zA-Z]/.test(fnp) || !/[0-9]/.test(fnp)) {
          return NextResponse.json({ error: "Password must contain at least one letter and one number" }, { status: 400 });
        }
        const forceHash = await bcrypt.hash(fnp, 12);
        await hrmUsersService.update(resolvedUserId, { passwordHash: forceHash, mustChangePassword: false } as any);
        // Clear the cookie
        const forceResponse = NextResponse.json({ success: true, message: "Password updated successfully" });
        forceResponse.cookies.set("must_change_password", "", { path: "/", maxAge: 0 });
        return forceResponse;
      }

      default: {
        // Legacy PATCH support (direct field updates)
        if (userId !== auth.userId && !(await canActOnTarget(auth.role, auth.userId, targetUser))) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (auth.role === "employee") {
          // Employees can only update limited fields
          const { displayName, firstName, lastName, phone } = body;
          const updateData: Record<string, any> = {};
          if (displayName !== undefined) updateData.displayName = displayName;
          if (firstName !== undefined) updateData.firstName = firstName;
          if (lastName !== undefined) updateData.lastName = lastName;
          if (phone !== undefined) updateData.phone = phone;
          await hrmUsersService.update(resolvedUserId, updateData as any);
          auditDetails = `Updated profile: ${Object.keys(updateData).join(", ")}`;
        } else {
          // Admin/manager: allowlist safe fields only — never allow role, passwordHash, status, loginStatus
          const SAFE_FIELDS = ["displayName", "firstName", "lastName", "email", "phone", "image", "department", "designation", "reportingManager", "joiningDate", "employeeCode"];
          const updateData: Record<string, any> = {};
          for (const field of SAFE_FIELDS) {
            if (body[field] !== undefined) updateData[field] = body[field];
          }
          if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
          }
          await hrmUsersService.update(resolvedUserId, updateData as any);
          auditDetails = `Updated user fields: ${Object.keys(updateData).join(", ")}`;
        }
      }
    }

    // Record audit log (skip for self-service updates)
    if (auditDetails && auth.userId !== userId) {
      await recordAuditLog({
        tenantId,
        action: auditAction,
        performedById: auth.userId,
        performedByName: body._performedByName || "Admin",
        targetUserId: resolvedUserId,
        targetUserEmail,
        details: auditDetails,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PATCH /api/hrm/v2/users error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// ── DELETE: Delete user (Super Admin only) ────────────

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Cannot delete yourself
    if (userId === auth.userId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Get user info for audit log before deletion
    const targetUser = await hrmUsersService.findById(userId);
    const targetUserEmail = (targetUser as any)?.email || "unknown";

    // Delete sessions for this user
    try { const db = await getDb(); if (db) await db.collection("sessions").deleteMany({ userId }); } catch {}

    // Delete from MongoDB
    await hrmUsersService.delete(userId);

    // Record audit log
    await recordAuditLog({
      tenantId,
      action: "delete_user",
      performedById: auth.userId,
      performedByName: "Super Admin",
      targetUserId: userId,
      targetUserEmail,
      details: `Deleted user ${targetUserEmail}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/hrm/v2/users error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
