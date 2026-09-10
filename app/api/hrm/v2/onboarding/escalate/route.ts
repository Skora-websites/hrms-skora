import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mongo-helper";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    // Find the employee's onboarding record
    const onboardingRecord = await db.collection("employee_onboarding_tasks").findOne({
      userId: auth.userId,
      status: { $in: ["rejected", "pending"] },
    });

    if (!onboardingRecord) {
      return NextResponse.json({ data: { message: "No pending onboarding to escalate" } });
    }

    // Mark as escalated
    await db.collection("employee_onboarding_tasks").updateOne(
      { _id: onboardingRecord._id },
      {
        $set: {
          status: "escalated",
          escalatedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    // Create a notification for super admin
    const superAdmins = await db.collection("users").find({ role: "super_admin" }).toArray();
    for (const admin of superAdmins) {
      await db.collection("notifications").insertOne({
        userId: admin._id.toString(),
        title: "Onboarding Escalation",
        body: `Employee ${auth.userId} missed the 48-hour document re-upload deadline.`,
        type: "escalation",
        isRead: false,
        referenceType: "onboarding",
        referenceId: onboardingRecord._id.toString(),
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ data: { message: "Escalation recorded" } });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/onboarding/escalate error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
