import "server-only";
import {
  departmentHeadcountPlansService,
  internalJobPostingsService,
  hrmUsersService,
  jobsService,
  jobApplicationsService,
  notificationsService,
} from "@/lib/hrm/firestore";
import type {
  DepartmentHeadcountPlan,
  InternalJobPosting,
} from "@/types";

// ══════════════════════════════════════════════════════════════════
// Workforce Planning & Internal Job Postings (IJP) Service
// ══════════════════════════════════════════════════════════════════

// ── Headcount Plans & Budgeting ───────────────────────────────────

export async function getHeadcountPlans(
  tenantId: string = "default",
  financialYear: string = "2026-2027"
): Promise<DepartmentHeadcountPlan[]> {
  return departmentHeadcountPlansService.findManyInTenant(tenantId, {
    where: [{ field: "financialYear", op: "==", value: financialYear }],
    orderByField: "departmentName",
    orderByDirection: "asc",
  });
}

export async function upsertHeadcountPlan(
  tenantId: string = "default",
  data: Partial<DepartmentHeadcountPlan> & { departmentName: string; financialYear: string }
): Promise<DepartmentHeadcountPlan> {
  const existing = await departmentHeadcountPlansService.findManyInTenant(tenantId, {
    where: [
      { field: "departmentName", op: "==", value: data.departmentName },
      { field: "financialYear", op: "==", value: data.financialYear },
    ],
    limitCount: 1,
  });

  if (existing.length > 0 && existing[0].id) {
    const updated = await departmentHeadcountPlansService.update(existing[0].id, data);
    return updated!;
  }

  return departmentHeadcountPlansService.createInTenant(tenantId, {
    departmentId: data.departmentId || `dept_${data.departmentName.toLowerCase().replace(/\s+/g, "_")}`,
    departmentName: data.departmentName,
    financialYear: data.financialYear,
    budgetedHeadcount: data.budgetedHeadcount || 10,
    activeHeadcount: data.activeHeadcount || 0,
    openPositions: data.openPositions || 0,
    budgetAllocated: data.budgetAllocated || 5000000,
    budgetUtilized: data.budgetUtilized || 0,
  });
}

export async function calculateRealtimeHeadcountVariance(
  tenantId: string = "default",
  financialYear: string = "2026-2027"
): Promise<Array<DepartmentHeadcountPlan & { variance: number; fulfillmentRate: number }>> {
  const [plans, allUsers, allOpenings] = await Promise.all([
    getHeadcountPlans(tenantId, financialYear),
    hrmUsersService.findManyInTenant(tenantId),
    jobsService.findManyInTenant(tenantId).catch(() => []),
  ]);

  // Count active employees per department
  const activeCountByDept = new Map<string, number>();
  allUsers.forEach((u: any) => {
    if (u.status !== "terminated" && u.status !== "resigned") {
      const dept = u.department || u.departmentName || "General";
      activeCountByDept.set(dept, (activeCountByDept.get(dept) || 0) + 1);
    }
  });

  // Count open positions per department
  const openCountByDept = new Map<string, number>();
  allOpenings.forEach((op: any) => {
    if (op.status === "open" || op.status === "active") {
      const dept = op.department || "General";
      openCountByDept.set(dept, (openCountByDept.get(dept) || 0) + (op.openingsCount || 1));
    }
  });

  // If no plans exist, generate baseline plans from existing departments
  const departmentNames = Array.from(new Set([...Array.from(activeCountByDept.keys()), "Engineering", "Sales", "Marketing", "HR", "Finance", "Operations"]));
  const finalPlans: Array<DepartmentHeadcountPlan & { variance: number; fulfillmentRate: number }> = [];

  for (const deptName of departmentNames) {
    let plan = plans.find((p: any) => p.departmentName.toLowerCase() === deptName.toLowerCase());
    const active = activeCountByDept.get(deptName) || 0;
    const open = openCountByDept.get(deptName) || 0;

    if (!plan) {
      plan = await upsertHeadcountPlan(tenantId, {
        departmentName: deptName,
        financialYear,
        budgetedHeadcount: Math.max(active + open, 5),
        activeHeadcount: active,
        openPositions: open,
        budgetAllocated: Math.max(active * 600000, 3000000),
        budgetUtilized: active * 550000,
      });
    } else {
      // Refresh active count
      if (plan.activeHeadcount !== active || plan.openPositions !== open) {
        await departmentHeadcountPlansService.update(plan.id, {
          activeHeadcount: active,
          openPositions: open,
        });
        plan.activeHeadcount = active;
        plan.openPositions = open;
      }
    }

    const budgeted = plan.budgetedHeadcount ?? 0;
    const act = plan.activeHeadcount ?? 0;
    const variance = budgeted - act;
    const fulfillmentRate = budgeted > 0 ? Number(((act / budgeted) * 100).toFixed(1)) : 100;

    finalPlans.push({
      ...plan,
      variance,
      fulfillmentRate,
    });
  }

  return finalPlans;
}

// ── Internal Job Postings (IJP) ───────────────────────────────────

export async function getInternalJobPostings(
  tenantId: string = "default",
  status?: InternalJobPosting["status"]
): Promise<InternalJobPosting[]> {
  const where: any[] = [];
  if (status) {
    where.push({ field: "status", op: "==", value: status });
  }

  return internalJobPostingsService.findManyInTenant(tenantId, {
    where,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function getInternalJobPostingById(id: string): Promise<InternalJobPosting | null> {
  return internalJobPostingsService.findById(id);
}

export async function createInternalJobPosting(
  tenantId: string = "default",
  data: Partial<InternalJobPosting>
): Promise<InternalJobPosting> {
  return internalJobPostingsService.createInTenant(tenantId, {
    ...data,
    status: data.status || "open",
    skillsRequired: data.skillsRequired || [],
    openingsCount: data.openingsCount || 1,
    experienceYearsRequired: data.experienceYearsRequired || 1,
  } as any);
}

export async function updateInternalJobPosting(
  id: string,
  data: Partial<InternalJobPosting>
): Promise<InternalJobPosting | null> {
  return internalJobPostingsService.update(id, data);
}

export async function applyToInternalJobPosting(
  tenantId: string = "default",
  jobId: string,
  userId: string,
  employeeNotes?: string
): Promise<{ success: boolean; message: string; applicationId: string }> {
  const [job, user] = await Promise.all([
    internalJobPostingsService.findById(jobId),
    hrmUsersService.findById(userId),
  ]);

  if (!job) throw new Error("Internal job posting not found");
  if (!user) throw new Error("Employee not found");

  const employeeName = user.displayName || (user as any).name || user.email;

  // Create application record
  const app = await jobApplicationsService.createInTenant(tenantId, {
    jobId,
    candidateName: employeeName,
    candidateEmail: user.email,
    candidatePhone: (user as any).phone || "",
    currentCompany: "Internal Transfer (Skora HRMS)",
    experienceYears: (user as any).experienceYears || 2,
    source: "IJP_Internal",
    status: "applied",
    notes: employeeNotes || `Internal transfer application for ${job.jobTitle}`,
  } as any);

  // Notify hiring manager / HR
  await notificationsService.createInTenant(tenantId, {
    userId: "hr_admin",
    title: `New IJP Application: ${job.jobTitle}`,
    body: `${employeeName} has applied for internal transfer to ${job.jobTitle} in ${job.department}.`,
    type: "general",
    isRead: false,
  }).catch(() => {});

  return {
    success: true,
    message: "Application for internal job posting submitted successfully",
    applicationId: app.id,
  };
}
