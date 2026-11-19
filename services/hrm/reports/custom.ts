import "server-only";
import {
  customReportDefinitionsService,
  hrmUsersService,
  attendanceService,
  leaveRequestsService,
  payrollTransactionsService,
  expensesService,
  performanceReviewsService,
} from "@/lib/hrm/firestore";
import type { CustomReportDefinition } from "@/types";

// ══════════════════════════════════════════════════════════════════
// Custom Report Builder & Analytics Engine
// ══════════════════════════════════════════════════════════════════

export const REPORT_DOMAINS_SCHEMA: Record<
  CustomReportDefinition["baseDomain"],
  { label: string; fields: Array<{ key: string; label: string; type: "string" | "number" | "date" }> }
> = {
  employees: {
    label: "Employee Master Directory",
    fields: [
      { key: "displayName", label: "Full Name", type: "string" },
      { key: "email", label: "Email Address", type: "string" },
      { key: "department", label: "Department", type: "string" },
      { key: "designation", label: "Designation", type: "string" },
      { key: "role", label: "System Role", type: "string" },
      { key: "status", label: "Employment Status", type: "string" },
      { key: "dateOfJoining", label: "Joining Date", type: "date" },
    ],
  },
  attendance: {
    label: "Attendance & Punctuality Records",
    fields: [
      { key: "userName", label: "Employee Name", type: "string" },
      { key: "date", label: "Punch Date", type: "date" },
      { key: "status", label: "Status (Present/Late/Half-day)", type: "string" },
      { key: "checkIn", label: "Check-in Time", type: "string" },
      { key: "checkOut", label: "Check-out Time", type: "string" },
      { key: "workDuration", label: "Work Duration (Hours)", type: "number" },
    ],
  },
  leaves: {
    label: "Leave Applications & Approvals",
    fields: [
      { key: "userName", label: "Employee Name", type: "string" },
      { key: "leaveType", label: "Leave Type", type: "string" },
      { key: "startDate", label: "Start Date", type: "date" },
      { key: "endDate", label: "End Date", type: "date" },
      { key: "days", label: "Total Days", type: "number" },
      { key: "status", label: "Approval Status", type: "string" },
    ],
  },
  payroll: {
    label: "Payroll Register & Disbursements",
    fields: [
      { key: "employeeName", label: "Employee Name", type: "string" },
      { key: "periodMonth", label: "Payroll Month", type: "string" },
      { key: "grossSalary", label: "Gross Salary", type: "number" },
      { key: "totalDeductions", label: "Total Deductions", type: "number" },
      { key: "netPayable", label: "Net Payable", type: "number" },
      { key: "status", label: "Disbursement Status", type: "string" },
    ],
  },
  expenses: {
    label: "Expense Claims & Reimbursements",
    fields: [
      { key: "userName", label: "Employee Name", type: "string" },
      { key: "category", label: "Category", type: "string" },
      { key: "amount", label: "Amount (INR)", type: "number" },
      { key: "date", label: "Expense Date", type: "date" },
      { key: "status", label: "Claim Status", type: "string" },
    ],
  },
  performance: {
    label: "Performance Appraisals & Reviews",
    fields: [
      { key: "userName", label: "Employee Name", type: "string" },
      { key: "reviewCycle", label: "Review Cycle", type: "string" },
      { key: "overallRating", label: "Overall Rating", type: "number" },
      { key: "status", label: "Review Status", type: "string" },
    ],
  },
};

export const DEFAULT_REPORT_TEMPLATES: Array<Omit<CustomReportDefinition, "id" | "createdAt" | "updatedAt">> = [
  {
    reportName: "Headcount by Department & Designation",
    description: "Overview of all active employees across functional teams",
    baseDomain: "employees",
    selectedColumns: [
      { key: "displayName", label: "Full Name" },
      { key: "email", label: "Email Address" },
      { key: "department", label: "Department" },
      { key: "designation", label: "Designation" },
      { key: "status", label: "Status" },
    ],
    filters: [{ field: "status", operator: "equals", value: "active" }],
    sortBy: "department",
    sortDirection: "asc",
    isScheduled: false,
    tenantId: "default",
  },
  {
    reportName: "Monthly Payroll Disbursement Register",
    description: "Detailed salary components, deductions and net payable per employee",
    baseDomain: "payroll",
    selectedColumns: [
      { key: "employeeName", label: "Employee Name" },
      { key: "periodMonth", label: "Payroll Month" },
      { key: "grossSalary", label: "Gross Salary" },
      { key: "totalDeductions", label: "Total Deductions" },
      { key: "netPayable", label: "Net Payable" },
      { key: "status", label: "Status" },
    ],
    filters: [],
    sortBy: "netPayable",
    sortDirection: "desc",
    isScheduled: true,
    scheduleFrequency: "monthly",
    recipients: ["finance@example.com"],
    tenantId: "default",
  },
];

export async function getReportDefinitions(tenantId: string = "default"): Promise<CustomReportDefinition[]> {
  let list = await customReportDefinitionsService.findManyInTenant(tenantId, {
    orderByField: "reportName",
    orderByDirection: "asc",
  });

  if (!list || list.length === 0) {
    for (const t of DEFAULT_REPORT_TEMPLATES) {
      await customReportDefinitionsService.createInTenant(tenantId, t as any);
    }
    list = await customReportDefinitionsService.findManyInTenant(tenantId);
  }

  return list;
}

export async function createReportDefinition(
  tenantId: string = "default",
  data: Partial<CustomReportDefinition>
): Promise<CustomReportDefinition> {
  return customReportDefinitionsService.createInTenant(tenantId, {
    ...data,
    selectedColumns: data.selectedColumns || [],
    filters: data.filters || [],
    isScheduled: Boolean(data.isScheduled),
  } as any);
}

export async function updateReportDefinition(
  id: string,
  data: Partial<CustomReportDefinition>
): Promise<CustomReportDefinition | null> {
  return customReportDefinitionsService.update(id, data);
}

export async function deleteReportDefinition(id: string): Promise<boolean> {
  return customReportDefinitionsService.delete(id);
}

// ── Report Execution & Data Projection ────────────────────────────

export interface ReportExecutionResult {
  reportName: string;
  baseDomain: string;
  columns: Array<{ key: string; label: string }>;
  rows: Record<string, any>[];
  totalCount: number;
  csvContent: string;
}

export async function executeCustomReport(
  tenantId: string = "default",
  reportDef: Partial<CustomReportDefinition>
): Promise<ReportExecutionResult> {
  const domain = reportDef.baseDomain || "employees";
  let rawData: any[] = [];

  switch (domain) {
    case "employees":
      rawData = await hrmUsersService.findManyInTenant(tenantId);
      break;
    case "attendance":
      rawData = await attendanceService.findManyInTenant(tenantId);
      break;
    case "leaves":
      rawData = await leaveRequestsService.findManyInTenant(tenantId);
      break;
    case "payroll":
      rawData = await payrollTransactionsService.findManyInTenant(tenantId);
      break;
    case "expenses":
      rawData = await expensesService.findManyInTenant(tenantId);
      break;
    case "performance":
      rawData = await performanceReviewsService.findManyInTenant(tenantId);
      break;
    default:
      rawData = [];
  }

  // Normalize display properties
  rawData = rawData.map((d: any) => {
    return {
      ...d,
      displayName: d.displayName || d.name || `${d.firstName || ""} ${d.lastName || ""}`.trim() || d.email,
      userName: d.userName || d.employeeName || d.displayName || d.name || d.email,
      employeeName: d.employeeName || d.userName || d.displayName || d.name || d.email,
      department: d.department || d.departmentName || "General",
      designation: d.designation || d.designationName || "Employee",
    };
  });

  // Apply filters
  let filtered = rawData;
  if (Array.isArray(reportDef.filters) && reportDef.filters.length > 0) {
    filtered = filtered.filter((row: any) => {
      return reportDef.filters!.every((f: any) => {
        const val = row[f.field];
        if (f.operator === "equals") return String(val).toLowerCase() === String(f.value).toLowerCase();
        if (f.operator === "not_equals") return String(val).toLowerCase() !== String(f.value).toLowerCase();
        if (f.operator === "contains") return String(val).toLowerCase().includes(String(f.value).toLowerCase());
        if (f.operator === "greater_than") return Number(val) > Number(f.value);
        if (f.operator === "less_than") return Number(val) < Number(f.value);
        return true;
      });
    });
  }

  // Sort
  if (reportDef.sortBy) {
    const key = reportDef.sortBy;
    const dir = reportDef.sortDirection === "desc" ? -1 : 1;
    filtered.sort((a, b) => {
      const va = a[key] ?? "";
      const vb = b[key] ?? "";
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }

  // Project columns
  const columns: Array<{ key: string; label: string }> = (reportDef.selectedColumns && reportDef.selectedColumns.length > 0
    ? reportDef.selectedColumns
    : (REPORT_DOMAINS_SCHEMA[domain]?.fields || [{ key: "id", label: "ID" }])) as any;

  const projectedRows = filtered.map((item) => {
    const row: Record<string, any> = {};
    columns.forEach((col: any) => {
      let v = item[col.key];
      if (v instanceof Date) v = v.toISOString().slice(0, 10);
      row[col.key] = v ?? "-";
    });
    return row;
  });

  // Generate CSV string
  const headerLine = columns.map((c: any) => `"${c.label.replace(/"/g, '""')}"`).join(",");
  const dataLines = projectedRows.map((r) =>
    columns.map((c: any) => `"${String(r[c.key] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  const csvContent = [headerLine, ...dataLines].join("\n");

  return {
    reportName: reportDef.reportName || "Custom Report",
    baseDomain: domain,
    columns,
    rows: projectedRows,
    totalCount: projectedRows.length,
    csvContent,
  };
}
