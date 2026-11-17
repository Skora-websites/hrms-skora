import "server-only";
import {
  aiChatMessagesService,
  leaveBalancesService,
  leaveRequestsService,
  leaveTypesService,
  hrmUsersService,
} from "@/lib/hrm/firestore";
import { calculateAccruedWage } from "@/services/hrm/payroll/salary-advance";
import { getExpenses, getExpenseCategories } from "@/services/hrm/expenses";
import { getMySQLPool } from "@/lib/db/mysql";
import type { AIChatMessage } from "@/types";

// ══════════════════════════════════════════════════════════════════
// Actionable AI HR Assistant Engine
// ══════════════════════════════════════════════════════════════════

export interface AIActionCard {
  type: "leave_balance" | "apply_leave" | "salary_advance" | "payslip_summary" | "who_is_out" | "expense_claim" | "kudos_recommendation";
  title: string;
  summary: string;
  data: Record<string, any>;
  actionUrl?: string;
  actionPayload?: Record<string, any>;
  buttonLabel?: string;
}

export interface AIAssistantResponse {
  reply: string;
  cards?: AIActionCard[];
  intentDetected?: string;
}

export async function processActionableAIQuery(
  tenantId: string,
  userId: string,
  userPrompt: string
): Promise<AIAssistantResponse> {
  const p = userPrompt.toLowerCase().trim();
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Leave Balance Intent
  if (p.includes("leave balance") || p.includes("how many leaves") || p.includes("remaining leave") || p.includes("check leave")) {
    const balances = await leaveBalancesService.findManyInTenant(tenantId, {
      where: [{ field: "userId", op: "==", value: userId }],
    });

    if (balances.length === 0) {
      return {
        reply: "You currently have no allocated leave balances registered for this year. Please contact HR to assign a leave plan.",
        intentDetected: "check_leave_balance",
      };
    }

    const summaryText = balances
      .map((b: any) => `• **${b.leaveTypeName || "Leave"}**: ${b.remaining} remaining (used ${b.used || 0}/${b.allocated || 0})`)
      .join("\n");

    return {
      reply: `Here is your current leave balance breakdown:\n\n${summaryText}\n\nWould you like me to prepare a leave application for you?`,
      intentDetected: "check_leave_balance",
      cards: [
        {
          type: "leave_balance",
          title: "Annual Leave Balances",
          summary: `${balances.reduce((acc: number, b: any) => acc + Number(b.remaining || 0), 0)} total days remaining`,
          data: { balances },
          actionUrl: "/hrms/employee/leaves",
          buttonLabel: "Apply for Leave",
        },
      ],
    };
  }

  // 2. Who is Out / Out of Office Intent
  if (p.includes("who is out") || p.includes("out today") || p.includes("who is on leave") || p.includes("colleagues on leave")) {
    const pool = getMySQLPool();
    const [rows]: any = await pool.query(
      `SELECT lr.userId, u.displayName, u.email, u.department, lr.leaveTypeName, lr.fromDate, lr.toDate, lr.reason
       FROM leave_requests lr
       LEFT JOIN users u ON lr.userId = u.id OR lr.userId = u.legacyId
       WHERE lr.tenantId = ?
         AND lr.status = 'approved'
         AND ? BETWEEN lr.fromDate AND lr.toDate
       LIMIT 20`,
      [tenantId, todayStr]
    );

    if (!rows || rows.length === 0) {
      return {
        reply: `Good news! No team members are recorded on approved leave today (${todayStr}). Everyone is scheduled to be active.`,
        intentDetected: "who_is_out_today",
      };
    }

    const listText = rows
      .map((r: any) => `• **${r.displayName || r.email || "Employee"}** (${r.department || "General"}) - ${r.leaveTypeName || "Leave"} until ${String(r.toDate).slice(0, 10)}`)
      .join("\n");

    return {
      reply: `Here are the colleagues currently on approved leave today (${todayStr}):\n\n${listText}`,
      intentDetected: "who_is_out_today",
      cards: [
        {
          type: "who_is_out",
          title: "Colleagues on Leave Today",
          summary: `${rows.length} employee(s) out today`,
          data: { outEmployees: rows },
          actionUrl: "/hrms/attendance",
          buttonLabel: "View Attendance Master",
        },
      ],
    };
  }

  // 3. Earned Wage Access / Salary Advance Intent
  if (p.includes("salary advance") || p.includes("earned wage") || p.includes("advance salary") || p.includes("advance money") || p.includes("accrued wage")) {
    const accrual = await calculateAccruedWage(tenantId, userId);

    return {
      reply: `Based on your attendance so far this month (${accrual.daysWorked} days worked), your estimated accrued wage is **₹${accrual.accruedWage.toLocaleString()}**.\n\nYou are eligible to draw up to **₹${accrual.currentAvailableAdvance.toLocaleString()}** (50% max policy allowance minus active draws).`,
      intentDetected: "salary_advance_eligibility",
      cards: [
        {
          type: "salary_advance",
          title: "Earned Wage Access (EWA)",
          summary: `₹${accrual.currentAvailableAdvance.toLocaleString()} Available for Immediate Advance`,
          data: accrual,
          actionUrl: "/hrms/employee/salary-advance",
          buttonLabel: "Request Salary Advance",
        },
      ],
    };
  }

  // 4. Expense Claim Intent
  if (p.includes("expense") || p.includes("reimburse") || p.includes("claim bill") || p.includes("receipt")) {
    const categories = await getExpenseCategories(tenantId);
    const catList = categories.map((c) => `• ${c.name} (Cap: ₹${c.monthlyCap})`).join("\n");

    return {
      reply: `You can submit expense claims for business-related expenditures. Available reimbursement categories include:\n\n${catList}\n\nReceipts are required for all claims above ₹100. Approved expenses are processed with your monthly payroll.`,
      intentDetected: "claim_expense",
      cards: [
        {
          type: "expense_claim",
          title: "Expense Reimbursement",
          summary: "File a claim with invoice/receipt attachment",
          data: { categories },
          actionUrl: "/hrms/employee/expenses",
          buttonLabel: "File New Expense Claim",
        },
      ],
    };
  }

  // 5. Kudos / Peer Recognition Intent
  if (p.includes("kudos") || p.includes("praise") || p.includes("recognize") || p.includes("shoutout")) {
    const { getRemainingMonthlyAllowance } = await import("@/services/hrm/engage/kudos");
    const allowance = await getRemainingMonthlyAllowance(tenantId, userId);

    return {
      reply: `Celebrate your colleagues with peer kudos! You have **${allowance.remainingPoints} points** remaining in your monthly allowance to reward teamwork, innovation, and leadership.`,
      intentDetected: "send_kudos",
      cards: [
        {
          type: "kudos_recommendation",
          title: "Peer Recognition Wall",
          summary: `${allowance.remainingPoints} monthly kudos points ready to give`,
          data: allowance,
          actionUrl: "/hrms/engage",
          buttonLabel: "Give Kudos to Colleague",
        },
      ],
    };
  }

  // 6. General HR Assistant Answer
  return {
    reply: `I am your Skora HR Assistant. I can assist you with:\n\n• **Checking leave balance** ("What is my leave balance?")\n• **Finding who is out today** ("Who is on leave today?")\n• **Earned Wage Access** ("Check my advance salary limit")\n• **Expense Reimbursements** ("How do I claim travel expenses?")\n• **Peer Kudos** ("Give kudos to a coworker")\n• **Company policies & attendance**\n\nHow can I help you today?`,
    intentDetected: "general_inquiry",
  };
}

export async function getChatHistory(
  tenantId: string,
  userId: string
): Promise<AIChatMessage[]> {
  return aiChatMessagesService.findManyInTenant(tenantId, {
    where: [{ field: "userId", op: "==", value: userId }],
    orderByField: "createdAt",
    orderByDirection: "asc",
  });
}

export async function saveChatMessage(
  tenantId: string,
  data: {
    userId: string;
    role: AIChatMessage["role"];
    content: string;
    metadata?: Record<string, unknown>;
  }
): Promise<AIChatMessage> {
  return aiChatMessagesService.create({
    ...data,
    tenantId,
  } as any);
}

export interface AISuggestion {
  type: "leave_balance" | "attendance_insight" | "policy_reminder" | "task_reminder";
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
}

export async function getAISuggestions(
  tenantId: string,
  userId: string
): Promise<AISuggestion[]> {
  const suggestions: AISuggestion[] = [];

  const balances = await leaveBalancesService.findManyInTenant(tenantId, {
    where: [{ field: "userId", op: "==", value: userId }],
  });

  for (const balance of balances) {
    if (balance.remaining <= 2 && balance.remaining > 0) {
      suggestions.push({
        type: "leave_balance",
        title: "Low Leave Balance",
        description: `You have only ${balance.remaining} days of ${balance.leaveTypeName || "leave"} remaining.`,
        priority: "medium",
      });
    }
  }

  return suggestions;
}
