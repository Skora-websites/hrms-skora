import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getEmployeeExitById } from "@/services/hrm/exit";
import { getDb } from "@/lib/db/mongo-helper";
import { ObjectId } from "mongodb";
import { generateExperienceLetterPdf } from "@/lib/experience-letter-pdf";

/**
 * GET /api/hrm/v2/exit/experience-letter?id=xxx
 * Downloads the experience letter for a completed exit.
 * Admins may fetch any; employees only their own.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id parameter required" }, { status: 400 });

    const exit: any = await getEmployeeExitById(id);
    if (!exit) return NextResponse.json({ error: "Exit record not found" }, { status: 404 });

    if (auth.role === "employee" && exit.userId !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (exit.status !== "completed") {
      return NextResponse.json({ error: "Experience letter is issued only after exit completion" }, { status: 400 });
    }

    const db = await getDb();
    if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });

    const user: any = await db.collection("users").findOne({ _id: new ObjectId(exit.userId) });
    if (!user) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const settingsDoc = await db.collection("settings").findOne({ key: "offer_letter_config" });
    const cfg = settingsDoc?.settings || {};

    const pdf = await generateExperienceLetterPdf(
      {
        employeeName: user.displayName || user.firstName || user.email,
        employeeCode: user.employeeCode,
        designation: user.designationName || user.designation,
        department: user.departmentName || user.department,
        joiningDate: user.joiningDate || null,
        lastWorkingDate: exit.lastWorkingDate || null,
      },
      cfg
    );

    return new NextResponse(new Uint8Array(pdf.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdf.filename}"`,
      },
    });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/exit/experience-letter error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
