import "server-only";
import {
  workflowRulesService,
  workflowExecutionLogsService,
  notificationsService,
  hrmTasksService,
} from "@/lib/hrm/firestore";
import type {
  WorkflowRule,
  WorkflowExecutionLog,
  WorkflowCondition,
  WorkflowAction,
  WorkflowEventType,
} from "@/types";
import { sendMail } from "@/lib/email";
import { logger } from "@/lib/logger";

// ══════════════════════════════════════════════════════════════════
// Default Workflow Rules for Enterprise Automation
// ══════════════════════════════════════════════════════════════════

export const DEFAULT_WORKFLOW_RULES: Omit<WorkflowRule, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "New Joiner IT & Desk Provisioning",
    description: "Automatically creates setup and equipment checklist tasks when a new employee record is created.",
    eventName: "employee.created",
    tenantId: "default",
    isActive: true,
    priority: 1,
    conditions: [],
    actions: [
      {
        actionType: "create_task",
        params: {
          title: "Provision IT Equipment & Workspace",
          description: "Prepare laptop, access credentials, and desk assignment for new employee {{employeeName}} ({{employeeEmail}})",
          priority: "high",
          department: "IT / Operations",
        },
      },
      {
        actionType: "send_notification",
        params: {
          title: "New Employee Onboarding Initiated",
          message: "Welcome workflow started for {{employeeName}} ({{department}}).",
          type: "onboarding",
        },
      },
    ],
  },
  {
    name: "Leave Request Manager Escalation",
    description: "Notifies reporting manager and creates approval task when a leave request is submitted.",
    eventName: "leave.submitted",
    tenantId: "default",
    isActive: true,
    priority: 2,
    conditions: [],
    actions: [
      {
        actionType: "send_notification",
        params: {
          title: "Leave Request Submitted",
          message: "{{employeeName}} applied for {{days}} day(s) of {{leaveType}} leave.",
          type: "leave",
        },
      },
    ],
  },
  {
    name: "Resignation Offboarding Clearance Chain",
    description: "Triggers IT, Finance, and HR clearance tasks when an employee resigns.",
    eventName: "resignation.submitted",
    tenantId: "default",
    isActive: true,
    priority: 1,
    conditions: [],
    actions: [
      {
        actionType: "create_task",
        params: {
          title: "Offboarding Clearance: IT Asset Recovery",
          description: "Collect company laptop, access keys, and revoke system privileges for {{employeeName}}.",
          priority: "high",
          department: "IT",
        },
      },
      {
        actionType: "create_task",
        params: {
          title: "Offboarding Clearance: Full & Final Accounts Check",
          description: "Verify pending expense claims, salary advances, and leave encashment for {{employeeName}}.",
          priority: "high",
          department: "Finance",
        },
      },
      {
        actionType: "send_notification",
        params: {
          title: "Exit Clearance Initiated",
          message: "Offboarding clearance tasks generated for {{employeeName}}.",
          type: "exit",
        },
      },
    ],
  },
  {
    name: "Attendance Missed Punch Regularization Alert",
    description: "Alerts employee when a check-out punch is missing for a work day.",
    eventName: "attendance.missed_punch",
    tenantId: "default",
    isActive: true,
    priority: 3,
    conditions: [],
    actions: [
      {
        actionType: "send_notification",
        params: {
          title: "Missing Punch Detected",
          message: "Missing attendance punch detected for {{date}}. Please submit a regularization request.",
          type: "attendance",
        },
      },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════
// Rule Evaluation & String Templating Helpers
// ══════════════════════════════════════════════════════════════════

export function evaluateCondition(condition: WorkflowCondition, payload: Record<string, any>): boolean {
  const actualVal = payload[condition.field];
  const targetVal = condition.value;

  switch (condition.operator) {
    case "equals":
      return String(actualVal ?? "").toLowerCase() === String(targetVal ?? "").toLowerCase();
    case "not_equals":
      return String(actualVal ?? "").toLowerCase() !== String(targetVal ?? "").toLowerCase();
    case "greater_than":
      return Number(actualVal) > Number(targetVal);
    case "less_than":
      return Number(actualVal) < Number(targetVal);
    case "contains":
      return String(actualVal ?? "").toLowerCase().includes(String(targetVal ?? "").toLowerCase());
    default:
      return true;
  }
}

export function interpolateTemplate(text: string, payload: Record<string, any>): string {
  if (!text) return "";
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return payload[key] !== undefined && payload[key] !== null ? String(payload[key]) : "";
  });
}

// ══════════════════════════════════════════════════════════════════
// Workflow Service Operations
// ══════════════════════════════════════════════════════════════════

export async function getWorkflowRules(tenantId: string = "default"): Promise<WorkflowRule[]> {
  const rules = await workflowRulesService.findManyInTenant(tenantId);
  if (!rules || rules.length === 0) {
    // Seed default rules into MySQL on first query
    const createdRules: WorkflowRule[] = [];
    for (const def of DEFAULT_WORKFLOW_RULES) {
      const created = await workflowRulesService.createInTenant(tenantId, def as any);
      createdRules.push(created);
    }
    return createdRules;
  }
  return rules;
}

export async function getWorkflowRuleById(id: string): Promise<WorkflowRule | null> {
  return workflowRulesService.findById(id);
}

export async function createWorkflowRule(
  tenantId: string = "default",
  rule: Omit<WorkflowRule, "id" | "createdAt" | "updatedAt">
): Promise<WorkflowRule> {
  return workflowRulesService.createInTenant(tenantId, {
    ...rule,
    isActive: rule.isActive !== false,
  });
}

export async function updateWorkflowRule(
  id: string,
  updates: Partial<WorkflowRule>
): Promise<WorkflowRule | null> {
  return workflowRulesService.update(id, updates);
}

export async function deleteWorkflowRule(id: string): Promise<boolean> {
  return workflowRulesService.delete(id);
}

export async function getWorkflowExecutionLogs(
  tenantId: string = "default",
  limit: number = 50
): Promise<WorkflowExecutionLog[]> {
  const logs = await workflowExecutionLogsService.findManyInTenant(tenantId, {
    limitCount: limit,
  });
  return logs || [];
}

/**
 * Trigger an event through the Workflow & Automation Engine.
 * Evaluates active rules matching the event, checks conditions, and fires actions.
 */
export async function triggerWorkflowEvent(
  eventName: WorkflowEventType | string,
  payload: Record<string, any> = {},
  tenantId: string = "default"
): Promise<{ triggeredCount: number; logs: WorkflowExecutionLog[] }> {
  try {
    const allRules = await getWorkflowRules(tenantId);
    const matchingRules = allRules.filter((r) => r.isActive && r.eventName === eventName);

    const logs: WorkflowExecutionLog[] = [];

    for (const rule of matchingRules) {
      // Evaluate all conditions (AND logic)
      const allPassed =
        !rule.conditions ||
        rule.conditions.length === 0 ||
        rule.conditions.every((cond: WorkflowCondition) => evaluateCondition(cond, payload));

      if (!allPassed) {
        continue;
      }

      let actionsCount = 0;
      let errorMsg: string | undefined;

      try {
        for (const action of rule.actions || []) {
          await executeWorkflowAction(action, payload, tenantId);
          actionsCount++;
        }
      } catch (err: any) {
        logger.error(`[workflow] action execution failed for rule ${rule.name}:`, err);
        errorMsg = err.message || "Action execution failed";
      }

      const log = await workflowExecutionLogsService.createInTenant(tenantId, {
        ruleId: rule.id || "",
        ruleName: rule.name,
        eventName,
        entityId: payload.id || payload.userId || payload.employeeId || "",
        entityType: payload.entityType || eventName.split(".")[0],
        payload,
        status: errorMsg ? "failed" : "success",
        actionsExecuted: actionsCount,
        errorMessage: errorMsg,
      });

      logs.push(log);
    }

    return { triggeredCount: matchingRules.length, logs };
  } catch (err) {
    logger.error(`[workflow] triggerWorkflowEvent failed for event ${eventName}:`, err);
    return { triggeredCount: 0, logs: [] };
  }
}

async function executeWorkflowAction(
  action: WorkflowAction,
  payload: Record<string, any>,
  tenantId: string
): Promise<void> {
  const params = action.params || {};

  switch (action.actionType) {
    case "create_task": {
      const title = interpolateTemplate(params.title || "Automated Task", payload);
      const description = interpolateTemplate(params.description || "", payload);
      await hrmTasksService.createInTenant(tenantId, {
        title,
        description,
        priority: params.priority || "medium",
        status: "pending",
        departmentId: params.departmentId || params.department || payload.department || "Operations",
        assigneeId: params.assigneeId || payload.reportingManagerId || payload.userId || "",
        assigneeName: params.assigneeName || payload.reportingManager || "",
        progress: 0,
      });
      break;
    }

    case "send_notification": {
      const title = interpolateTemplate(params.title || "Notification", payload);
      const message = interpolateTemplate(params.message || "", payload);
      await notificationsService.createInTenant(tenantId, {
        title,
        body: message,
        type: (params.type || "general") as any,
        userId: params.userId || payload.userId || payload.managerId || "all",
        isRead: false,
      });
      break;
    }

    case "send_email": {
      const recipient = interpolateTemplate(params.to || payload.email || payload.employeeEmail || "", payload);
      if (recipient) {
        const subject = interpolateTemplate(params.subject || "HRMS Notification", payload);
        const html = interpolateTemplate(params.html || params.body || "", payload);
        await sendMail({
          to: recipient,
          subject,
          html,
        });
      }
      break;
    }

    default:
      logger.warn(`[workflow] unknown action type: ${action.actionType}`);
  }
}
