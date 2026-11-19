import { NextRequest, NextResponse } from "next/server";
import { requireHrLevel, isErrorResponse } from "@/lib/api-auth";
import { createEmployee } from "@/services/hrm/employee";
import { triggerWorkflowEvent } from "@/services/hrm/workflow";
import { getDb } from "@/lib/db/mongo-helper";
import bcrypt from "bcryptjs";
import { normalizeRole } from "@/lib/rbac";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireHrLevel();
    if (isErrorResponse(auth)) return auth;

    const tenantId = auth.tenantId || "default";
    const body = await request.json();
    const rows = Array.isArray(body.employees) ? body.employees : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: "employees array is required" }, { status: 400 });
    }

    if (rows.length > 500) {
      return NextResponse.json({ error: "Maximum 500 employees per bulk import batch" }, { status: 400 });
    }

    const db = await getDb();
    const results = {
      imported: 0,
      failed: 0,
      errors: [] as { row: number; email: string; reason: string }[],
      created: [] as any[],
    };

    const defaultPasswordHash = await bcrypt.hash("Employee@123", 10);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const email = String(row.email || "").trim().toLowerCase();

      if (!email || !email.includes("@")) {
        results.failed++;
        results.errors.push({ row: i + 1, email: email || "missing", reason: "Invalid or missing email" });
        continue;
      }

      // Check existing email
      if (db) {
        const existing = await db.collection("users").findOne({ email });
        if (existing) {
          results.failed++;
          results.errors.push({ row: i + 1, email, reason: "Email already exists" });
          continue;
        }
      }

      const firstName = row.firstName || row.name?.split(" ")[0] || "Employee";
      const lastName = row.lastName || row.name?.split(" ").slice(1).join(" ") || "";
      const displayName = row.displayName || `${firstName} ${lastName}`.trim() || email;
      const role = normalizeRole(row.role || "employee");

      try {
        const emp = await createEmployee(tenantId, {
          email,
          displayName,
          name: displayName,
          firstName,
          lastName,
          phone: row.phone || "",
          department: row.department || "General",
          departmentName: row.department || "General",
          designation: row.designation || "Staff",
          designationName: row.designation || "Staff",
          role,
          status: row.status || "active",
          joiningDate: row.joiningDate || new Date().toISOString().split("T")[0],
          reportingManager: row.reportingManager || "",
          passwordHash: defaultPasswordHash,
          password: "Employee@123",
          mustChangePassword: true,
        } as any);

        results.imported++;
        results.created.push({ id: emp.id, email, name: displayName });

        // Trigger workflow
        triggerWorkflowEvent(
          "employee.created",
          {
            id: emp.id,
            userId: emp.id,
            employeeName: displayName,
            employeeEmail: email,
            department: row.department || "General",
            designation: row.designation || "Staff",
            reportingManager: row.reportingManager || "",
          },
          tenantId
        ).catch(() => {});
      } catch (err: any) {
        results.failed++;
        results.errors.push({ row: i + 1, email, reason: err.message || "Failed to create" });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Successfully imported ${results.imported} employees (${results.failed} failed).`,
    });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/employees/bulk error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
