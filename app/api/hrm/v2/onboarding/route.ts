import { NextRequest, NextResponse } from "next/server";
import {
  getOnboardingPrograms,
  getOnboardingById,
  createOnboardingProgram,
  updateOnboardingProgram,
  deleteOnboardingProgram,
  getOnboardingDashboard,
  initiateEmployeeOnboarding,
  getEmployeeOnboardingTasks,
  updateOnboardingTaskStatus,
  getPendingOnboardingTasks,
} from "@/services/hrm/onboarding";
import { requireAuth, requireAdmin, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mongo-helper";
import { ObjectId } from "mongodb";
import { generateEmployeeCode } from "@/lib/hrm/employee-code";
import { hrmUsersService } from "@/lib/hrm/firestore";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    const dashboard = searchParams.get("dashboard");
    const pending = searchParams.get("pending");
    const employeeTasks = searchParams.get("employeeTasks");

    if (dashboard === "true") {
      if (auth.role === "employee") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const dashData = await getOnboardingDashboard(tenantId);
      return NextResponse.json({ data: dashData });
    }

    if (pending === "true") {
      // HR-only queue — employees fetch their own tasks via ?employeeTasks=true
      if (auth.role === "employee") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const tasks = await getPendingOnboardingTasks(tenantId);
      return NextResponse.json({ data: tasks });
    }

    if (employeeTasks === "true" && userId) {
      if (auth.role === "employee" && userId !== auth.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const tasks = await getEmployeeOnboardingTasks(tenantId, userId);
      return NextResponse.json({ data: tasks });
    }

    if (id) {
      const program = await getOnboardingById(id);
      if (!program) {
        return NextResponse.json({ error: "Onboarding program not found" }, { status: 404 });
      }
      return NextResponse.json({ data: program });
    }

    const programs = await getOnboardingPrograms(tenantId);
    return NextResponse.json({ data: programs });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/onboarding error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const body = await request.json();
    const action = body.action;

    if (action === "initiate" && body.onboardingId && body.userId) {
      const tasks = await initiateEmployeeOnboarding(tenantId, body.onboardingId, body.userId);
      return NextResponse.json({ data: tasks }, { status: 201 });
    }

    if (action === "update_task" && body.taskId) {
      // Approvals are HR/CEO decisions — managers are view-and-comment only.
      if (!["super_admin", "hr_admin", "admin"].includes(auth.role)) {
        return NextResponse.json({ error: "Forbidden: only HR admins and the CEO can approve account requests" }, { status: 403 });
      }

      const db = await getDb();
      const taskFilter = ObjectId.isValid(body.taskId) ? { _id: new ObjectId(body.taskId) } : { id: body.taskId };
      const taskDoc = db ? await db.collection("employee_onboarding_tasks").findOne(taskFilter).catch(() => null) : null;

      // ── Approved ────────────────────────────────────────────────
      // New flow (invite_requested): the applicant never had an account.
      // Approval CREATES it: server-generated temporary password, welcome
      // email with credentials, mustChangePassword forces a real password at
      // first login. Legacy flow (pending document): account already exists.
      if (body.status === "approved") {
        const employeeCode = await generateEmployeeCode();
        const requestedDepartment = (taskDoc as any)?.department || (taskDoc as any)?.departmentName || undefined;

        if ((taskDoc as any)?.status === "invite_requested" || ((taskDoc as any)?.userId && String((taskDoc as any).userId).includes("@"))) {
          if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });
          if (!taskDoc) return NextResponse.json({ error: "Task not found" }, { status: 404 });

          const email = String((taskDoc as any).email || (taskDoc as any).userId).toLowerCase().trim();
          const existing = await hrmUsersService.findOneInTenant("default", "email", email);
          let emailSent: boolean | undefined;
          let tempPassword: string | undefined; // surfaced to the approver only when the email could not be sent
          if (existing) {
            // Request raced with an HR "add employee" — reconcile instead of failing.
            await hrmUsersService.update(String((existing as any).id), { status: "active", onboardingStatus: "approved", employeeCode, mustChangePassword: false } as any);
          } else {
            // Readable temporary password: Skora- + 8 crypto-random alphanumerics.
            const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
            const rand = crypto.randomBytes(8);
            tempPassword = "Skora-" + Array.from(rand, (b) => alphabet[b % alphabet.length]).join("");
            // E2E hook: when set, welcome emails advertise this fixed password
            // instead of the random one (the suite cannot read inboxes), so the
            // stored hash must match what the email delivers.
            const effectivePassword = process.env.E2E_TEST_PASSWORD || tempPassword;
            const passwordHash = await bcrypt.hash(effectivePassword, 12);
            const displayName = (taskDoc as any)?.employeeName && !(taskDoc as any).employeeName.includes("@")
              ? (taskDoc as any).employeeName
              : email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
            const newUser = await hrmUsersService.create({
              email, emailVerified: true, displayName,
              firstName: displayName.split(" ")[0] || displayName, lastName: displayName.split(" ").slice(1).join(" "),
              role: "employee", status: "active", loginStatus: "enabled", passwordHash,
              tenantId: "default", onboardingStatus: "approved", employeeCode,
              mustChangePassword: true,
              ...(requestedDepartment ? { department: requestedDepartment, departmentName: requestedDepartment } : {}),
            } as any);

            emailSent = await sendWelcomeEmail({
              to: email, employeeName: displayName, tempPassword, employeeCode,
            }).catch(() => false);

            if (db) {
              await db.collection("notifications").insertOne({
                userId: String((newUser as any).id),
                title: "Welcome to the team!",
                body: emailSent
                  ? `Your account was approved. A welcome email with your temporary password was sent to ${email}.`
                  : `Your account was approved (employee code ${employeeCode}), but the welcome email could NOT be sent — contact HR for your credentials.`,
                type: "onboarding", isRead: false, createdAt: new Date(), tenantId: "default",
              }).catch(() => undefined);
            }
          }

          const createdUser = existing
            ? existing
            : await hrmUsersService.findOneInTenant("default", "email", email);
          const createdUserId = String((createdUser as any)?.id || (taskDoc as any).userId);

          const approvedTask = await updateOnboardingTaskStatus(body.taskId, "approved", body.completedById || auth.userId, {
            employeeCode,
            approvedAt: new Date(),
            approvedById: auth.userId,
            inviteEmailed: true,
            userId: createdUserId, // link the request row to the real account
          });

          if (db) {
            await db.collection("employee_onboarding_tasks").updateOne(
              taskFilter,
              { $set: { userId: createdUserId, employeeCode, updatedAt: new Date() } }
            ).catch(() => undefined);
          }

          // When the welcome email could not be delivered (no SMTP in CI/dev),
          // surface the temp password to the approver so credentials can be
          // handed over manually. It is forced to change at first login.
          return NextResponse.json({ data: { ...(approvedTask || taskDoc), employeeCode, inviteEmailed: true, emailSent, ...(emailSent ? {} : { tempPassword }) } });
        }

        // Legacy approval: activate the existing pending_verification account.
        const legacyUserId = String((taskDoc as any)?.userId || "");
        if (!legacyUserId) return NextResponse.json({ error: "Task not found" }, { status: 404 });
        await hrmUsersService.update(legacyUserId, {
          status: "active",
          onboardingStatus: "approved",
          employeeCode,
          ...(requestedDepartment ? { department: requestedDepartment, departmentName: requestedDepartment } : {}),
        } as any);
        if (db) {
          await db.collection("employee_onboarding_tasks").updateOne(
            taskFilter,
            { $set: { employeeCode, updatedAt: new Date() } }
          ).catch(() => undefined);
          await db.collection("notifications").insertOne({
            userId: legacyUserId,
            title: "Onboarding Approved",
            body: `Your documents were verified. Welcome aboard! Your employee code is ${employeeCode}.`,
            type: "onboarding", isRead: false, createdAt: new Date(), tenantId: "default",
          });
        }
        return NextResponse.json({ data: { ...(taskDoc || {}), employeeCode } });
      }

      // ── Rejected ────────────────────────────────────────────────
      if (body.status === "rejected") {
        const now = new Date();
        const deadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        // Invite requests have no user account to flag — only the task.
        const isInvite = (taskDoc as any)?.status === "invite_requested";
        if (!isInvite) {
          await hrmUsersService.update(String((taskDoc as any)?.userId || ""), { onboardingStatus: "rejected" } as any);
        }
        const rejectUpdate = await updateOnboardingTaskStatus(body.taskId, "rejected", body.completedById, {
          lastRejectionDate: now,
          rejectionDeadline: deadline,
        });
        if (db) {
          await db.collection("notifications").insertOne({
            userId: isInvite ? "admin" : String((taskDoc as any)?.userId || "admin"),
            title: isInvite ? "Account Request Rejected" : "Documents Rejected",
            body: isInvite
              ? `The account request for ${(taskDoc as any)?.email || "an applicant"} was rejected. They may submit a new request.`
              : "Your onboarding document was rejected. Please re-upload within 48 hours.",
            type: "onboarding", isRead: false, createdAt: now, tenantId: "default",
          });
        }
        return NextResponse.json({ data: rejectUpdate || taskDoc });
      }

      const updated2 = await updateOnboardingTaskStatus(body.taskId, body.status, body.completedById);
      if (!updated2) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      return NextResponse.json({ data: updated2 });
    }

    if (!body.name) {
      return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
    }

    const program = await createOnboardingProgram(tenantId, body);
    return NextResponse.json({ data: program }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/onboarding error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const body = await request.json();

    // Employees attach/resubmit their own verification document.
    if (body.action === "attach_document") {
      if (auth.role === "employee" && body.userId && body.userId !== auth.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const userId = auth.userId;
      if (!body.documentUrl) {
        return NextResponse.json({ error: "documentUrl is required" }, { status: 400 });
      }

      const db = await getDb();
      if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });

      let task = await db.collection("employee_onboarding_tasks").findOne(
        { userId, tenantId: "default" },
        { sort: { createdAt: -1 } }
      );
      // Older accounts were never given an onboarding task row. Create one on
      // the fly so doc submit from the profile page never dead-ends.
      if (!task) {
        const userFilter: Record<string, unknown> = ObjectId.isValid(userId)
          ? { _id: new ObjectId(userId) }
          : { _id: userId };
        const u = await db.collection("users").findOne(userFilter);
        await db.collection("employee_onboarding_tasks").insertOne({
          userId, tenantId: "default",
          employeeName: (u && (u.displayName || u.firstName)) || (auth as any).email || userId,
          email: (u && u.email) || "", department: (u && u.department) || "",
          status: "pending", createdAt: new Date(), updatedAt: new Date(),
        });
        task = await db.collection("employee_onboarding_tasks").findOne(
          { userId, tenantId: "default" },
          { sort: { createdAt: -1 } }
        );
      }

      // Resubmission after rejection clears the pending/rejected state.
      if (!task) return NextResponse.json({ error: "Could not create onboarding task" }, { status: 500 });
      const wasRejected = (task as any).status === "rejected";
      const updated = await db.collection("employee_onboarding_tasks").findOneAndUpdate(
        { _id: task._id },
        {
          $set: {
            documentName: body.documentName || "",
            documentUrl: body.documentUrl,
            status: "pending",
            resubmittedAt: wasRejected ? new Date() : (task as any).resubmittedAt,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      );

      await db.collection("notifications").insertOne({
        userId: "admin",
        title: wasRejected ? "Document Re-submitted" : "Document Uploaded",
        body: `${(auth as any).displayName || auth.userId} ${wasRejected ? "re-submitted" : "uploaded"} their onboarding document for verification.`,
        type: "onboarding", isRead: false, referenceId: userId, createdAt: new Date(), tenantId: "default",
      });

      const doc = updated ? { ...updated, _id: (updated as any)._id.toString() } : null;
      return NextResponse.json({ data: doc });
    }

    // Admin path: program updates by id (original behavior)
    const adminAuth = await requireAdmin();
    if (isErrorResponse(adminAuth)) return adminAuth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    const updated = await updateOnboardingProgram(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Onboarding program not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PATCH /api/hrm/v2/onboarding error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    const deleted = await deleteOnboardingProgram(id);
    if (!deleted) {
      return NextResponse.json({ error: "Onboarding program not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/hrm/v2/onboarding error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
