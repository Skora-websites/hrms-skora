import hrmsAccountRolesData from "@/data/hrms-account-roles.json";

// ══════════════════════════════════════════════════════════════════
// Navigation Items (CRM + HRM)
// ══════════════════════════════════════════════════════════════════

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  group: NavGroup;
}

export type NavGroup = "overview" | "hrm" | "operations" | "lifecycle" | "crm" | "system";

export const NAV_GROUPS: Record<NavGroup, string> = {
  overview: "Overview",
  hrm: "HR Management",
  operations: "Operations",
  lifecycle: "Employee Lifecycle",
  crm: "CRM",
  system: "System",
};

export const NAV_GROUP_ORDER: NavGroup[] = ["overview", "hrm", "operations", "lifecycle", "crm", "system"];

/**
 * Groups that should render as expandable/collapsible sub-menus.
 * Users can click the group header to toggle visibility of child items.
 */
export const EXPANDABLE_GROUPS: NavGroup[] = ["hrm"];

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/hrms/dashboard", icon: "LayoutDashboard", group: "overview" },
  // ── HRM Module ──
  { title: "Employees", href: "/hrms/employees", icon: "Users", group: "hrm" },
  { title: "Attendance", href: "/hrms/attendance", icon: "Clock", group: "hrm" },
  { title: "Leaves", href: "/hrms/leaves", icon: "CalendarDays", group: "hrm" },
  { title: "Payroll", href: "/hrms/payroll", icon: "DollarSign", group: "hrm" },
  { title: "Organization", href: "/hrms/organization", icon: "Building2", group: "hrm" },
  // ── Operations ──
  { title: "Projects", href: "/hrms/projects", icon: "ClipboardList", group: "operations" },
  { title: "Assets", href: "/hrms/assets", icon: "Package", group: "operations" },
  { title: "Documents", href: "/hrms/documents", icon: "FileText", group: "operations" },
  { title: "Engage", href: "/hrms/engage", icon: "MessageSquare", group: "operations" },
  // ── Employee Lifecycle ──
  { title: "Onboarding", href: "/hrms/onboarding", icon: "UserCheck", group: "lifecycle" },
  { title: "Exit Mgmt", href: "/hrms/exit", icon: "LogOut", group: "lifecycle" },
  { title: "Holidays", href: "/hrms/holidays", icon: "Sun", group: "lifecycle" },
  { title: "Probation", href: "/hrms/probation", icon: "ClipboardList", group: "lifecycle" },
  // ── CRM / Reports ──
  { title: "Reports", href: "/hrms/reports", icon: "BarChart3", group: "crm" },
  { title: "Recruitment", href: "/hrms/recruitment", icon: "UserCheck", group: "hrm" },
  { title: "Performance", href: "/hrms/performance", icon: "TrendingUp", group: "hrm" },
  { title: "Tasks", href: "/hrms/tasks", icon: "ClipboardList", group: "hrm" },
  { title: "Tickets", href: "/hrms/tickets", icon: "MessageSquare", group: "hrm" },
  // ── System ──
  { title: "Settings", href: "/hrms/settings", icon: "Settings", group: "system" },
];

export const NAV_ITEMS_BY_ROLE: Record<string, NavItem[]> = {
  super_admin: [
    { title: "CEO Command Center", href: "/hrms/superadmin", icon: "LayoutDashboard", group: "overview" },
    { title: "Employees", href: "/hrms/hr-admin/employees", icon: "Users", group: "hrm" },
    { title: "Attendance", href: "/hrms/hr-admin/attendance", icon: "Clock", group: "hrm" },
    { title: "Onboarding", href: "/hrms/hr-admin/onboarding", icon: "UserCheck", group: "lifecycle" },
    { title: "Payroll", href: "/hrms/hr-admin/payroll", icon: "DollarSign", group: "hrm" },
    { title: "Projects", href: "/hrms/hr-admin/projects", icon: "ClipboardList", group: "operations" },
    { title: "Leave Policies", href: "/hrms/hr-admin/leave-policies", icon: "CalendarDays", group: "hrm" },
    { title: "Audit Logs", href: "/hrms/superadmin/audit-logs", icon: "FileText", group: "system" },
    { title: "Offer Letters", href: "/hrms/superadmin/offer-letters", icon: "FileText", group: "lifecycle" },
    { title: "Offer Letter Settings", href: "/hrms/superadmin/offer-letter-settings", icon: "Settings", group: "lifecycle" },
    { title: "Settings", href: "/hrms/superadmin/settings", icon: "Settings", group: "system" },
  ],
  hr_admin: [
    { title: "Employee Directory", href: "/hrms/hr-admin/employees", icon: "Users", group: "overview" },
    { title: "Onboarding", href: "/hrms/hr-admin/onboarding", icon: "UserCheck", group: "lifecycle" },
    { title: "Payroll", href: "/hrms/hr-admin/payroll", icon: "DollarSign", group: "hrm" },
    { title: "Projects & Budgets", href: "/hrms/hr-admin/projects", icon: "ClipboardList", group: "operations" },
    { title: "Leave Policies", href: "/hrms/hr-admin/leave-policies", icon: "CalendarDays", group: "hrm" },
    { title: "Attendance Master", href: "/hrms/hr-admin/attendance", icon: "Clock", group: "hrm" },
    { title: "Settings", href: "/hrms/hr-admin/settings", icon: "Settings", group: "system" },
  ],
  admin: [
    { title: "Employee Directory", href: "/hrms/hr-admin/employees", icon: "Users", group: "overview" },
    { title: "Onboarding", href: "/hrms/hr-admin/onboarding", icon: "UserCheck", group: "lifecycle" },
    { title: "Payroll", href: "/hrms/hr-admin/payroll", icon: "DollarSign", group: "hrm" },
    { title: "Projects & Budgets", href: "/hrms/hr-admin/projects", icon: "ClipboardList", group: "operations" },
    { title: "Leave Policies", href: "/hrms/hr-admin/leave-policies", icon: "CalendarDays", group: "hrm" },
    { title: "Attendance Master", href: "/hrms/hr-admin/attendance", icon: "Clock", group: "hrm" },
    { title: "Settings", href: "/hrms/hr-admin/settings", icon: "Settings", group: "system" },
  ],
  manager: [
    { title: "Team Overview", href: "/hrms/manager", icon: "LayoutDashboard", group: "overview" },
    { title: "Project Tasks", href: "/hrms/manager/projects", icon: "ClipboardList", group: "operations" },
    { title: "Timesheets", href: "/hrms/manager/timesheets", icon: "FileText", group: "hrm" },
    { title: "Approvals", href: "/hrms/manager/approvals", icon: "CheckCircle2", group: "hrm" },
    { title: "KPI Analytics", href: "/hrms/manager/analytics", icon: "TrendingUp", group: "hrm" },
    { title: "Settings", href: "/hrms/manager/settings", icon: "Settings", group: "system" },
  ],
  employee: [
    { title: "My Hub", href: "/hrms/employee", icon: "LayoutDashboard", group: "overview" },
    { title: "Projects & Tasks", href: "/hrms/employee/my-tasks", icon: "ClipboardList", group: "operations" },
    { title: "Leave Requests", href: "/hrms/employee/leaves", icon: "CalendarDays", group: "hrm" },
    { title: "Payslips", href: "/hrms/employee/payslips", icon: "DollarSign", group: "hrm" },
    { title: "My Performance", href: "/hrms/employee/performance", icon: "TrendingUp", group: "hrm" },
    { title: "Offer Letters", href: "/hrms/employee/offer-letters", icon: "FileText", group: "lifecycle" },
    { title: "Settings", href: "/hrms/employee/settings", icon: "Settings", group: "system" },
  ],
};

// ══════════════════════════════════════════════════════════════════
// HRM Constants
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// Super Admin Configuration
// ══════════════════════════════════════════════════════════════════

/**
 * Authoritative email → role map for the HRMS portal (see data/hrms-account-roles.json).
 * Login routes the dashboard by email: whoever signs in with one of these emails gets
 * exactly the role listed here (stored user records are synced to match). Emails not
 * listed keep whatever role is stored in the database.
 */
export interface HrmsAccountRole {
  role: "super_admin" | "hr_admin" | "manager" | "employee";
  displayName: string;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
  employeeCode: string;
}

export const HRMS_ACCOUNT_ROLES: Record<string, HrmsAccountRole> = hrmsAccountRolesData as Record<
  string,
  HrmsAccountRole
>;

/**
 * Emails that are automatically granted Super Admin. Derived from the authoritative
 * HRMS_ACCOUNT_ROLES map so the CEO dashboard belongs only to listed super admins.
 * Add extra super admins via the SUPER_ADMIN_EMAIL environment variable.
 */
export const SUPER_ADMIN_EMAILS: string[] = [
  ...Object.entries(HRMS_ACCOUNT_ROLES)
    .filter(([, account]) => account.role === "super_admin")
    .map(([email]) => email),
  process.env.SUPER_ADMIN_EMAIL || "",
].filter(Boolean);

// ══════════════════════════════════════════════════════════════════
// HRM Constants
// ══════════════════════════════════════════════════════════════════

export const EMPLOYMENT_TYPES = [
  { value: "permanent", label: "Permanent" },
  { value: "contract", label: "Contract" },
  { value: "probation", label: "Probation" },
  { value: "intern", label: "Intern" },
  { value: "trainee", label: "Trainee" },
] as const;

export const ATTENDANCE_STATUS = [
  { value: "present", label: "Present", color: "success" },
  { value: "absent", label: "Absent", color: "danger" },
  { value: "half_day", label: "Half Day", color: "warning" },
  { value: "late", label: "Late", color: "warning" },
  { value: "week_off", label: "Week Off", color: "info" },
  { value: "holiday", label: "Holiday", color: "info" },
  { value: "on_leave", label: "On Leave", color: "primary" },
] as const;

export const LEAVE_REQUEST_STATUS = [
  { value: "pending", label: "Pending", color: "warning" },
  { value: "approved", label: "Approved", color: "success" },
  { value: "rejected", label: "Rejected", color: "danger" },
  { value: "cancelled", label: "Cancelled", color: "muted" },
] as const;

export const EXIT_TYPES = [
  { value: "resignation", label: "Resignation" },
  { value: "termination", label: "Termination" },
  { value: "retirement", label: "Retirement" },
  { value: "mutual_separation", label: "Mutual Separation" },
] as const;

export const ASSET_CONDITIONS = [
  { value: "new", label: "New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "damaged", label: "Damaged" },
  { value: "disposed", label: "Disposed" },
] as const;

export const ASSET_STATUS_OPTIONS = [
  { value: "available", label: "Available", color: "success" },
  { value: "assigned", label: "Assigned", color: "primary" },
  { value: "under_maintenance", label: "Under Maintenance", color: "warning" },
  { value: "disposed", label: "Disposed", color: "danger" },
] as const;

// ── CRM constants (kept for backward compatibility) ────

export const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "New", color: "info" },
  { value: "contacted", label: "Contacted", color: "primary" },
  { value: "qualified", label: "Qualified", color: "info" },
  { value: "proposal", label: "Proposal", color: "warning" },
  { value: "negotiation", label: "Negotiation", color: "warning" },
  { value: "won", label: "Won", color: "success" },
  { value: "lost", label: "Lost", color: "danger" },
] as const;

export const DEAL_STAGES = [
  { value: "lead", label: "Lead In", color: "info" },
  { value: "qualified", label: "Qualified", color: "primary" },
  { value: "proposal", label: "Proposal", color: "warning" },
  { value: "negotiation", label: "Negotiation", color: "warning" },
  { value: "closed_won", label: "Closed Won", color: "success" },
  { value: "closed_lost", label: "Closed Lost", color: "danger" },
] as const;

export const LEAD_SOURCES = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "cold_call", label: "Cold Call" },
  { value: "email_campaign", label: "Email Campaign" },
  { value: "event", label: "Event" },
  { value: "partner", label: "Partner" },
  { value: "other", label: "Other" },
] as const;
