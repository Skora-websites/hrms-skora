import { NextRequest, NextResponse } from "next/server";
import { hrmUsersService } from "@/lib/hrm/firestore";
import { normalizeRole } from "@/lib/rbac";
import bcrypt from "bcryptjs";
import { requireAuth, requireAdmin, requireSuperAdmin, isErrorResponse } from "@/lib/api-auth";
import { recordAuditLog, getAuditLogs } from "@/services/hrm/audit";
import type { AuditAction } from "@/services/hrm/audit";
import { ROLE_HIERARCHY } from "@/lib/rbac";
import { parseBody, profileUpdateSchema } from "@/lib/validations";
import { validatePasswordPolicy } from "@/lib/password-policy";
import { getDb } from "@/lib/db/mongo-helper";
import { maskOnboardingDetails } from "@/lib/pii-masking";
import crypto from "crypto";

const VALID_STATUSES = new Set(["active", "inactive", "disabled", "pending_verification"]);

/**
 * Auto-assign the reporting manager the same way onboarding approval does:
 * prefer an active manager in the user's department, else the first active
 * manager. Stored as displayName per the system convention.
 * Returns the chosen manager's displayName, or null when none exists.
 */
async function autoAssignReportingManager(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: string, department?: string): Promise<string | null> {
  const managers = await db.collection("users").find({
    role: "manager", status: "active", loginStatus: { $ne: "disabled" },
  }).limit(50).toArray();
  const dept = String(department || "").toLowerCase().trim();
  const chosen =
    (dept && managers.find((m: any) =>
      [m.department, m.departmentName].some((v: any) => String(v || "").toLowerCase().trim() === dept),
    )) || managers[0];
  if (!chosen || !(chosen as any).displayName) return null;
  await hrmUsersService.update(userId, { reportingManager: (chosen as any).displayName } as any);
  return (chosen as any).displayName;
}

/** Safe response fields for user reads. Credential fields (passwordHash,
 *  legacy plaintext password) and raw statutory PII never ride responses —
 *  same contract as the employees route projection. */
const SAFE_USER_FIELDS = [
  "id", "_id", "email", "displayName", "firstName", "lastName",
  "role", "status", "loginStatus", "department", "departmentName",
  "designation", "employeeCode", "joiningDate", "phone", "employmentType",
  "reportingManager", "image", "address", "emergencyContact",
  "emergencyPhone", "tenantId", "mustChangePassword", "createdAt", "updatedAt",
] as const;

function projectUser(u: any): Record<string, unknown> {
  if (!u || typeof u !== "object") return u;
  const out: Record<string, unknown> = {};
  for (const f of SAFE_USER_FIELDS) {
    if (u[f] !== undefined) out[f] = u[f];
  }
  return out;
}

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

    switch (action) {      case "list": {
        // Only admins can list all users (managers already pass — their team
        // roster reads this list and filters client-side).
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

        // Mask Aadhar/PAN/bank numbers carried on the account from the
        // onboarding form — list views never expose unmasked PII.
        const masked = filtered.map((u: any) =>
          u.onboardingDetails ? { ...u, onboardingDetails: maskOnboardingDetails(u.onboardingDetails) } : u
        );

        return NextResponse.json({ data: masked.map(projectUser) });
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

        // Single-user views mask statutory PII too; employees may fetch their
        // own record, so unmasked values must not ride the response.
        const maskedUser = (user as any).onboardingDetails
          ? { ...(user as any), onboardingDetails: maskOnboardingDetails((user as any).onboardingDetails) }
          : user;

        return NextResponse.json({ data: projectUser(maskedUser) });
      }

      case "audit-logs": {
        // Audit trail is an HR-level view; managers are deliberately
        // excluded (mirrors requireHrLevel used by the dedicated endpoint).
        if (!(auth.role === "super_admin" || auth.role === "hr_admin" || auth.role === "admin")) {
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

    const policyError = await validatePasswordPolicy(password);
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
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
        const previousRole = normalizeRole((targetUser as any).role);
        const normalizedRole = normalizeRole(role);
        await hrmUsersService.update(resolvedUserId, { role: normalizedRole } as any);

        // ── Reporting-manager semantics on promotion/demotion ──
        // A manager needs no reporting manager (they ARE management); a
        // demoted manager must get one back per their department so leaves,
        // approvals and attendance keep routing correctly.
        try {
          const db = await getDb();
          if (db) {
            if (previousRole !== "manager" && normalizedRole === "manager") {
              // Promotion → clear the old reporting manager.
              await hrmUsersService.update(resolvedUserId, { reportingManager: "" } as any);
              auditDetails = `Changed role from ${previousRole} to ${normalizedRole}; reporting manager cleared`;
            } else if (previousRole === "manager" && normalizedRole !== "manager" && normalizedRole !== "super_admin") {
              // Revert to employee → auto-restore a manager per department.
              const dept = (targetUser as any).department || (targetUser as any).departmentName;
              const assigned = await autoAssignReportingManager(db, resolvedUserId, dept);
              auditDetails = `Changed role from ${previousRole} to ${normalizedRole}` + (assigned ? `; reporting manager auto-assigned to ${assigned}` : "; no active manager available for auto-assignment");
            }
          }
        } catch (rmErr) {
          console.warn("Reporting-manager reassignment on role change failed:", rmErr);
        }

        // ── Kill every live session for this user ──
        // Middleware routes dashboards by the signed user_role cookie, which
        // only gets re-issued at login. Without invalidation the promoted
        // user keeps their old dashboard where every privileged API call
        // 403s. Their next navigation hits /hrms/session-refresh, which
        // re-issues the signed cookies from the DB-fresh session and sends
        // them to the correct dashboard.
        try {
          const sessionDb = await getDb();
          if (sessionDb) {
            await sessionDb.collection("sessions").deleteMany({ userId: resolvedUserId });
            await sessionDb.collection("notifications").insertOne({
              userId: resolvedUserId,
              title: "Your role has been updated",
              body: `Your account role was changed to ${normalizedRole}. Sign in again to continue.`,
              type: "account", isRead: false, createdAt: new Date(), tenantId,
            }).catch(() => undefined);
          }
        } catch { /* best-effort */ }

        // ── Email the victim (best-effort) ──
        // Reuses the shared transport (SMTP → Resend) and lands in the
        // email_delivery_log like every other mail. Never blocks the role
        // change itself.
        const { getRoleLabel } = await import("@/lib/rbac");
        await import("@/lib/email").then(({ sendRoleChangeEmail }) =>
          sendRoleChangeEmail({
            to: targetUserEmail,
            employeeName: String((targetUser as any).displayName || targetUserEmail),
            oldRoleLabel: getRoleLabel(previousRole),
            newRoleLabel: getRoleLabel(normalizedRole),
          }).catch((emailErr) => {
            console.warn("Role-change notification email failed:", emailErr);
            return false;
          })
        );

        auditAction = "update_role";
        if (!auditDetails) auditDetails = `Changed role from ${previousRole} to ${normalizedRole}`;
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
        if (reportingManager !== undefined || managerEmail !== undefined) {
          // Reporting structure is CEO-controlled: nobody else (HR included)
          // may change reporting manager names/emails. Employees see these
          // read-only; the CEO toggle in the superadmin panel drives it.
          if (auth.role !== "super_admin") {
            return NextResponse.json(
              { error: "Forbidden: only the CEO can change the reporting manager" },
              { status: 403 }
            );
          }
          // Guard: nobody can be made their own reporting manager — it breaks
          // leave-approval scoping and creates a self-approval loop.
          const selfEmail = String((targetUser as any).email || "").trim().toLowerCase();
          const selfName = String((targetUser as any).displayName || "").trim().toLowerCase();
          const rmName = reportingManager !== undefined ? String(reportingManager).trim().toLowerCase() : "";
          const rmEmail = managerEmail !== undefined ? String(managerEmail).trim().toLowerCase() : "";
          if (
            (rmName && (rmName === selfEmail || rmName === selfName)) ||
            (rmEmail && rmEmail === selfEmail)
          ) {
            return NextResponse.json(
              { error: "A user cannot be their own reporting manager" },
              { status: 400 }
            );
          }
          // Consistency guard: managers have no reporting manager of their own
          // (the CEO edit modal hides the field for them). Reject any direct
          // API attempt to attach one, so dashboards and approval scoping can
          // never disagree with the role model.
          if (String(normalizeRole((targetUser as any).role)) === "manager" && reportingManager !== undefined) {
            return NextResponse.json(
              { error: "Managers cannot be assigned a reporting manager" },
              { status: 400 }
            );
          }
          if (reportingManager !== undefined) updateData.reportingManager = reportingManager;
          if (managerEmail !== undefined) updateData.managerEmail = managerEmail;
        }
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
        const npPolicyError = await validatePasswordPolicy(np);
        if (npPolicyError) {
          return NextResponse.json({ error: npPolicyError }, { status: 400 });
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
        await hrmUsersService.update(resolvedUserId, { passwordHash: newHash, mustChangePassword: false, passwordChangedAt: new Date() } as any);
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
        // Used on first login when mustChangePassword is true — no current password required.
        // Two guards keep this from becoming a stolen-session password takeover:
        //   1. Self-service only.
        //   2. The account must actually be fenced (mustChangePassword=true).
        //    Once the flag is cleared, rotation requires the change-password
        //    action with the current credential.
        if (userId !== auth.userId) {
          return NextResponse.json({ error: "Can only change your own password" }, { status: 403 });
        }
        if ((targetUser as any).mustChangePassword !== true) {
          return NextResponse.json(
            { error: "Forced change is not active for this account. Use change-password with your current password." },
            { status: 403 }
          );
        }
        const { newPassword: fnp } = body;
        if (!fnp) {
          return NextResponse.json({ error: "New password is required" }, { status: 400 });
        }
        const fnpPolicyError = await validatePasswordPolicy(fnp);
        if (fnpPolicyError) {
          return NextResponse.json({ error: fnpPolicyError }, { status: 400 });
        }
        const forceHash = await bcrypt.hash(fnp, 12);
        await hrmUsersService.update(resolvedUserId, { passwordHash: forceHash, mustChangePassword: false, passwordChangedAt: new Date() } as any);
        // Invalidate every OTHER session for this user — a temporary password
        // shared over email must not leave a second live session behind.
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
        // Clear the cookie
        const forceResponse = NextResponse.json({ success: true, message: "Password updated successfully" });
        forceResponse.cookies.set("must_change_password", "", { path: "/", maxAge: 0 });
        // Audit the forced rotation (it is a credential event)
        await recordAuditLog({ tenantId, action: "update_user", performedById: auth.userId, performedByName: body._performedByName || "Self", targetUserId: resolvedUserId, targetUserEmail, details: "Forced password change completed" });
        return forceResponse;
      }

      case "resend-welcome": {
        // Recovery path for a failed onboarding welcome email: mint a FRESH
        // temporary password, re-fence the account, kill stale sessions, and
        // re-send the welcome email. HR/CEO-level only — this replaces the
        // credential on someone else's account.
        if (!["super_admin", "hr_admin", "admin"].includes(auth.role)) {
          return NextResponse.json(
            { error: "Forbidden: only HR admins and the CEO can resend welcome credentials" },
            { status: 403 }
          );
        }
        if (!(await canActOnTarget(auth.role, auth.userId, targetUser))) {
          return NextResponse.json(
            { error: "Forbidden: you cannot manage this account" },
            { status: 403 }
          );
        }
        // Refuse silently locking out a working account: once the employee
        // has activated (mustChangePassword cleared), the old flow no longer
        // applies — send them through password reset instead.
        if ((targetUser as any).mustChangePassword !== true) {
          return NextResponse.json(
            { error: "Account is already activated. Use the reset-password action to issue a new credential." },
            { status: 409 }
          );
        }
        const resendDb = await getDb();
        if (!resendDb) return NextResponse.json({ error: "Database not available" }, { status: 503 });

        // Fresh readable temporary password — same generator as approval.
        const resendAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        const resendRand = crypto.randomBytes(8);
        const resendTempPassword = "Skora-" + Array.from(resendRand, (b) => resendAlphabet[b % resendAlphabet.length]).join("");
        // E2E hook parity with the approval path: when set, the email
        // advertises this fixed password and the stored hash must match it.
        const resendEffective = process.env.E2E_TEST_PASSWORD || resendTempPassword;
        const resendHash = await bcrypt.hash(resendEffective, 12);
        await hrmUsersService.update(resolvedUserId, { passwordHash: resendHash, mustChangePassword: true } as any);
        // The previous temporary password (and any half-started session) dies here.
        try {
          await resendDb.collection("sessions").deleteMany({ userId: resolvedUserId });
        } catch { /* best-effort */ }

        const { sendWelcomeEmail } = await import("@/lib/email");
        const resendSent = await sendWelcomeEmail({
          to: targetUserEmail,
          employeeName: (targetUser as any).displayName,
          tempPassword: resendTempPassword,
          employeeCode: (targetUser as any).employeeCode,
        }).catch(() => false);

        // Both outcomes are credential events and get audit-logged.
        await recordAuditLog({
          tenantId,
          action: "reset_password",
          performedById: auth.userId,
          performedByName: body._performedByName || "HR Admin",
          targetUserId: resolvedUserId,
          targetUserEmail,
          details: resendSent
            ? "Welcome email re-sent with a fresh temporary password"
            : "Welcome email re-send FAILED — fresh temporary password generated but not delivered",
        });

        if (resendSent) {
          return NextResponse.json({
            data: { success: true, emailSent: true, message: `Fresh welcome email sent to ${targetUserEmail}` },
          });
        }
        // Same contract as the approval path: when the email cannot be
        // delivered, surface the EFFECTIVE password to the approver for
        // manual handover (it is forced to change at first login).
        return NextResponse.json({
          data: {
            success: true,
            emailSent: false,
            tempPassword: resendEffective,
            message: "Email could not be sent — hand over this temporary password to the employee manually.",
          },
        });
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
          // Admin/manager: allowlist safe fields only — never allow role,
          // passwordHash, status, loginStatus, or reportingManager/managerEmail
          // (the reporting structure is CEO-controlled and must not leak in
          // through this legacy path).
          const SAFE_FIELDS = ["displayName", "firstName", "lastName", "email", "phone", "image", "department", "designation", "joiningDate", "employeeCode"];
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
