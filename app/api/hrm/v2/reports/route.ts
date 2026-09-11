import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest } from "@/lib/api-handler";
import { getDb } from "@/lib/db/mongo-helper";

// Server-side HR reports. Output shape mirrors the client report builders:
// { title, summary: [{label, value, color}], tableData: rows, columns: [{key,label}], filename }

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;
  if (auth.role === "employee") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const type = new URL(request.url).searchParams.get("type") || "comprehensive";
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const year = new Date().getFullYear();
  const istToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const monthKey = istToday.slice(0, 7); // YYYY-MM

  if (type === "attendance" || type === "comprehensive") {
    const rows = await db.collection("attendance").find({ date: { $regex: "^" + year } }).toArray();
    const present = rows.filter((r) => r.status === "PRESENT").length;
    const late = rows.filter((r) => r.status === "LATE").length;
    const halfDay = rows.filter((r) => r.status === "HALF_DAY").length;
    const todayRows = rows.filter((r) => r.date === istToday);
    const avgHours = rows.length > 0
      ? (rows.reduce((s, r) => s + (Number(r.workHours) || 0), 0) / rows.filter((r) => r.workHours > 0).length || 0).toFixed(1)
      : "0";
    const report = {
      title: "Attendance Report " + year,
      summary: [
        { label: "Records (YTD)", value: String(rows.length), color: "text-primary" },
        { label: "Present", value: String(present), color: "text-success" },
        { label: "Late", value: String(late), color: "text-warning" },
        { label: "Half Day", value: String(halfDay), color: "text-danger" },
        { label: "Punched In Today", value: String(todayRows.length), color: "text-info" },
        { label: "Avg Work Hours", value: String(avgHours) + "h", color: "text-info" },
      ],
      tableData: rows.slice(0, 200).map((r) => ({
        date: r.date, employee: r.userName, status: r.status,
        in: r.punchInTime ? new Date(r.punchInTime).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) : "—",
        out: r.punchOutTime ? new Date(r.punchOutTime).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) : "—",
        hours: r.workHours ?? "—", location: r.workLocation || "—",
      })),
      columns: [
        { key: "date" as const, label: "Date" },
        { key: "employee" as const, label: "Employee" },
        { key: "status" as const, label: "Status" },
        { key: "in" as const, label: "Punch In" },
        { key: "out" as const, label: "Punch Out" },
        { key: "hours" as const, label: "Hours" },
        { key: "location" as const, label: "Location" },
      ],
      filename: `attendance-report-${year}`,
    };
    if (type === "attendance") return NextResponse.json({ data: report });
    return NextResponse.json({ data: [report] });
  }

  if (type === "leaves" || type === "comprehensive") {
    const rows = await db.collection("leave_requests").find({}).limit(500).toArray();
    const byStatus = (s: string) => rows.filter((r) => r.status === s).length;
    const report = {
      title: "Leave Requests Report",
      summary: [
        { label: "Total", value: String(rows.length), color: "text-primary" },
        { label: "Pending", value: String(byStatus("pending")), color: "text-warning" },
        { label: "Approved", value: String(byStatus("approved")), color: "text-success" },
        { label: "Rejected", value: String(byStatus("rejected")), color: "text-danger" },
      ],
      tableData: rows.slice(0, 200).map((r) => ({
        employee: r.userName || r.employeeName || "—", type: r.leaveType || "—",
        from: r.startDate || "—", to: r.endDate || "—", days: r.days ?? "—", status: r.status || "—",
      })),
      columns: [
        { key: "employee" as const, label: "Employee" },
        { key: "type" as const, label: "Type" },
        { key: "from" as const, label: "From" },
        { key: "to" as const, label: "To" },
        { key: "days" as const, label: "Days" },
        { key: "status" as const, label: "Status" },
      ],
      filename: "leaves-report-" + year,
    };
    if (type === "leaves") return NextResponse.json({ data: report });
    return NextResponse.json({ data: [report] });
  }

  if (type === "payroll") {
    const rows = await db.collection("payroll_runs").find({}).sort({ createdAt: -1 }).limit(100).toArray();
    return NextResponse.json({ data: {
      title: "Payroll Runs Report",
      summary: [
        { label: "Runs", value: String(rows.length), color: "text-primary" },
        { label: "Completed", value: String(rows.filter((r) => r.status === "completed").length), color: "text-success" },
        { label: "Processing", value: String(rows.filter((r) => r.status === "processing").length), color: "text-warning" },
      ],
      tableData: rows.map((r) => ({
        period: r.period || r.name || "—", status: r.status || "—",
        employees: r.employeeCount ?? "—", gross: r.grossTotal ?? "—", net: r.netTotal ?? "—",
      })),
      columns: [
        { key: "period" as const, label: "Period" },
        { key: "status" as const, label: "Status" },
        { key: "employees" as const, label: "Employees" },
        { key: "gross" as const, label: "Gross" },
        { key: "net" as const, label: "Net" },
      ],
      filename: "payroll-report-" + year,
    } });
  }

  if (type === "holidays") {
    const rows = await db.collection("holidays").find({}).sort({ date: 1 }).toArray();
    return NextResponse.json({ data: {
      title: "Holiday Calendar " + year,
      summary: [
        { label: "Holidays", value: String(rows.length), color: "text-primary" },
        { label: "Upcoming", value: String(rows.filter((r) => r.date && String(r.date) >= istToday).length), color: "text-info" },
      ],
      tableData: rows.map((r) => ({ name: r.name || "—", date: String(r.date || "—"), type: r.type || "—" })),
      columns: [
        { key: "name" as const, label: "Holiday" },
        { key: "date" as const, label: "Date" },
        { key: "type" as const, label: "Type" },
      ],
      filename: "holidays-report-" + year,
    } });
  }

  if (type === "recruitment") {
    const [jobs, applications] = await Promise.all([
      db.collection("recruitment_jobs").find({}).toArray(),
      db.collection("recruitment_applications").find({}).toArray(),
    ]);
    return NextResponse.json({ data: {
      title: "Recruitment Report",
      summary: [
        { label: "Open Jobs", value: String(jobs.filter((j) => j.status === "open").length), color: "text-primary" },
        { label: "Applications", value: String(applications.length), color: "text-info" },
      ],
      tableData: jobs.slice(0, 100).map((j) => ({
        title: j.title || "—", department: j.department || "—", status: j.status || "—",
        applicants: applications.filter((a) => a.jobId === j.id || a.jobId === String(j._id)).length,
      })),
      columns: [
        { key: "title" as const, label: "Job" },
        { key: "department" as const, label: "Department" },
        { key: "status" as const, label: "Status" },
        { key: "applicants" as const, label: "Applicants" },
      ],
      filename: "recruitment-report-" + year,
    } });
  }

  return badRequest("Invalid type. Use: attendance, leaves, payroll, holidays, recruitment, comprehensive");
}, { label: "HR Reports" });
