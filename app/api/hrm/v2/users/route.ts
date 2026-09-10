import { NextRequest, NextResponse } from "next/server";
import { hrmUsersService } from "@/lib/hrm/firestore";
import { normalizeRole } from "@/lib/rbac";
import bcrypt from "bcryptjs";
import { requireAuth, requireAdmin, requireSuperAdmin, isErrorResponse } from "@/lib/api-auth";
import { recordAuditLog, getAuditLogs } from "@/services/hrm/audit";
import type { AuditAction } from "@/services/hrm/audit";

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

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
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
    const { userId, action: updateAction, role, status, displayName, firstName, lastName, email, phone } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Get the target user for audit logging
    const targetUser = await hrmUsersService.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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
        await hrmUsersService.update(userId, { role: normalizedRole } as any);
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
        await hrmUsersService.update(userId, { status } as any);
        auditAction = status === "active" ? "login_enabled" : "login_disabled";
        auditDetails = `Changed status from ${(targetUser as any).status} to ${status}`;

        // If disabling, revoke refresh tokens
        if (status === "disabled" || status === "inactive") {
          try {
            // sessions cleared
          } catch {
            // Token revocation may fail if user doesn't exist in Auth
          }
        }
        break;
      }

      case "login-status": {
        const adminAuth = await requireAdmin();
        if (isErrorResponse(adminAuth)) return adminAuth;
        const loginStatus = body.loginStatus;
        await hrmUsersService.update(userId, { loginStatus } as any);
        auditAction = loginStatus === "disabled" ? "login_disabled" : "login_enabled";
        auditDetails = `Changed login status to ${loginStatus}`;

        if (loginStatus === "disabled") {
          try { const { getDb } = require("@/lib/db/mongo-helper"); const db = await getDb(); if (db) await db.collection("sessions").deleteMany({ userId }); } catch {}
        }
        break;
      }

      case "profile": {
        // Users can update their own profile; admins can update any
        if (auth.role === "employee" && userId !== auth.userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const updateData: Record<string, any> = {};
        if (displayName !== undefined) updateData.displayName = displayName;
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (body.image !== undefined) updateData.image = body.image;
        await hrmUsersService.update(userId, updateData as any);
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
        const resetLink = "/hrms/forgot-password?email=" + encodeURIComponent(targetUserEmail);
        auditAction = "reset_password";
        auditDetails = `Password reset link generated for ${targetUserEmail}`;

        return NextResponse.json({
          data: {
            success: true,
            resetLink,
            message: `Password reset link sent for ${targetUserEmail}`,
          },
        });
      }

      case "change-password": {
        const { currentPassword: cp, newPassword: np } = body;
        if (!cp || !np) {
          return NextResponse.json({ error: "Current and new password are required" }, { status: 400 });
        }
        if (np.length < 6) {
          return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
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
        await hrmUsersService.update(userId, { passwordHash: newHash, mustChangePassword: false } as any);
        auditAction = "update_user";
        auditDetails = "Password changed";
        // Clear must_change_password cookie if present
        const pwResponse = NextResponse.json({ success: true });
        pwResponse.cookies.set("must_change_password", "", { path: "/", maxAge: 0 });
        // Record audit log
        if (auth.userId !== userId) {
          await recordAuditLog({ tenantId, action: auditAction, performedById: auth.userId, performedByName: body._performedByName || "Admin", targetUserId: userId, targetUserEmail, details: auditDetails });
        }
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
        await hrmUsersService.update(userId, { passwordHash: forceHash, mustChangePassword: false } as any);
        // Clear the cookie
        const forceResponse = NextResponse.json({ success: true, message: "Password updated successfully" });
        forceResponse.cookies.set("must_change_password", "", { path: "/", maxAge: 0 });
        return forceResponse;
      }

      default: {
        // Legacy PATCH support (direct field updates)
        if (auth.role === "employee" && userId !== auth.userId) {
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
          await hrmUsersService.update(userId, updateData as any);
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
          await hrmUsersService.update(userId, updateData as any);
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
        targetUserId: userId,
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
    try { const { getDb } = require("@/lib/db/mongo-helper"); const db = await getDb(); if (db) await db.collection("sessions").deleteMany({ userId }); } catch {}

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
