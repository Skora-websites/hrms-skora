import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import {
  createTicketTransfer,
  decideTicketTransfer,
  getPendingTransfersForDepartment,
} from "@/services/hrm/tickets/transfer-service";
import { getDb, ObjectId } from "@/lib/db/mysql";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const userDoc = await db.collection("users").findOne({
      _id: ObjectId.isValid(auth.userId) ? new ObjectId(auth.userId) : auth.userId,
    });
    const userDept = userDoc?.department || userDoc?.departmentName || "General";

    const transfers = await getPendingTransfersForDepartment(auth.tenantId, userDept);
    return NextResponse.json({ success: true, data: transfers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch transfers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const body = await request.json();
    if (!body.ticketId || !body.toDepartment) {
      return NextResponse.json(
        { error: "ticketId and toDepartment are required" },
        { status: 400 }
      );
    }

    const userDoc = await db.collection("users").findOne({
      _id: ObjectId.isValid(auth.userId) ? new ObjectId(auth.userId) : auth.userId,
    });
    const userName = userDoc?.displayName || userDoc?.name || userDoc?.email || "Staff";

    const transfer = await createTicketTransfer(auth.tenantId, {
      ticketId: body.ticketId,
      fromUserId: auth.userId,
      fromUserName: userName,
      toDepartment: body.toDepartment,
      toUserId: body.toUserId || null,
      toUserName: body.toUserName || null,
      direction: body.direction || "manager",
      priority: body.priority || "medium",
      note: body.note || "",
    });

    return NextResponse.json({ success: true, data: transfer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create transfer" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const body = await request.json();
    if (!body.transferId || !body.decision) {
      return NextResponse.json(
        { error: "transferId and decision ('approved' | 'rejected') are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const userDoc = await db.collection("users").findOne({
      _id: ObjectId.isValid(auth.userId) ? new ObjectId(auth.userId) : auth.userId,
    });
    const userName = userDoc?.displayName || userDoc?.name || userDoc?.email || "Manager";

    const result = await decideTicketTransfer(
      auth.tenantId,
      body.transferId,
      body.decision,
      {
        userId: auth.userId,
        userName,
      },
      body.rejectionReason
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to decide transfer" },
      { status: 500 }
    );
  }
}
