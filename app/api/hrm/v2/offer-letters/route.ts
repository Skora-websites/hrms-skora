import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mongo-helper";
import crypto from "crypto";
import { sendOfferLetterEmail } from "@/lib/email";

/**
 * GET /api/hrm/v2/offer-letters
 * - CEO/super_admin: sees all requests
 * - Employee/manager: sees only own requests
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const db = await getDb();
    if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });

    const query: any = {};
    if (auth.role === "employee" || auth.role === "manager") {
      query.userId = auth.userId;
    }

    const letters = await db
      .collection("offerLetters")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const data = letters.map((l: any) => ({
      id: l._id.toString(),
      userId: l.userId,
      employeeName: l.employeeName,
      employeeEmail: l.employeeEmail,
      department: l.department,
      designation: l.designation,
      status: l.status,
      salary: l.salary || null,
      joiningDate: l.joiningDate || null,
      offerContent: l.offerContent || null,
      password: auth.role === "super_admin" ? l.password : undefined,
      createdAt: l.createdAt,
      releasedAt: l.releasedAt || null,
      downloadedAt: l.downloadedAt || null,
      emailSent: l.emailSent === true,
    }));

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/offer-letters error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/hrm/v2/offer-letters
 * Employee/manager creates an offer letter request
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const db = await getDb();
    if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });

    // Unlimited requests are allowed. If the user already has a pending or
    // drafted letter, re-notify the CEO instead of hard-blocking the request.
    const existing = await db.collection("offerLetters").findOne({
      userId: auth.userId,
      status: { $in: ["pending_ceo", "drafted"] },
    });

    // Get user details
    const { ObjectId } = require("mongodb");
    const user = await db.collection("users").findOne({ _id: new ObjectId(auth.userId) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const doc = {
      userId: auth.userId,
      employeeName: user.displayName || user.firstName || user.email,
      employeeEmail: user.email,
      department: user.department || "",
      designation: user.designation || "",
      status: "pending_ceo",
      salary: null,
      joiningDate: null,
      offerContent: null,
      password: crypto.randomBytes(8).toString("hex"),
      createdAt: new Date(),
      releasedAt: null,
      downloadedAt: null,
    };

    if (existing) {
      // Existing pending request: just re-notify the CEO so it gets reviewed.
      await db.collection("notifications").insertOne({
        userId: existing.userId,
        title: "Offer Letter Request Reminder",
        body: doc.employeeName + " has re-requested their pending offer letter.",
        type: "offer_letter",
        isRead: false,
        referenceType: "offer_letter",
        referenceId: (existing._id as { toString(): string }).toString(),
        createdAt: new Date(),
      });
      return NextResponse.json({ data: { id: (existing._id as { toString(): string }).toString(), status: existing.status, reminder: true } });
    }

    const result = await db.collection("offerLetters").insertOne(doc);

    // Notify CEO/super_admin
    const ceos = await db.collection("users").find({ role: "super_admin", tenantId: "default" }).toArray();
    for (const ceo of ceos) {
      await db.collection("notifications").insertOne({
        userId: ceo._id.toString(),
        title: "New Offer Letter Request",
        body: doc.employeeName + " (" + doc.employeeEmail + ") has requested an offer letter.",
        type: "offer_letter",
        isRead: false,
        referenceType: "offer_letter",
        referenceId: result.insertedId.toString(),
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ data: { id: result.insertedId.toString(), status: "pending_ceo" } }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/offer-letters error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PATCH /api/hrm/v2/offer-letters?id=xxx
 * CEO reviews, drafts, and releases offer letter
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    if (auth.role !== "super_admin") {
      return NextResponse.json({ error: "Only CEO can update offer letters" }, { status: 403 });
    }

    const db = await getDb();
    if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id parameter required" }, { status: 400 });

    const body = await request.json();
    const updateData: any = { updatedAt: new Date() };

    if (body.salary !== undefined) updateData.salary = body.salary;
    if (body.joiningDate !== undefined) updateData.joiningDate = body.joiningDate;
    if (body.offerContent !== undefined) updateData.offerContent = body.offerContent;
    if (body.status) {
      updateData.status = body.status;
      if (body.status === "released") updateData.releasedAt = new Date();
    }

    const { ObjectId } = require("mongodb");
    const result = await db.collection("offerLetters").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Offer letter not found" }, { status: 404 });
    }

    // Notify employee when released
    if (body.status === "released") {
      const letter = await db.collection("offerLetters").findOne({ _id: new ObjectId(id) });
      if (letter) {
        await db.collection("notifications").insertOne({
          userId: letter.userId,
          title: "Offer Letter Released!",
          body: "Your offer letter has been released by the CEO. You can now download it.",
          type: "offer_letter",
          isRead: false,
          referenceType: "offer_letter",
          referenceId: id,
          createdAt: new Date(),
        });

        // Send email if auto-email is enabled in settings
        try {
          const settingsDoc = await db.collection("settings").findOne({ key: "offer_letter_config" });
          const cfg = settingsDoc?.settings || {};
          if (cfg.autoEmailOnRelease && letter.employeeEmail) {
            const origin = request.headers.get("origin") || "https://skora-nextjs.vercel.app";
            const emailSent = await sendOfferLetterEmail({
              to: letter.employeeEmail,
              employeeName: letter.employeeName,
              salary: letter.salary,
              joiningDate: letter.joiningDate,
              companyName: cfg.companyName || "SKORA",
              companyTagline: cfg.companyTagline || "",
              signatoryName: cfg.signatoryName || "Vishal Srivastava",
              signatoryTitle: cfg.signatoryTitle || "",
              downloadUrl: origin + "/hrms/employee/offer-letters",
              subjectTemplate: cfg.emailSubject || undefined,
              bodyTemplate: cfg.emailBody || undefined,
            });
            // Record whether the email actually fired so the CEO can see it.
            await db.collection("offerLetters").updateOne(
              { _id: new ObjectId(id) },
              { $set: { emailSentAt: emailSent ? new Date() : null, emailSent: emailSent === true } }
            );
          }
        } catch (emailErr) {
          console.warn("Offer letter email failed:", emailErr);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PATCH /api/hrm/v2/offer-letters error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
