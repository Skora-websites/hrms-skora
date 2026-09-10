import "server-only";
import { aiChatMessagesService } from "@/lib/hrm/firestore";
import type { AIChatMessage } from "@/types";

// ══════════════════════════════════════════════════════════════════
// AI Chat Service
// ══════════════════════════════════════════════════════════════════

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

// ── AI Suggestions ─────────────────────────────────────

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

  // Check if user has leave balances running low
  const { leaveBalancesService } = await import("@/lib/hrm/firestore");
  const balances = await leaveBalancesService.findManyInTenant(tenantId, {
    where: [{ field: "userId", op: "==", value: userId }],
  });

  for (const balance of balances) {
    if (balance.remaining <= 2 && balance.remaining > 0) {
      suggestions.push({
        type: "leave_balance",
        title: "Low Leave Balance",
        description: `You have only ${balance.remaining} days of leave remaining. Plan your leaves accordingly.`,
        priority: "medium",
      });
    }
  }

  return suggestions;
}
