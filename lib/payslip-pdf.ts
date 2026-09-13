import "server-only";

/**
 * Payslip PDF generation — shared by:
 *  - GET /api/hrm/v2/payroll/payslip-pdf (employee/admin download)
 *  - payslip email attachment when HR marks a payslip as paid
 */

export interface PayslipPdfInput {
  userName: string;
  userEmail?: string | null;
  employeeCode?: string | null;
  department?: string | null;
  designation?: string | null;
  periodStart: Date | string;
  periodEnd: Date | string;
  grossPay: number;
  netPay: number;
  earnings?: Record<string, number> | null;
  deductions?: Record<string, number> | null;
  status?: string | null;
}

export interface PayslipPdfConfig {
  companyName?: string;
  companyTagline?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
}

export interface GeneratedPayslipPdf {
  buffer: Buffer;
  filename: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const inr = (n: number) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;

export async function generatePayslipPdf(
  p: PayslipPdfInput,
  cfg: PayslipPdfConfig
): Promise<GeneratedPayslipPdf> {
  const companyName = cfg.companyName || "SKORA";
  const companyTagline = cfg.companyTagline || "Innovation · Excellence · Growth";

  const start = new Date(p.periodStart);
  const end = new Date(p.periodEnd);
  const periodLabel = start.getMonth() === end.getMonth()
    ? `${MONTHS[start.getMonth()]} ${start.getFullYear()}`
    : `${MONTHS[start.getMonth()]} – ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;

  const isPaid = (p.status || "").toLowerCase() === "paid" || (p.status || "").toLowerCase() === "completed";

  const PDFDocument = (await import("pdfkit")).default;
  const buffers: Buffer[] = [];
  const doc = new PDFDocument({
    size: "A4",
    margin: 56,
    bufferPages: true,
    info: { Title: `Payslip ${periodLabel} - ${p.userName}`, Author: companyName, Subject: "Salary Slip" },
  });
  const stream = doc as unknown as NodeJS.ReadableStream;
  stream.on("data", (chunk: Buffer) => buffers.push(chunk));
  const pdfReady = new Promise<Buffer>((resolve) => stream.on("end", () => resolve(Buffer.concat(buffers))));

  const leftMargin = doc.page.margins.left;
  const contentWidth = doc.page.width - leftMargin - doc.page.margins.right;

  // ── Header ──
  doc.fontSize(22).font("Helvetica-Bold").fillColor("#1e3a8a").text(companyName, { align: "center" });
  doc.moveDown(0.15);
  doc.fontSize(9).font("Helvetica").fillColor("#4b5563").text(companyTagline, { align: "center" });
  const contact = [cfg.companyAddress, cfg.companyPhone, cfg.companyEmail].filter(Boolean).join("  |  ");
  if (contact) {
    doc.moveDown(0.1);
    doc.fontSize(7.5).fillColor("#6b7280").text(contact, { align: "center" });
  }
  doc.moveDown(0.4);
  doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + contentWidth, doc.y).strokeColor("#1e3a8a").lineWidth(2).stroke();
  doc.moveDown(0.7);
  doc.fontSize(14).font("Helvetica-Bold").fillColor("#111827").text("PAYSHEET / SALARY SLIP", { align: "center" });
  doc.fontSize(10).font("Helvetica").fillColor("#374151").text(periodLabel, { align: "center" });
  doc.moveDown(1);

  // ── Employee block ──
  const rows: [string, string][] = [
    ["Employee Name", p.userName],
    ["Employee Code", p.employeeCode || "—"],
    ["Department", p.department || "General"],
    ["Designation", p.designation || "Staff"],
  ];
  if (p.userEmail) rows.push(["Email", p.userEmail]);

  const rowH = 22;
  rows.forEach(([label, value], i) => {
    const y = doc.y;
    if (i % 2 === 0) {
      doc.save();
      doc.rect(leftMargin - 6, y - 3, contentWidth + 12, rowH).fill("#f3f6fb");
      doc.restore();
    }
    doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#4b5563").text(label, leftMargin, y + 3, { width: 170 });
    doc.fontSize(9.5).font("Helvetica").fillColor("#111827").text(value, leftMargin + 180, y + 3);
    doc.y = y + rowH;
  });
  doc.moveDown(0.8);

  // ── Earnings & Deductions side by side ──
  const colWidth = (contentWidth - 24) / 2;
  const earningsTop = doc.y;
  const earningsEntries = Object.entries(p.earnings || {});
  const deductionEntries = Object.entries(p.deductions || {});
  const maxRows = Math.max(earningsEntries.length, deductionEntries.length, 1);

  doc.fontSize(11).font("Helvetica-Bold").fillColor("#047857").text("EARNINGS", leftMargin, earningsTop, { width: colWidth });
  doc.fontSize(11).font("Helvetica-Bold").fillColor("#b91c1c").text("DEDUCTIONS", leftMargin + colWidth + 24, earningsTop, { width: colWidth });
  doc.moveDown(0.6);

  let y = doc.y;
  const listRow = (i: number, label: string, amount: string, x: number, w: number, amountColor: string) => {
    if (i % 2 === 0) {
      doc.save();
      doc.rect(x - 4, y - 2, w + 8, rowH).fill("#fafbfd");
      doc.restore();
    }
    doc.fontSize(9).font("Helvetica").fillColor("#374151").text(label, x, y + 3, { width: w - 80, ellipsis: true });
    doc.fontSize(9).font("Helvetica-Bold").fillColor(amountColor).text(amount, x + w - 80, y + 3, { width: 80, align: "right" });
  };

  for (let i = 0; i < maxRows; i++) {
    if (i < earningsEntries.length) listRow(i, earningsEntries[i][0], inr(earningsEntries[i][1]), leftMargin, colWidth, "#111827");
    if (i < deductionEntries.length) listRow(i, deductionEntries[i][0], inr(deductionEntries[i][1]), leftMargin + colWidth + 24, colWidth, "#111827");
    y += rowH;
  }
  doc.y = y + 8;

  // ── Totals ──
  const totalDeductions = deductionEntries.reduce((s, [, v]) => s + Number(v || 0), 0);
  const totals: [string, string, string][] = [
    ["Gross Pay", inr(p.grossPay), "#111827"],
    ["Total Deductions", `− ${inr(totalDeductions)}`, "#b91c1c"],
    ["NET PAY", inr(p.netPay), "#047857"],
  ];
  for (const [label, value, color] of totals) {
    const ty = doc.y;
    const highlight = label === "NET PAY";
    if (highlight) {
      doc.save();
      doc.rect(leftMargin - 6, ty - 4, contentWidth + 12, 30).fill("#ecfdf5");
      doc.restore();
    }
    doc.fontSize(highlight ? 12 : 10).font("Helvetica-Bold").fillColor(color).text(label, leftMargin, ty + 3);
    doc.fontSize(highlight ? 12 : 10).font("Helvetica-Bold").fillColor(color).text(value, leftMargin + contentWidth - 160, ty + 3, { width: 160, align: "right" });
    doc.y = ty + (highlight ? 32 : 24);
  }

  doc.moveDown(1.2);
  doc.fontSize(8).font("Helvetica-Oblique").fillColor("#9ca3af").text(
    `Generated on ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })} · Computer-generated document, no signature required.`,
    { align: "center" }
  );

  doc.end();
  const baseBuffer = await pdfReady;

  // Watermark pass (true background on every page) + nothing else.
  let finalBytes: Uint8Array = new Uint8Array(baseBuffer);
  try {
    const { PDFDocument: PdfLib, rgb, degrees, StandardFonts } = await import("pdf-lib-plus-encrypt");
    const pdfDoc = await PdfLib.load(baseBuffer);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    for (const page of pdfDoc.getPages()) {
      const { width, height } = page.getSize();
      const text = isPaid ? "PAID" : "DRAFT";
      const tw = font.widthOfTextAtSize(text, 88);
      page.drawText(text, {
        x: width / 2 - (tw / 2) * Math.cos(Math.PI / 4),
        y: height / 2 - (tw / 2) * Math.sin(Math.PI / 4),
        size: 88,
        font,
        color: isPaid ? rgb(0.88, 0.94, 0.9) : rgb(0.95, 0.93, 0.88),
        rotate: degrees(45),
      });
    }
    finalBytes = await pdfDoc.save();
  } catch (wmErr) {
    console.warn("Payslip watermark pass failed, using base PDF:", wmErr);
  }

  const safeName = p.userName.replace(/\s+/g, "-");
  const filename = `payslip-${safeName}-${periodLabel.replace(/[^A-Za-z0-9]+/g, "-")}.pdf`;
  return { buffer: Buffer.from(finalBytes), filename };
}
