import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getTicketById } from "@/services/hrm/tickets/ticket-service";
import { getDb, ObjectId } from "@/lib/db/mysql";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const userDoc = await db.collection("users").findOne({
      _id: ObjectId.isValid(auth.userId) ? new ObjectId(auth.userId) : auth.userId,
    });
    const userDept = userDoc?.department || userDoc?.departmentName || "General";

    const ticket = await getTicketById(auth.tenantId, id, {
      userId: auth.userId,
      role: auth.role,
      department: userDept,
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: ticket });
  } catch (error: any) {
    const status = error.message?.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to fetch ticket" },
      { status }
    );
  }
}
