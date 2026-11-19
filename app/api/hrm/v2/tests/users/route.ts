import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mysql";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    if (auth.role === "employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const query: any = { status: { $ne: "archived" } };
    // If manager, default to employees in their department or allow all if permitted
    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department");
    if (department && department !== "All" && department !== "General") {
      query.department = department;
    }

    const docs = await db
      .collection("users")
      .find(query)
      .sort({ name: 1 })
      .toArray();

    const users = (docs as any[]).map((u) => ({
      id: u._id ? u._id.toString() : String(u.id),
      name: u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Employee",
      email: u.email || "",
      department: u.department || u.departmentName || "General",
      role: u.role || "employee",
    }));

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch candidate users" },
      { status: 500 }
    );
  }
}
