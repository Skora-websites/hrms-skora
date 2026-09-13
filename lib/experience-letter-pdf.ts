import "server-only";

/**
 * Experience letter PDF — issued when an employee's exit is completed.
 * Shared by:
 *  - GET /api/hrm/v2/exit/experience-letter (admin/self download)
 *  - the completion email attachment
 */

export interface ExperienceLetterInput {
  employeeName: string;
  employeeCode?: string | null;
  designation?: string | null;
  department?: string | null;
  joiningDate?: Date | string | null;
  lastWorkingDate?: Date | string | null;
}

export interface ExperienceLetterConfig {
  companyName?: string;
  companyTagline?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  signatoryName?: string;
  signatoryTitle?: string;
}

export async function generateExperienceLetterPdf(
  e: ExperienceLetterInput,
  cfg: ExperienceLetterConfig
): Promise<{ buffer: Buffer; filename: string }> {
  const companyName = cfg.companyName || "SKORA";
  const signatoryName = cfg.signatoryName || "Vishal Srivastava";
  const signatoryTitle = cfg.signatoryTitle || "CEO, Skora";
  const fmt = (d?: Date | string | null) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
      : null;

  const from = fmt(e.joiningDate) || "their date of joining";
  const to = fmt(e.lastWorkingDate) || new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  const tenure =
    e.joiningDate
      ? (() => {
          const start = new Date(e.joiningDate);
          const end = new Date(e.lastWorkingDate || Date.now());
          let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
          if (end.getDate() < start.getDate()) months -= 1;
          const years = Math.floor(months / 12);
          const rem = months % 12;
          const parts = [];
          if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`);
          if (rem > 0) parts.push(`${rem} month${rem > 1 ? "s" : ""}`);
          return parts.length ? parts.join(" and ") : "less than a month";
        })()
      : null;

  const PDFDocument = (await import("pdfkit")).default;
  const buffers: Buffer[] = [];
  const doc = new PDFDocument({ size: "A4", margin: 64, bufferPages: true, info: { Title: `Experience Letter - ${e.employeeName}`, Author: companyName } });
  const stream = doc as unknown as NodeJS.ReadableStream;
  stream.on("data", (chunk: Buffer) => buffers.push(chunk));
  const pdfReady = new Promise<Buffer>((resolve) => stream.on("end", () => resolve(Buffer.concat(buffers))));

  const leftMargin = doc.page.margins.left;
  const contentWidth = doc.page.width - leftMargin - doc.page.margins.right;

  // ── Letterhead ──
  doc.fontSize(24).font("Helvetica-Bold").fillColor("#1e3a8a").text(companyName, { align: "center" });
  doc.moveDown(0.15);
  doc.fontSize(10).font("Helvetica").fillColor("#4b5563").text(cfg.companyTagline || "Innovation · Excellence · Growth", { align: "center" });
  const contact = [cfg.companyAddress, cfg.companyPhone, cfg.companyEmail].filter(Boolean).join("  |  ");
  if (contact) {
    doc.moveDown(0.1);
    doc.fontSize(8).fillColor("#6b7280").text(contact, { align: "center" });
  }
  doc.moveDown(0.4);
  doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + contentWidth, doc.y).strokeColor("#1e3a8a").lineWidth(2).stroke();
  doc.moveDown(1.4);

  doc.fontSize(8).font("Helvetica-Oblique").fillColor("#9ca3af").text("TO WHOMSOEVER IT MAY CONCERN", { align: "left" });
  doc.moveDown(1.2);
  doc.fontSize(15).font("Helvetica-Bold").fillColor("#111827").text("EXPERIENCE LETTER", { align: "center" });
  doc.moveDown(0.4);
  doc.moveTo(leftMargin + contentWidth / 2 - 70, doc.y).lineTo(leftMargin + contentWidth / 2 + 70, doc.y).strokeColor("#1e3a8a").lineWidth(1).stroke();
  doc.moveDown(1.2);

  doc.fontSize(11).font("Helvetica").fillColor("#1f2937");
  doc.text(`Dear Sir/Madam,`, { lineGap: 4 });
  doc.moveDown(0.6);
  doc.text(`This is to certify that ${e.employeeName}${e.employeeCode ? ` (Employee Code: ${e.employeeCode})` : ""} was an employee of ${companyName}.`, { lineGap: 4, align: "justify" });
  doc.moveDown(0.5);
  doc.text(
    `${e.employeeName} served the organization as ${e.designation || "a valued team member"}${e.department ? ` in the ${e.department} department` : ""}, from ${from} to ${to}.${tenure ? ` During this tenure of approximately ${tenure},` : " During their tenure,"} we found them to be sincere, dedicated and professional in their conduct and responsibilities.`,
    { lineGap: 4, align: "justify" }
  );
  doc.moveDown(0.5);
  doc.text(
    `${e.employeeName} left the organization on completion of their notice period and their conduct during the employment period remained satisfactory. We wish them all the best in their future endeavours.`,
    { lineGap: 4, align: "justify" }
  );
  doc.moveDown(1.2);
  doc.text(`This letter has been issued on the request of the employee.`, { lineGap: 4 });
  doc.moveDown(2.4);

  // ── Signature ──
  doc.fontSize(10).font("Helvetica").fillColor("#374151").text("Warm regards,");
  doc.moveDown(2.2);
  doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + 170, doc.y).strokeColor("#9ca3af").lineWidth(0.75).stroke();
  doc.moveDown(0.25);
  doc.fontSize(11).font("Helvetica-Bold").fillColor("#111827").text(signatoryName);
  doc.fontSize(9.5).font("Helvetica").fillColor("#4b5563").text(signatoryTitle);
  doc.fontSize(9.5).font("Helvetica").fillColor("#4b5563").text(companyName);

  doc.moveDown(1);
  doc.fontSize(8).font("Helvetica-Oblique").fillColor("#9ca3af").text(
    `Issued on ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })} · Computer-generated document.`,
    { align: "center" }
  );

  doc.end();
  const buffer = await pdfReady;
  const filename = `experience-letter-${e.employeeName.replace(/\s+/g, "-")}.pdf`;
  return { buffer: Buffer.from(buffer), filename };
}
