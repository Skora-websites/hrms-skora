import "server-only";
import { getDb, ObjectId } from "@/lib/db/mysql";
import type { TicketCategory } from "./types";

export const DEFAULT_TICKET_CATEGORIES: Array<Omit<TicketCategory, "id">> = [
  { name: "IT Support", code: "it_support", description: "Hardware, software, VPN, access requests", color: "#3b82f6", isActive: true },
  { name: "HR & People Ops", code: "hr_people", description: "Policies, leaves, onboarding, letters", color: "#ec4899", isActive: true },
  { name: "Payroll & Compensation", code: "payroll", description: "Payslips, tax deductions, reimbursements, salary advances", color: "#10b981", isActive: true },
  { name: "Engineering & Dev", code: "engineering", description: "Bug reports, deployment, API issues, infrastructure", color: "#8b5cf6", isActive: true },
  { name: "Marketing & Design", code: "marketing", description: "Brand collateral, website updates, creatives", color: "#f59e0b", isActive: true },
  { name: "Sales & Client Ops", code: "sales", description: "Client query escalations, billing, contracts", color: "#06b6d4", isActive: true },
  { name: "General Administration", code: "general", description: "Office facilities, cafeteria, supplies", color: "#64748b", isActive: true },
];

export async function getTicketCategories(tenantId: string = "default"): Promise<TicketCategory[]> {
  const db = await getDb();
  if (!db) return [];

  let list = await db.collection("ticket_categories").find({ tenantId, isActive: true }).toArray();

  if (!list || list.length === 0) {
    // Seed defaults automatically
    for (const cat of DEFAULT_TICKET_CATEGORIES) {
      await db.collection("ticket_categories").insertOne({
        ...cat,
        tenantId,
        createdAt: new Date(),
      } as any);
    }
    list = await db.collection("ticket_categories").find({ tenantId, isActive: true }).toArray();
  }

  return (list as any[]).map((c) => ({
    id: c._id ? c._id.toString() : String(c.id),
    name: c.name,
    code: c.code,
    description: c.description,
    color: c.color,
    isActive: c.isActive ?? true,
  }));
}

export async function createTicketCategory(
  tenantId: string = "default",
  data: { name: string; code?: string; description?: string; color?: string }
): Promise<TicketCategory> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const code = (data.code || data.name.toLowerCase().replace(/[^a-z0-9]/g, "_")).slice(0, 32);

  const doc = {
    tenantId,
    name: data.name,
    code,
    description: data.description || "",
    color: data.color || "#3b82f6",
    isActive: true,
    createdAt: new Date(),
  };

  const res = await db.collection("ticket_categories").insertOne(doc as any);
  return {
    id: res.insertedId.toString(),
    ...doc,
  };
}
