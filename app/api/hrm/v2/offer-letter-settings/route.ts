import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mongo-helper";

export interface OfferLetterSettings {
  // Company branding
  companyName: string;
  companyTagline: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;

  // CEO / Signatory
  signatoryName: string;
  signatoryTitle: string;

  // Template
  templateHeader: string;
  templateBody: string;
  templateFooter: string;

  // PDF settings
  pdfPasswordEnabled: boolean;
  pdfWatermark: string;

  // Email settings
  autoEmailOnRelease: boolean;
  emailSubject: string;
  emailBody: string;
}

const DEFAULT_SETTINGS: OfferLetterSettings = {
  companyName: "SKORA",
  companyTagline: "Innovation · Excellence · Growth",
  companyAddress: "",
  companyPhone: "",
  companyEmail: "",
  signatoryName: "Vishal Srivastava",
  signatoryTitle: "CEO, Skora",
  templateHeader: "",
  templateBody:
    "We are delighted to extend this offer of employment to you. After careful consideration of your qualifications and experience, we believe you will be a valuable addition to our team.",
  templateFooter:
    "We look forward to welcoming you to the team and are confident that your contributions will be instrumental in driving our success.\n\nPlease confirm your acceptance of this offer by signing and returning this letter.",
  pdfPasswordEnabled: true,
  pdfWatermark: "",
  autoEmailOnRelease: false,
  emailSubject: "Your Offer Letter from {{companyName}}",
  emailBody:
    "Dear {{employeeName}},\n\nYour offer letter has been released. Please find it attached.\n\nBest regards,\n{{signatoryName}}",
};

/**
 * GET /api/hrm/v2/offer-letter-settings
 * Retrieve offer letter configuration (CEO/HR only)
 */
export async function GET() {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    if (!["super_admin", "hr_admin", "admin"].includes(auth.role)) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ data: DEFAULT_SETTINGS });
    }

    const doc = await db
      .collection("settings")
      .findOne({ key: "offer_letter_config" });

    return NextResponse.json({ data: doc?.settings || DEFAULT_SETTINGS });
  } catch (error) {
    console.error("GET offer-letter-settings error:", error);
    return NextResponse.json(
      { data: DEFAULT_SETTINGS }
    );
  }
}

/**
 * POST /api/hrm/v2/offer-letter-settings
 * Save offer letter configuration (CEO only)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    if (auth.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only CEO can update offer letter settings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json(
        { error: "Missing settings" },
        { status: 400 }
      );
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 500 }
      );
    }

    await db.collection("settings").updateOne(
      { key: "offer_letter_config" },
      {
        $set: {
          key: "offer_letter_config",
          role: "super_admin",
          settings,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST offer-letter-settings error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Save failed" },
      { status: 500 }
    );
  }
}
