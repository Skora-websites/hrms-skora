import "server-only";
import { getDb, ObjectId } from "@/lib/db/mysql";
import type { RoutingRule, TicketPriority } from "./types";

export interface RoutingEvaluationInput {
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  requesterId: string;
  department?: string;
}

export interface RoutingEvaluationResult {
  matchedRuleId?: string;
  matchedRuleName?: string;
  assignedDepartment?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  overridePriority?: TicketPriority;
}

const STOPWORDS = new Set([
  "the","a","an","and","or","but","is","are","was","were","be","been","being","i","you","we","they",
  "my","our","your","this","that","it","of","to","in","on","at","for","with","as","by","from","up",
  "down","out","over","under","again","further","then","once","here","there","when","where","why",
  "how","all","any","both","each","few","more","most","other","some","such","no","not","only","own",
  "same","so","than","too","very","can","will","just","should","now","please","help","issue","problem",
]);

function extractKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    )
  );
}

export async function evaluateRoutingRules(
  tenantId: string = "default",
  input: RoutingEvaluationInput
): Promise<RoutingEvaluationResult> {
  const db = await getDb();
  if (!db) return {};

  const rules = await db
    .collection("ticket_routing_rules")
    .find({ tenantId, status: "active" })
    .sort({ order: 1 })
    .toArray();

  if (!rules || rules.length === 0) {
    // Default fallback routing by category
    const cat = input.category.toLowerCase();
    if (cat.includes("it") || cat.includes("vpn") || cat.includes("hardware") || cat.includes("software")) {
      return { assignedDepartment: "IT" };
    }
    if (cat.includes("hr") || cat.includes("leave") || cat.includes("policy")) {
      return { assignedDepartment: "HR" };
    }
    if (cat.includes("payroll") || cat.includes("salary") || cat.includes("tax")) {
      return { assignedDepartment: "Finance" };
    }
    return { assignedDepartment: input.department || "General" };
  }

  const textKeywords = extractKeywords(`${input.title} ${input.description}`);
  const textKeywordsSet = new Set(textKeywords);

  for (const rawRule of rules as any[]) {
    const conditions = Array.isArray(rawRule.conditions) ? rawRule.conditions : [];
    if (conditions.length === 0) continue;

    let matchedCount = 0;

    for (const cond of conditions) {
      let isCondMatch = false;

      if (cond.field === "keyword") {
        const targetKw = String(cond.value || "").toLowerCase().trim();
        isCondMatch = textKeywordsSet.has(targetKw) || `${input.title} ${input.description}`.toLowerCase().includes(targetKw);
      } else if (cond.field === "category") {
        isCondMatch = input.category.toLowerCase() === String(cond.value || "").toLowerCase();
      } else if (cond.field === "priority") {
        isCondMatch = input.priority.toLowerCase() === String(cond.value || "").toLowerCase();
      } else if (cond.field === "requester") {
        isCondMatch = input.requesterId === String(cond.value);
      }

      if (isCondMatch) matchedCount++;
    }

    const isMatch = rawRule.matchType === "all"
      ? matchedCount === conditions.length
      : matchedCount > 0;

    if (isMatch) {
      const actions = Array.isArray(rawRule.actions) ? rawRule.actions : [];
      let assignedDepartment: string | undefined;
      let assignedUserId: string | undefined;
      let assignedUserName: string | undefined;
      let overridePriority: TicketPriority | undefined;

      for (const act of actions) {
        if (act.type === "assign_department") {
          assignedDepartment = act.value;
        } else if (act.type === "assign_user") {
          assignedUserId = act.value;
          assignedUserName = act.label;
        } else if (act.type === "set_priority") {
          overridePriority = act.value as TicketPriority;
        }
      }

      return {
        matchedRuleId: rawRule._id ? rawRule._id.toString() : rawRule.id,
        matchedRuleName: rawRule.name,
        assignedDepartment,
        assignedUserId,
        assignedUserName,
        overridePriority,
      };
    }
  }

  return { assignedDepartment: input.department || "General" };
}
