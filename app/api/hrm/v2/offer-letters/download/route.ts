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
 *   1. pdfkit pass — classic corporate letter layout: letterhead, Ref/Date,
 *      subject, justified body, black-bordered terms table, signature block,
 *      acceptance strip.
 *   2. pdf-lib pass — true diagonal background watermark + circular company
 *      seal stamped under the existing content on every page.
 *   3. Encryption pass — password-protect via pdf-lib-plus-encrypt
 *      (skipped when pdfPasswordEnabled is false in settings).
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

    const salaryFmt = letter.salary ? `Rs. ${Number(letter.salary).toLocaleString("en-IN")}` : "";
    // Template placeholders mirror lib/email.ts fill() so admins editing the
    // template get identical substitutions in the email and the PDF.
    const fill = (tpl: string) =>
      tpl
        .replace(/{{employeeName}}/g, letter.employeeName || "")
        .replace(/{{department}}/g, letter.department || "")
        .replace(/{{designation}}/g, letter.designation || "")
        .replace(/{{salary}}/g, salaryFmt)
        .replace(/{{joiningDate}}/g, letter.joiningDate || "")
        .replace(/{{companyName}}/g, companyName)
        .replace(/{{signatoryName}}/g, signatoryName);

    const templateBody = fill(cfg.templateBody || "We are delighted to extend this offer of employment to you. After careful consideration of your qualifications and experience, we believe you will be a valuable addition to our team.");
    const templateFooter = fill(cfg.templateFooter || "We look forward to welcoming you to the team.\n\nPlease confirm your acceptance of this offer by signing and returning this letter.");
    const watermark = cfg.pdfWatermark || "";
    const encryptEnabled = cfg.pdfPasswordEnabled !== false;
    const password = letter.password || crypto.randomBytes(8).toString("hex");

    // Persist a randomly generated password so it stays stable across downloads.
    if (!letter.password) {
      await db.collection("offerLetters").updateOne(
        { _id: letter._id },
        { $set: { password } }
      );
    }

    // Reference number: stable, professional, derived from the letter id.
    const refNo = `REF/${new Date(letter.createdAt || Date.now()).getFullYear()}/${String(letter._id).slice(-8).toUpperCase()}`;
    const issueDate = new Date(letter.releasedAt || letter.createdAt || Date.now()).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

    // ════════ Pass 1: pdfkit layout ════════
    const PDFDocument = (await import("pdfkit").then((m: any) => m.default || m));

    const buffers: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
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
    doc.fontSize(26).font("Helvetica-Bold").fillColor("#111827").text(companyName, { align: "center", characterSpacing: 6 });
    if (companyTagline) {
      doc.fontSize(8.5).font("Helvetica").fillColor("#4b5563").text(companyTagline.toUpperCase(), { align: "center", characterSpacing: 2 });
    }
    const contactLine = [companyAddress, companyPhone, companyEmail].filter(Boolean).join("  |  ");
    if (contactLine) {
      doc.moveDown(0.15);
      doc.fontSize(8).fillColor("#6b7280").text(contactLine, { align: "center" });
    }
    doc.moveDown(0.4);
    // Classic corporate double rule under the letterhead.
    let ruleY = doc.y;
    doc.moveTo(leftMargin, ruleY).lineTo(leftMargin + contentWidth, ruleY).strokeColor("#111827").lineWidth(2).stroke();
    ruleY += 3;
    doc.moveTo(leftMargin, ruleY).lineTo(leftMargin + contentWidth, ruleY).strokeColor("#111827").lineWidth(0.5).stroke();
    doc.y = ruleY + 16;

    // ── Ref No + Date row ──
    const refDateY = doc.y;
    doc.fontSize(9.5).font("Helvetica").fillColor("#374151").text(`Ref. No.: ${refNo}`, leftMargin, refDateY, { width: contentWidth * 0.6 });
    doc.fontSize(9.5).font("Helvetica").fillColor("#374151").text(`Date: ${issueDate}`, leftMargin + contentWidth * 0.6, refDateY, { width: contentWidth * 0.4, align: "right" });
    doc.y = refDateY + 14;

    // ── Confidentiality note ──
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#6b7280").text("PRIVATE & CONFIDENTIAL", { align: "left", characterSpacing: 1.5 });
    doc.moveDown(0.9);

    // ── Subject + salutation ──
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#111827").text("Sub: Offer of Employment");
    doc.moveDown(0.8);
    doc.fontSize(10.5).font("Helvetica").fillColor("#111827").text(`Dear ${letter.employeeName || "Candidate"},`);
    doc.moveDown(0.5);

    // ── Body paragraphs (justified) ──
    doc.fontSize(10.5).font("Helvetica").fillColor("#1f2937").text(templateBody, { lineGap: 4, align: "justify" });
    doc.moveDown(0.6);

    doc.fontSize(10.5).font("Helvetica").fillColor("#1f2937").text(
      `You will be joining the ${letter.department || "respective"} department as ${letter.designation || "a member of our team"}, and you will report to the designated manager for your function.`,
      { lineGap: 4, align: "justify" }
    );
    doc.moveDown(0.6);

    doc.fontSize(10.5).font("Helvetica").fillColor("#1f2937").text(
      letter.salary
        ? `Your annual compensation will be Rs. ${Number(letter.salary).toLocaleString("en-IN")}, and your date of joining will be ${String(letter.joiningDate || "communicated separately")}.`
        : `Your date of joining will be ${String(letter.joiningDate || "communicated separately")}.`,
      { lineGap: 4, align: "justify" }
    );
    doc.moveDown(0.6);

    doc.fontSize(10.5).font("Helvetica").fillColor("#1f2937").text(
      "The principal terms of your employment are summarized below:",
      { lineGap: 4 }
    );
    doc.moveDown(0.6);

    // ── Terms table (classic: black hairline borders, no zebra) ──
    const rowH = 26;
    const labelColW = 170;
    const details: [string, string][] = [
      ["Employee Name", letter.employeeName || ""],
      ["Email", letter.employeeEmail || ""],
      ["Department", letter.department || "N/A"],
      ["Designation", letter.designation || "N/A"],
    ];
    if (letter.salary) details.push(["Annual Salary (CTC)", `Rs. ${Number(letter.salary).toLocaleString("en-IN")}`]);
    if (letter.joiningDate) details.push(["Date of Joining", String(letter.joiningDate)]);

    const tableTop = doc.y;
    details.forEach(([label, value], i) => {
      const y = tableTop + i * rowH;
      doc.save();
      doc.rect(leftMargin, y, contentWidth, rowH).lineWidth(0.75).strokeColor("#111827").stroke();
      doc.moveTo(leftMargin + labelColW, y).lineTo(leftMargin + labelColW, y + rowH).strokeColor("#111827").lineWidth(0.75).stroke();
      doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#374151").text(label, leftMargin + 10, y + 8, { width: labelColW - 16 });
      doc.fontSize(9.5).font("Helvetica").fillColor("#111827").text(value, leftMargin + labelColW + 10, y + 8, { width: contentWidth - labelColW - 20, ellipsis: true, height: rowH - 10 });
      doc.restore();
    });
    doc.y = tableTop + details.length * rowH + 14;

    // ── Standard terms paragraph (probation etc.) ──
    doc.fontSize(10.5).font("Helvetica").fillColor("#1f2937").text(
      "Your employment will be governed by the company's policies applicable to your role. You will serve a probation period of six months, during which your employment may be confirmed subject to satisfactory performance and conduct.",
      { lineGap: 4, align: "justify" }
    );
    doc.moveDown(0.6);
    doc.fontSize(10.5).font("Helvetica").fillColor("#1f2937").text(templateFooter, { lineGap: 4, align: "justify" });
    doc.moveDown(1.6);

    // ── Closing + signature block ──
    doc.fontSize(10.5).font("Helvetica").fillColor("#1f2937").text("Yours sincerely,");
    doc.moveDown(2.4);
    const sigLineY = doc.y;
    doc.moveTo(leftMargin, sigLineY).lineTo(leftMargin + 190, sigLineY).strokeColor("#111827").lineWidth(0.75).stroke();
    doc.moveDown(0.25);
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#111827").text(signatoryName, leftMargin, doc.y);
    doc.fontSize(9.5).font("Helvetica").fillColor("#374151").text(signatoryTitle, leftMargin, doc.y + 2);
    doc.fontSize(9.5).font("Helvetica").fillColor("#374151").text(`For ${companyName}`, leftMargin, doc.y + 2);

    // ── Acceptance strip ──
    doc.moveDown(1.4);
    const accTop = doc.y;
    doc.save();
    doc.rect(leftMargin, accTop, contentWidth, 54).lineWidth(0.75).strokeColor("#111827").stroke();
    doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#111827").text("ACCEPTANCE", leftMargin + 10, accTop + 7, { characterSpacing: 1.5 });
    doc.fontSize(8.5).font("Helvetica").fillColor("#374151").text(
      `I, ${letter.employeeName || "________________"}, accept the terms of this offer.`,
      leftMargin + 10, accTop + 22
    );
    doc.fontSize(8.5).font("Helvetica").fillColor("#374151").text("Signature: ____________________          Date: ______________", leftMargin + 10, accTop + 38);
    doc.restore();

    doc.end();
    const pdfBuffer = await pdfReady;

    // ════════ Pass 2: pdf-lib — background watermark + circular seal ════════
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
          borderColor: rgb(0.2, 0.2, 0.2),
          borderWidth: 1.6,
          opacity: 0,
        });
        page.drawCircle({
          x: sealCenterX,
          y: sealCenterY,
          size: sealRadius - 6,
          borderColor: rgb(0.2, 0.2, 0.2),
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
          color: rgb(0.2, 0.2, 0.2),
        });
        const subLabel = "AUTHORIZED SEAL";
        const subWidth = font.widthOfTextAtSize(subLabel, 6);
        page.drawText(subLabel, {
          x: sealCenterX - subWidth / 2,
          y: sealCenterY - 8,
          size: 6,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      finalBytes = await pdfDoc.save();
    } catch (sealErr) {
      console.warn("Offer letter watermark/seal pass failed, using base PDF:", sealErr);
    }

    // ════════ Pass 3: encryption (skippable) ════════
    let responseBytes: Uint8Array = finalBytes;
    if (encryptEnabled) {
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
      responseBytes = await encryptedDoc.save({ useObjectStreams: false });
    }

    // Record the download (best-effort).
    try {
      await db.collection("offerLetters").updateOne(
        { _id: new ObjectId(id) },
        { $set: { downloadedAt: new Date() } }
      );
    } catch { /* non-fatal */ }

    return new NextResponse(Buffer.from(responseBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="offer-letter-${(letter.employeeName || "employee").replace(/\s+/g, "-")}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/offer-letters/download error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
