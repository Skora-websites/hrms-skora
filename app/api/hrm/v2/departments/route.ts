import { NextRequest, NextResponse } from "next/server";
import { getDepartments } from "@/services/hrm/organization";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mysql";

const FALLBACK_DEPARTMENTS = [
  "Development",
  "Engineering",
  "Software Development",
  "Quality Assurance",
  "IT Infrastructure",
  "DevOps",
  "Technical Support",
  "Human Resources",
  "Finance & Accounts",
  "Sales & Marketing",
  "Product Management",
  "Customer Success",
  "Operations",
  "Legal & Compliance",
  "Administration",
];

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("organizationId") || undefined;

    let depts: Array<{ id: string; name: string }> = [];

    try {
      const fromService = await getDepartments(tenantId, orgId);
      if (Array.isArray(fromService) && fromService.length > 0) {
        depts = fromService.map((d: any) => ({
          id: String(d.id || d._id || d.name),
          name: String(d.name || ""),
        }));
      }
    } catch {
      // fallback
    }

    if (depts.length === 0) {
      try {
        const db = await getDb();
        if (db) {
          const users = await db.collection("users").find({ status: { $ne: "archived" } }).toArray();
          const deptSet = new Set<string>();
          users.forEach((u: any) => {
            const d = String(u.department || u.departmentName || "").trim();
            if (d) deptSet.add(d);
          });
          FALLBACK_DEPARTMENTS.forEach((d) => deptSet.add(d));
          depts = Array.from(deptSet).map((name) => ({ id: name, name }));
        }
      } catch {
        depts = FALLBACK_DEPARTMENTS.map((name) => ({ id: name, name }));
      }
    }

    return NextResponse.json({ success: true, data: depts });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
