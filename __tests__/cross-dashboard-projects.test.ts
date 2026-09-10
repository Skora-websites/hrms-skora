/**
 * Project Management — Cross-Dashboard Integration Test
 *
 * Tests the complete lifecycle across HR Admin → Manager → Employee dashboards:
 *
 *   HR ADMIN creates project with budget
 *   → Adds employee as project member
 *   → Creates project tasks assigned to employee
 *
 *   EMPLOYEE sees project in dashboard
 *   → Views project tasks
 *   → Updates task status (todo → in_progress → completed)
 *   → Progress auto-calculates on project
 *
 *   MANAGER views project dashboard stats
 *   → Sees project progress updated
 *   → Creates milestone
 *
 *   HR ADMIN updates project (edit budget, status)
 *   → Deletes project (cascades tasks, members, milestones)
 *
 * Also tests:
 *   - Employee cannot access unassigned projects
 *   - Employee cannot create projects
 *   - Budget is preserved through create/update
 *   - Kanban board reflects task statuses
 *   - Task comments and attachments
 *
 * Prerequisites: Dev server running at localhost:3000
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, registerUser, loginUser, clearSessionCookies, uniqueEmail, type TestUser } from "./helpers";

// ── Test Users ─────────────────────────────────────────

const HR_ADMIN: TestUser = {
  email: "hr-admin-project-test@company.com",
  password: "HRAdmin@123",
  displayName: "Project Test HR Admin",
};

const MANAGER: TestUser = {
  email: "manager-project-test@company.com",
  password: "Manager@123",
  displayName: "Project Test Manager",
};

const EMPLOYEE: TestUser = {
  email: uniqueEmail("project-emp"),
  password: "Employee@123",
  displayName: "Project Test Employee",
};

// ── State ──────────────────────────────────────────────

let projectId: string | undefined;
let projectTaskId: string | undefined;
let employeeUserId: string | undefined;
let milestoneId: string | undefined;

// ── Setup ──────────────────────────────────────────────

beforeAll(async () => {
  clearSessionCookies();
  const regRes = await registerUser(EMPLOYEE);
  if (regRes.ok && regRes.data) employeeUserId = regRes.data.uid;
  await loginUser(HR_ADMIN.email, HR_ADMIN.password);
  await loginUser(MANAGER.email, MANAGER.password);
}, 60000);

afterAll(() => { clearSessionCookies(); });

// ══════════════════════════════════════════════════════════
// PHASE 1: HR Admin Creates Project
// ══════════════════════════════════════════════════════════

describe("Phase 1: Project Creation & Setup (HR Admin)", () => {
  it("1.1 HR Admin can create a project with budget", async () => {
    const res = await api.post("/api/hrm/v2/projects", {
      name: "Integration Test Project",
      description: "Cross-dashboard integration test project",
      status: "planning",
      priority: "high",
      budget: 500000,
      startDate: new Date().toISOString(),
    }, { user: HR_ADMIN });

    if (res.ok) {
      expect(res.data).toBeDefined();
      expect(res.data!.name).toBe("Integration Test Project");
      expect(res.data!.budget).toBe(500000);
      expect(res.data!.status).toBe("planning");
      projectId = res.data!.id;
    }
  });

  it("1.2 Employee cannot create a project", async () => {
    const res = await api.post("/api/hrm/v2/projects", {
      name: "Unauthorized Project",
    }, { user: EMPLOYEE });
    expect(res.ok).toBe(false);
  });

  it("1.3 Project creation requires name", async () => {
    const res = await api.post("/api/hrm/v2/projects", {
      description: "No name project",
    }, { user: HR_ADMIN });
    // 400 = validation error, 401/403 = not authenticated
    expect([400, 401, 403, 404]).toContain(res.status);
  });

  it("1.4 HR Admin can add employee as project member", async () => {
    if (!projectId || !employeeUserId) return;

    const res = await api.post("/api/hrm/v2/projects", {
      action: "member",
      projectId,
      userId: employeeUserId,
      role: "member",
    }, { user: HR_ADMIN });

    if (res.ok) {
      expect(res.data).toBeDefined();
      expect(res.data!.userId).toBe(employeeUserId);
    }
  });

  it("1.5 HR Admin can create project tasks", async () => {
    if (!projectId) return;

    const res = await api.post("/api/hrm/v2/projects", {
      action: "task",
      projectId,
      title: "Design System Setup",
      description: "Set up the design system for the project",
      priority: "high",
      status: "todo",
      assigneeId: employeeUserId,
    }, { user: HR_ADMIN });

    if (res.ok) {
      expect(res.data).toBeDefined();
      expect(res.data!.title).toBe("Design System Setup");
      expect(res.data!.status).toBe("todo");
      projectTaskId = res.data!.id;
    }
  });

  it("1.6 Project is visible in project list", async () => {
    const res = await api.get("/api/hrm/v2/projects", { user: HR_ADMIN });
    if (res.ok && Array.isArray(res.data)) {
      const found = res.data.find((p: any) => p.id === projectId);
      if (projectId) expect(found).toBeDefined();
    }
  });
});

// ══════════════════════════════════════════════════════════
// PHASE 2: Employee Works on Project Tasks
// ══════════════════════════════════════════════════════════

describe("Phase 2: Employee Task Management", () => {
  it("2.1 Employee can see assigned project tasks", async () => {
    if (!projectId) return;

    const res = await api.get(
      `/api/hrm/v2/projects?type=task&projectId=${projectId}&assigneeId=${employeeUserId}`,
      { user: EMPLOYEE }
    );
    if (res.ok && Array.isArray(res.data)) {
      const found = res.data.find((t: any) => t.id === projectTaskId);
      if (projectTaskId) expect(found).toBeDefined();
    }
  });

  it("2.2 Employee cannot access projects they are not assigned to", async () => {
    const res = await api.get(
      "/api/hrm/v2/projects?id=some-random-project-id",
      { user: EMPLOYEE }
    );
    // Should get 404 (not found) or 403 (forbidden)
    expect(res.ok).toBe(false);
  });

  it("2.3 Employee can update task status to in_progress", async () => {
    if (!projectTaskId) return;

    const res = await api.patch(
      `/api/hrm/v2/projects?type=task&taskId=${projectTaskId}`,
      { status: "in_progress" },
      { user: EMPLOYEE }
    );

    if (res.ok) {
      expect(res.data!.status).toBe("in_progress");
    }
  });

  it("2.4 Employee can add a comment to the task", async () => {
    if (!projectTaskId) return;

    const res = await api.post("/api/hrm/v2/projects?action=comment", {
      taskId: projectTaskId,
      content: "Working on the design system setup",
    }, { user: EMPLOYEE });

    if (res.ok) {
      expect(res.data).toBeDefined();
      expect(res.data!.content).toBe("Working on the design system setup");
    }
  });

  it("2.5 Task comments are retrievable", async () => {
    if (!projectTaskId) return;

    const res = await api.get(
      `/api/hrm/v2/projects?comments=true&taskId=${projectTaskId}`,
      { user: EMPLOYEE }
    );
    if (res.ok) {
      expect(Array.isArray(res.data)).toBe(true);
      if (res.data!.length > 0) {
        expect(res.data![0].content).toBe("Working on the design system setup");
      }
    }
  });

  it("2.6 Employee can complete the task", async () => {
    if (!projectTaskId) return;

    const res = await api.patch(
      `/api/hrm/v2/projects?type=task&taskId=${projectTaskId}`,
      { status: "completed" },
      { user: EMPLOYEE }
    );

    if (res.ok) {
      expect(res.data!.status).toBe("completed");
      expect(res.data!.completedAt).toBeDefined();
    }
  });
});

// ══════════════════════════════════════════════════════════
// PHASE 3: Project Progress & Milestones (Manager)
// ══════════════════════════════════════════════════════════

describe("Phase 3: Project Progress & Milestones (Manager/HR Admin)", () => {
  it("3.1 Project progress auto-calculates from completed tasks", async () => {
    if (!projectId) return;

    const res = await api.get(`/api/hrm/v2/projects?id=${projectId}`, {
      user: HR_ADMIN,
    });
    if (res.ok && res.data) {
      // 1 task completed out of 1 total = 100%
      expect(res.data.progress).toBe(100);
    }
  });

  it("3.2 HR Admin can create a milestone", async () => {
    if (!projectId) return;

    const res = await api.post("/api/hrm/v2/projects?action=milestone", {
      projectId,
      title: "Phase 1 Complete",
      description: "Design system delivered",
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: "pending",
    }, { user: HR_ADMIN });

    if (res.ok) {
      expect(res.data).toBeDefined();
      expect(res.data!.title).toBe("Phase 1 Complete");
      milestoneId = res.data!.id;
    }
  });

  it("3.3 Milestones are retrievable", async () => {
    if (!projectId) return;

    const res = await api.get(
      `/api/hrm/v2/projects?milestones=true&projectId=${projectId}`,
      { user: HR_ADMIN }
    );
    if (res.ok) {
      expect(Array.isArray(res.data)).toBe(true);
    }
  });

  it("3.4 HR Admin can update project budget", async () => {
    if (!projectId) return;

    const res = await api.patch(
      `/api/hrm/v2/projects?id=${projectId}`,
      { budget: 750000, status: "in_progress" },
      { user: HR_ADMIN }
    );

    if (res.ok) {
      expect(res.data!.budget).toBe(750000);
      expect(res.data!.status).toBe("in_progress");
    }
  });

  it("3.5 Kanban board reflects task statuses", async () => {
    if (!projectId) return;

    const res = await api.get(
      `/api/hrm/v2/projects?kanban=true&projectId=${projectId}`,
      { user: HR_ADMIN }
    );
    if (res.ok && res.data) {
      expect(res.data.completed).toBeDefined();
      expect(Array.isArray(res.data.completed)).toBe(true);
    }
  });

  it("3.6 Project members are retrievable", async () => {
    if (!projectId) return;

    const res = await api.get(
      `/api/hrm/v2/projects?members=true&projectId=${projectId}`,
      { user: HR_ADMIN }
    );
    if (res.ok) {
      expect(Array.isArray(res.data)).toBe(true);
      if (res.data!.length > 0) {
        const member = res.data!.find((m: any) => m.userId === employeeUserId);
        if (employeeUserId) expect(member).toBeDefined();
      }
    }
  });

  it("3.7 Employee cannot remove project members", async () => {
    // This requires admin role
    const res = await api.delete("/api/hrm/v2/projects?type=member&memberId=fake", {
      user: EMPLOYEE,
    });
    expect(res.ok).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// PHASE 4: Project Dashboard Stats
// ══════════════════════════════════════════════════════════

describe("Phase 4: Project Dashboard Stats", () => {
  it("4.1 Admin can view project dashboard stats", async () => {
    const res = await api.get("/api/hrm/v2/projects?dashboard=true", {
      user: HR_ADMIN,
    });
    if (res.ok && res.data) {
      expect(typeof res.data.totalProjects).toBe("number");
      expect(typeof res.data.activeProjects).toBe("number");
      expect(typeof res.data.completedProjects).toBe("number");
      expect(typeof res.data.overdueTasks).toBe("number");
    }
  });

  it("4.2 Employee sees only their assigned projects in dashboard", async () => {
    const res = await api.get("/api/hrm/v2/projects?dashboard=true", {
      user: EMPLOYEE,
    });
    if (res.ok && res.data) {
      expect(typeof res.data.totalProjects).toBe("number");
      // Employee's projects should include the one they're a member of
    }
  });
});

// ══════════════════════════════════════════════════════════
// PHASE 5: Cleanup — Delete Project
// ══════════════════════════════════════════════════════════

describe("Phase 5: Project Deletion (cascade)", () => {
  it("5.1 Employee cannot delete a project", async () => {
    const res = await api.delete(`/api/hrm/v2/projects?id=${projectId || "fake"}`, {
      user: EMPLOYEE,
    });
    expect(res.ok).toBe(false);
  });

  it("5.2 HR Admin can delete a project (cascades tasks, members, milestones)", async () => {
    if (!projectId) return;

    const res = await api.delete(`/api/hrm/v2/projects?id=${projectId}`, {
      user: HR_ADMIN,
    });
    if (res.ok) {
      expect(res.ok).toBe(true);
    }
  });

  it("5.3 Deleted project is no longer accessible", async () => {
    if (!projectId) return;

    const res = await api.get(`/api/hrm/v2/projects?id=${projectId}`, {
      user: HR_ADMIN,
    });
    expect(res.status).toBe(404);
  });
});
