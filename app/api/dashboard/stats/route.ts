import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongo-helper";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";

// Real aggregates from the CRM/HRMS collections — no fabricated numbers.
export const GET = async () => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const [leads, deals] = await Promise.all([
    db.collection("leads").find({}).toArray(),
    db.collection("deals").find({}).toArray(),
  ]);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyRevenue = Array(12).fill(0);
  const monthlyLeads = Array(12).fill(0);
  for (const deal of deals) {
    const created = deal.createdAt ? new Date(deal.createdAt) : null;
    if (created && created.getFullYear() === new Date().getFullYear()) {
      monthlyRevenue[created.getMonth()] += Number(deal.amount) || 0;
    }
  }
  for (const lead of leads) {
    const created = lead.createdAt ? new Date(lead.createdAt) : null;
    if (created && created.getFullYear() === new Date().getFullYear()) {
      monthlyLeads[created.getMonth()] += 1;
    }
  }

  const stageNames = ["Prospecting", "Qualification", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];
  const dealsByStage = stageNames.map((name) => {
    const stageDeals = deals.filter((d) => (d.stage || d.status) === name);
    return {
      name,
      count: stageDeals.length,
      value: stageDeals.length,
      amount: stageDeals.reduce((s, d) => s + (Number(d.amount) || 0), 0),
    };
  });

  const sourceNames = Array.from(new Set(leads.map((l) => l.source).filter(Boolean))) as string[];

  return NextResponse.json({
    totalRevenue: deals.reduce((s, d) => s + (Number(d.amount) || 0), 0),
    activeLeads: leads.filter((l) => l.status !== "closed" && l.status !== "lost").length,
    wonDeals: deals.filter((d) => (d.stage || d.status) === "Closed Won").length,
    conversionRate: leads.length > 0 ? Math.round((deals.length / leads.length) * 100) : 0,
    monthlyRevenue,
    monthlyLeads,
    dealsByStage,
    leadsBySource: sourceNames.map((name) => ({ name, value: leads.filter((l) => l.source === name).length })),
  });
};
