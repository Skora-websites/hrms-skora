import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mongo-helper";
import crypto from "crypto";

/**
 * GET /api/hrm/v2/offer-letters/download?id=xxx
 * Downloads a password-protected PDF offer letter.
 * Employee can only download their own released offer letters.
 * Loads company branding from offer_letter_config settings.
 *
 * Render pipeline:
 *   1. pdfkit pass — page layout: letterhead, ref no., body, details table,
 *      signature block, per-page footers.
 *   2. pdf-lib pass — true diagonal background watermark + circular company
 *      seal stamped under the existing content on every page.
 *   3. Encryption pass — password-protect via pdf-lib-plus-encrypt.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const db = await getDb();
    if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id parameter required" }, { status: 400 });

    const { ObjectId } = require("mongodb");
    const letter = await db.collection("offerLetters").findOne({ _id: new ObjectId(id) });
    if (!letter) return NextResponse.json({ error: "Offer letter not found" }, { status: 404 });

    // Only the owner or CEO can download
    if (auth.role !== "super_admin" && letter.userId !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only released letters can be downloaded
    if (letter.status !== "released") {
      return NextResponse.json({ error: "Offer letter has not been released yet" }, { status: 400 });
    }

    // Load offer letter settings for branding
    const settingsDoc = await db.collection("settings").findOne({ key: "offer_letter_config" });
    const cfg = settingsDoc?.settings || {};

    const companyName = cfg.companyName || "SKORA";
    const companyTagline = cfg.companyTagline || "Innovation · Excellence · Growth";
    const companyAddress = cfg.companyAddress || "";
    const companyPhone = cfg.companyPhone || "";
    const companyEmail = cfg.companyEmail || "";
    const signatoryName = cfg.signatoryName || "Vishal Srivastava";
    const signatoryTitle = cfg.signatoryTitle || "CEO, Skora";
    const templateBody = cfg.templateBody || "We are delighted to extend this offer of employment to you. After careful consideration of your qualifications and experience, we believe you will be a valuable addition to our team.";
    const templateFooter = cfg.templateFooter || "We look forward to welcoming you to the team.\n\nPlease confirm your acceptance of this offer by signing and returning this letter.";
    const watermark = cfg.pdfWatermark || "";
    const password = letter.password || "offer2026";

    // Reference number: stable, professional, derived from the letter id.
    const refNo = `REF/${new Date(letter.createdAt || Date.now()).getFullYear()}/${String(letter._id).slice(-8).toUpperCase()}`;
    const issueDate = new Date(letter.releasedAt || letter.createdAt || Date.now()).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

    // ════════ Pass 1: pdfkit layout ════════
    const PDFDocument = (await import("pdfkit")).default;

    const buffers: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margin: 56,
      bufferPages: true,
      info: {
        Title: `Offer Letter - ${letter.employeeName}`,
        Author: companyName,
        Subject: "Offer of Employment",
      },
    });

    const stream = doc as unknown as NodeJS.ReadableStream;
    stream.on("data", (chunk: Buffer) => buffers.push(chunk));
    const pdfReady = new Promise<Buffer>((resolve) => {
      stream.on("end", () => resolve(Buffer.concat(buffers)));
    });

    const leftMargin = doc.page.margins.left;
    const contentWidth = doc.page.width - leftMargin - doc.page.margins.right;

    // ── Letterhead ──
    doc.fontSize(24).font("Helvetica-Bold").fillColor("#1e3a8a").text(companyName, { align: "center" });
    doc.moveDown(0.15);
    doc.fontSize(10).font("Helvetica").fillColor("#4b5563").text(companyTagline, { align: "center" });
    const contactLine = [companyAddress, companyPhone, companyEmail].filter(Boolean).join("  |  ");
    if (contactLine) {
      doc.moveDown(0.15);
      doc.fontSize(8).fillColor("#6b7280").text(contactLine, { align: "center" });
    }
    doc.moveDown(0.4);
    const ruleY = doc.y;
    doc.moveTo(leftMargin, ruleY).lineTo(leftMargin + contentWidth, ruleY).strokeColor("#1e3a8a").lineWidth(2).stroke();
    doc.moveDown(0.3);
    const thinRuleY = doc.y;
    doc.moveTo(leftMargin, thinRuleY).lineTo(leftMargin + contentWidth, thinRuleY).strokeColor("#93c5fd").lineWidth(0.75).stroke();
    doc.moveDown(1);

    // ── Ref No + Date row ──
    const refDateY = doc.y;
    doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#374151").text(`Ref. No.: ${refNo}`, leftMargin, refDateY, { width: contentWidth * 0.6 });
    doc.fontSize(9.5).font("Helvetica").fillColor("#374151").text(`Date: ${issueDate}`, leftMargin + contentWidth * 0.6, refDateY, { width: contentWidth * 0.4, align: "right" });
    doc.moveDown(1.4);

    // ── Confidentiality note ──
    doc.fontSize(8).font("Helvetica-Oblique").fillColor("#9ca3af").text("PRIVATE & CONFIDENTIAL", { align: "left" });
    doc.moveDown(0.8);

    // ── Salutation ──
    doc.fontSize(11).font("Helvetica").fillColor("#111827").text(`Dear ${letter.employeeName},`);
    doc.moveDown(0.5);
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#111827").text("Subject: Offer of Employment");
    doc.moveDown(0.2);
    doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + 180, doc.y).strokeColor("#1e3a8a").lineWidth(1).stroke();
    doc.moveDown(0.6);

    // ── Body ──
    doc.fontSize(10.5).font("Helvetica").fillColor("#1f2937").text(templateBody, { lineGap: 4, align: "justify" });
    doc.moveDown(0.6);
    doc.fontSize(10.5).font("Helvetica").fillColor("#1f2937").text(
      "The terms of your employment are summarized below:",
      { lineGap: 4 }
    );
    doc.moveDown(0.6);

    // ── Details table ──
    const rowH = 24;
    const details: [string, string][] = [
      ["Employee Name", letter.employeeName],
      ["Email", letter.employeeEmail],
      ["Department", letter.department || "N/A"],
      ["Designation", letter.designation || "N/A"],
    ];
    if (letter.salary) details.push(["Annual Salary", `Rs. ${Number(letter.salary).toLocaleString("en-IN")}`]);
    if (letter.joiningDate) details.push(["Joining Date", String(letter.joiningDate)]);

    const tableTop = doc.y;
    details.forEach(([label, value], i) => {
      const y = tableTop + i * rowH;
      if (i % 2 === 0) {
        doc.save();
        doc.rect(leftMargin - 6, y - 3, contentWidth + 12, rowH).fill("#f3f6fb");
        doc.restore();
      }
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#4b5563").text(label, leftMargin, y + 3, { width: 150 });
      if (label === "Annual Salary") {
        doc.fontSize(10.5).font("Helvetica-Bold").fillColor("#047857").text(value, leftMargin + 160, y + 3);
      } else {
        doc.fontSize(10).font("Helvetica").fillColor("#111827").text(value, leftMargin + 160, y + 3);
      }
    });
    doc.y = tableTop + details.length * rowH + 8;
    doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + contentWidth, doc.y).strokeColor("#d1d5db").lineWidth(0.75).stroke();
    doc.moveDown(0.8);

    // ── Custom CEO content ──
    if (letter.offerContent) {
      doc.fontSize(10.5).font("Helvetica-Oblique").fillColor("#1f2937").text(letter.offerContent, { lineGap: 3, indent: 12 });
      doc.moveDown(0.6);
    }

    // ── Footer text ──
    doc.fontSize(10.5).font("Helvetica").fillColor("#1f2937").text(templateFooter, { lineGap: 4, align: "justify" });
    doc.moveDown(1.6);

    // ── Signature block (left: acceptance; right: signatory) ──
    const sigY = doc.y;
    doc.fontSize(10).font("Helvetica").fillColor("#374151").text("Warm regards,", leftMargin, sigY);
    doc.moveDown(2.2);
    const sigLineY = doc.y;
    doc.moveTo(leftMargin, sigLineY).lineTo(leftMargin + 170, sigLineY).strokeColor("#9ca3af").lineWidth(0.75).stroke();
    doc.moveDown(0.25);
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#111827").text(signatoryName, leftMargin, doc.y);
    doc.fontSize(9.5).font("Helvetica").fillColor("#4b5563").text(signatoryTitle, leftMargin, doc.y + 2);
    doc.fontSize(9.5).font("Helvetica").fillColor("#4b5563").text(companyName, leftMargin, doc.y + 2);

    // Acceptance column on the right
    const acceptX = leftMargin + contentWidth * 0.58;
    doc.fontSize(9).font("Helvetica").fillColor("#6b7280").text("Accepted & agreed:", acceptX, sigY);
    doc.moveDown(2.2);
    doc.moveTo(acceptX, doc.y).lineTo(acceptX + 170, doc.y).strokeColor("#9ca3af").lineWidth(0.75).stroke();
    doc.moveDown(0.25);
    doc.fontSize(8.5).font("Helvetica").fillColor("#9ca3af").text(`${letter.employeeName} — Date: ____________`, acceptX, doc.y);

    doc.end();
    const pdfBuffer = await pdfReady;

    // ════════ Pass 2: pdf-lib-plus-encrypt — background watermark + circular seal ════════
    // (pdf-lib-plus-encrypt embeds a full pdf-lib API, so no extra dependency.)
    let finalBytes: Uint8Array = new Uint8Array(pdfBuffer);
    try {
      const { PDFDocument: PdfLib, rgb, degrees, StandardFonts } = await import("pdf-lib-plus-encrypt");
      const pdfDoc = await PdfLib.load(pdfBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();

      for (const page of pages) {
        const { width, height } = page.getSize();

        // Diagonal background watermark, drawn first so all page content
        // renders on top of it (true background, unlike the pdfkit overlay).
        if (watermark) {
          const textWidth = font.widthOfTextAtSize(watermark, 52);
          page.drawText(watermark, {
            x: width / 2 - (textWidth / 2) * Math.cos(Math.PI / 4),
            y: height / 2 - (textWidth / 2) * Math.sin(Math.PI / 4),
            size: 52,
            font,
            color: rgb(0.92, 0.94, 0.97),
            rotate: degrees(45),
          });
        }

        // Circular company seal, bottom-right, under the content layer.
        const sealCenterX = width - 105;
        const sealCenterY = 118;
        const sealRadius = 52;
        page.drawCircle({
          x: sealCenterX,
          y: sealCenterY,
          size: sealRadius,
          borderColor: rgb(0.20, 0.33, 0.66),
          borderWidth: 1.6,
          opacity: 0,
        });
        page.drawCircle({
          x: sealCenterX,
          y: sealCenterY,
          size: sealRadius - 6,
          borderColor: rgb(0.20, 0.33, 0.66),
          borderWidth: 0.8,
          opacity: 0,
        });
        const sealFontSize = Math.max(7, Math.min(11, Math.floor((sealRadius * 1.2) / Math.max(4, companyName.length / 3))));
        const nameWidth = font.widthOfTextAtSize(companyName, sealFontSize);
        page.drawText(companyName, {
          x: sealCenterX - nameWidth / 2,
          y: sealCenterY + 8,
          size: sealFontSize,
          font,
          color: rgb(0.20, 0.33, 0.66),
        });
        const subLabel = "AUTHORIZED SEAL";
        const subWidth = font.widthOfTextAtSize(subLabel, 6);
        page.drawText(subLabel, {
          x: sealCenterX - subWidth / 2,
          y: sealCenterY - 8,
          size: 6,
          font,
          color: rgb(0.35, 0.45, 0.70),
        });
      }

      finalBytes = await pdfDoc.save();
    } catch (sealErr) {
      console.warn("Offer letter watermark/seal pass failed, using base PDF:", sealErr);
    }

    // ════════ Pass 3: encryption ════════
    const { PDFDocument: PdfLibDocument } = await import("pdf-lib-plus-encrypt");
    const encryptedDoc = await PdfLibDocument.load(finalBytes);
    await encryptedDoc.encrypt({
      userPassword: password,
      ownerPassword: password + "-owner",
      permissions: {
        printing: "highResolution",
        modifying: false,
        copying: false,
        annotating: false,
        fillingForms: false,
        contentAccessibility: true,
        documentAssembly: false,
      },
    });
    const encryptedBytes = await encryptedDoc.save({ useObjectStreams: false });

    // Record the download (best-effort).
    try {
      await db.collection("offerLetters").updateOne(
        { _id: new ObjectId(id) },
        { $set: { downloadedAt: new Date() } }
      );
    } catch { /* non-fatal */ }

    return new NextResponse(Buffer.from(encryptedBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="offer-letter-${letter.employeeName.replace(/\s+/g, "-")}.pdf"`,
        "X-Offer-Letter-Password": password,
      },
    });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/offer-letters/download error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
