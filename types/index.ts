// ══════════════════════════════════════════════════════════════════
// CRM Domain Models (backward compat)
// ══════════════════════════════════════════════════════════════════

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: string;
  source?: string;
  ownerId?: string;
  ownerName?: string;
  owner?: string;
  value?: number;
  probability?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: string;
  industry?: string;
  lifetimeValue?: number;
  deals?: number;
  totalRevenue?: number;
  dealsCount?: number;
  lastContactDate?: Date;
  lastContact?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  customerId?: string;
  isPrimary: boolean;
  status?: string;
  lastContact?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  company?: string;
  customerId?: string;
  customerName?: string;
  ownerId?: string;
  ownerName?: string;
  owner?: string;
  probability: number;
  expectedCloseDate?: Date;
  closeDate?: Date;
  notes?: string;
  status: "open" | "won" | "lost";
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string;
  userId?: string;
  userName?: string;
  user?: string;
  relatedTo?: string;
  relatedType?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  assigneeId?: string;
  assigneeName?: string;
  assignee?: string;
  dueDate?: Date;
  relatedTo?: string;
  relatedType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardStats {
  totalRevenue: number;
  activeLeads: number;
  wonDeals: number;
  conversionRate: number;
  monthlyRevenue?: number[];
  monthlyLeads?: number[];
  dealsByStage?: { name: string; count: number; value: number; amount: number }[];
  leadsBySource?: { name: string; value: number }[];
  recentActivities?: Activity[];
  upcomingTasks?: Task[];
  // Employee stats
  totalEmployees?: number;
  activeEmployees?: number;
  probationEmployees?: number;
  newHiresThisMonth?: number;
}

export interface ThemeConfig {
  mode: "light" | "dark";
  isSidebarMini: boolean;
  sidebarMini: boolean;
  navbarFixed: boolean;
  primaryColor: string;
  sidebarType: "bg-white" | "bg-default" | "default" | "mini" | "hover";
}

export interface EmployeeProfile extends HRMUser {
  job?: EmployeeJob;
  detail?: EmployeeDetail;
}

// ══════════════════════════════════════════════════════════════════
// HRM Domain Models
// ══════════════════════════════════════════════════════════════════

// ── Common ─────────────────────────────────────────────

export type Timestamp = Date;

export interface BaseEntity {
  id: string;
  tenantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp | null;
}

// ── Multi-Tenancy ──────────────────────────────────────

export interface Tenant extends BaseEntity {
  name: string;
  domain: string;
  status: "active" | "inactive" | "suspended";
  email: string;
  website?: string;
  logo?: string;
  plan: "basic" | "standard" | "enterprise";
}

export interface TenantLanguage {
  id: string;
  tenantId: string;
  languageId: string;
  isDefault: boolean;
}

// ── Organization & Structure ───────────────────────────

export interface Organization extends BaseEntity {
  name: string;
  registrationNumber?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
  status: "active" | "inactive";
}

export interface Department extends BaseEntity {
  organizationId: string;
  name: string;
  code?: string;
  headUserId?: string;
  parentDepartmentId?: string | null;
  status: "active" | "inactive";
}

export interface Designation extends BaseEntity {
  organizationId: string;
  departmentId?: string;
  name: string;
  level?: number;
  grade?: string;
}

export interface BusinessUnit extends BaseEntity {
  organizationId: string;
  name: string;
  headUserId?: string;
}

export interface Location extends BaseEntity {
  organizationId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  isHeadOffice: boolean;
}

// ── Users & Employees ──────────────────────────────────

export interface HRMUser extends BaseEntity {
  email: string;
  emailVerified: boolean;
  displayName: string;
  firstName: string;
  lastName: string;
  phone?: string;
  photoURL?: string;
  role: UserRole;
  status: "active" | "inactive" | "disabled" | "probation" | "notice_period" | "terminated" | "resigned";
  loginStatus: "enabled" | "login_disabled";
  allowMobileLogin: boolean;
  lastLoginAt?: Timestamp;
  departmentId?: string;
  departmentName?: string;
  designationId?: string;
  designationName?: string;
  joiningDate?: Timestamp;
  employeeCode?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export type UserRole =
  | "super_admin"
  | "admin"
  | "hr"
  | "manager"
  | "employee"
  | "support_manager";

export interface EmployeeJob extends BaseEntity {
  userId: string;
  organizationId: string;
  departmentId?: string;
  designationId?: string;
  businessUnitId?: string;
  locationId?: string;
  reportingManagerId?: string;
  employeeCode: string;
  employmentType: "permanent" | "contract" | "probation" | "intern" | "trainee";
  joiningDate: Timestamp;
  probationEndDate?: Timestamp;
  confirmationDate?: Timestamp;
  resignationDate?: Timestamp;
  lastWorkingDate?: Timestamp;
  isManager: boolean;
  shiftId?: string;
  weeklyOffId?: string;
  status: "active" | "inactive" | "resigned" | "terminated";
}

export interface EmployeeDetail extends BaseEntity {
  userId: string;
  gender?: "male" | "female" | "other";
  dateOfBirth?: Timestamp;
  maritalStatus?: "single" | "married" | "divorced" | "widowed";
  bloodGroup?: string;
  nationality?: string;
  personalEmail?: string;
  personalPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  currentAddress?: string;
  permanentAddress?: string;
  bio?: string;
  about?: string;
}

export interface FamilyDetail extends BaseEntity {
  userId: string;
  name: string;
  relation: string;
  dateOfBirth?: Timestamp;
  phone?: string;
  occupation?: string;
  isDependent: boolean;
}

export interface PastEmployer extends BaseEntity {
  userId: string;
  companyName: string;
  designation: string;
  fromDate: Timestamp;
  toDate: Timestamp;
  salary?: number;
  reasonForLeaving?: string;
}

export interface EmployeeEducation extends BaseEntity {
  userId: string;
  degree: string;
  institution: string;
  fieldOfStudy: string;
  startDate: Timestamp;
  endDate: Timestamp;
  grade?: string;
  isHighestQualification: boolean;
}

export interface EmployeeCertification extends BaseEntity {
  userId: string;
  name: string;
  issuingOrganization: string;
  credentialId?: string;
  issueDate: Timestamp;
  expiryDate?: Timestamp;
  credentialURL?: string;
}

export interface EmployeeSalary extends BaseEntity {
  userId: string;
  payGroupId: string;
  effectiveFrom: Timestamp;
  effectiveTo?: Timestamp;
  components: SalaryComponentValue[];
  totalCtc: number;
  status: "active" | "inactive";
}

export interface SalaryComponentValue {
  componentId: string;
  name: string;
  type: "earning" | "deduction";
  amount: number;
  isTaxable: boolean;
}

export interface EmployeeSalaryHistory extends BaseEntity {
  userId: string;
  previousCtc: number;
  newCtc: number;
  changeReason: string;
  changedById: string;
  effectiveDate: Timestamp;
  components: SalaryComponentValue[];
}

export interface EmployeeJobEvent extends BaseEntity {
  userId: string;
  previousJobId?: string;
  newDepartmentId?: string;
  newDesignationId?: string;
  newLocationId?: string;
  newReportingManagerId?: string;
  effectiveDate: Timestamp;
  changeType: "promotion" | "transfer" | "demotion" | "role_change" | "department_change" | "location_change";
  reason: string;
  initiatedById: string;
}

export interface ReportingManager {
  id: string;
  tenantId: string;
  managerId: string;
  employeeId: string;
  fromDate: Timestamp;
  toDate?: Timestamp;
  isActive: boolean;
}

// ── Roles & Permissions ────────────────────────────────

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  guardName: string;
  displayName: string;
  description?: string;
  isSystem: boolean;
  permissions: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Permission {
  id: string;
  key: string;
  name: string;
  parentKey?: string;
  group: string;
  description?: string;
  createdAt: Timestamp;
}

export interface ApprovalChain {
  id: string;
  tenantId: string;
  name: string;
  type: "leave" | "overtime" | "attendance" | "exit";
  strategy: "all" | "level" | "count";
  steps: ApprovalStep[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ApprovalStep {
  order: number;
  type: "reporting_manager" | "department_head" | "hr" | "admin" | "specific_user";
  userId?: string;
}

// ── Attendance ─────────────────────────────────────────

export interface Shift extends BaseEntity {
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  gracePeriod: number; // minutes
  flexibleDuration: boolean;
  minDuration?: number; // minutes
  maxDuration?: number; // minutes
  halfDayMark?: string; // HH:mm
  color?: string;
  status: "active" | "inactive";
}

export interface WeeklyOff extends BaseEntity {
  name: string;
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  isDefault: boolean;
  userIds?: string[];
}

export interface EmployeeAttendance extends BaseEntity {
  userId: string;
  date: Timestamp;
  checkIn?: Timestamp;
  checkOut?: Timestamp;
  shiftId?: string;
  weeklyOffId?: string;
  workdayType: "regular" | "weekly_off" | "holiday" | "absent";
  status: "present" | "absent" | "half_day" | "late" | "week_off" | "holiday" | "on_leave";
  totalHours?: number;
  overtimeHours?: number;
  isLate: boolean;
  isEarlyDeparture: boolean;
  notes?: string;
  source?: "manual" | "geo" | "teamlogger" | "regularization";
}

export interface AttendanceStats extends BaseEntity {
  userId: string;
  month: number; // 1-12
  year: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  weeklyOffs: number;
  holidays: number;
  leaves: number;
  overtimeHours: number;
  totalWorkHours: number;
}

export interface RegularizationRequest extends BaseEntity {
  userId: string;
  attendanceId: string;
  type: "check_in" | "check_out" | "both" | "full_day";
  requestedCheckIn?: Timestamp;
  requestedCheckOut?: Timestamp;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewedById?: string;
  reviewedAt?: Timestamp;
  reviewerNotes?: string;
}

// ── Leave & Overtime ───────────────────────────────────

export interface LeavePlan extends BaseEntity {
  name: string;
  description?: string;
  allocationPeriod: "calendar_year" | "financial_year" | "custom";
  startMonth?: number;
  carryForwardAllowed: boolean;
  carryForwardLimit?: number;
  encashable: boolean;
  maxEncashableDays?: number;
  status: "active" | "inactive";
}

export interface LeaveType extends BaseEntity {
  planId: string;
  name: string;
  code: string;
  maxBalance: number;
  incrementType: "none" | "monthly" | "yearly" | "per_quarter";
  incrementValue?: number;
  incrementDay?: number;
  isPaid: boolean;
  requiresApproval: boolean;
  requiresAttachment: boolean;
  genderRestriction?: "male" | "female";
  minDaysBeforeRequest?: number;
  maxConsecutiveDays?: number;
  color: string;
  status: "active" | "inactive";
}

export interface LeaveBalance extends BaseEntity {
  userId: string;
  leavePlanId: string;
  leaveTypeId: string;
  totalAllocated: number;
  used: number;
  pending: number;
  remaining: number;
  carriedForward: number;
  year: number;
}

export interface LeaveBalanceHistory extends BaseEntity {
  userId: string;
  leaveTypeId: string;
  changeType: "allocated" | "used" | "credited" | "expired" | "carried_forward" | "adjusted";
  amount: number;
  previousBalance: number;
  newBalance: number;
  referenceId?: string;
  notes?: string;
}

export interface LeaveRequest extends BaseEntity {
  userId: string;
  leaveTypeId: string;
  fromDate: Timestamp;
  toDate: Timestamp;
  totalDays: number;
  reason: string;
  attachmentURL?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approvedById?: string;
  approvedAt?: Timestamp;
  rejectionReason?: string;
}

export interface OvertimePolicy extends BaseEntity {
  name: string;
  description?: string;
  rateMultiplier: number;
  maxHoursPerDay: number;
  maxHoursPerMonth: number;
  requiresApproval: boolean;
  eligibleDesignationIds: string[];
  status: "active" | "inactive";
}

export interface OvertimeRequest extends BaseEntity {
  userId: string;
  date: Timestamp;
  startTime: Timestamp;
  endTime: Timestamp;
  totalHours: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvedById?: string;
  approvedAt?: Timestamp;
  policyId?: string;
  rateMultiplier: number;
  compensation: "pay" | "comp_off";
}

export interface OvertimeTerm extends BaseEntity {
  policyId: string;
  dayType: "weekday" | "weekend" | "holiday";
  rateMultiplier: number;
  minHours: number;
  maxHours: number;
}

// ── Holiday ────────────────────────────────────────────

export interface HolidayPlan extends BaseEntity {
  name: string;
  year: number;
  description?: string;
  status: "active" | "inactive";
}

export interface Holiday extends BaseEntity {
  planId: string;
  name: string;
  date: Timestamp;
  year: number;
  type: "fixed" | "optional" | "floating";
  isOptional: boolean;
  isPaid: boolean;
  applicableDesignationIds?: string[];
  applicableLocationIds?: string[];
}

export interface CalendarEvent {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  date: Timestamp;
  type: "leave" | "holiday" | "birthday" | "anniversary" | "attendance" | "task";
  description?: string;
  color: string;
}

// ── Payroll ────────────────────────────────────────────

export interface PayGroup extends BaseEntity {
  name: string;
  description?: string;
  frequency: "monthly" | "bi_weekly" | "weekly";
  payDate: number; // day of month
  processingType: "auto" | "manual";
  status: "active" | "inactive";
}

export interface PayGroupComponent extends BaseEntity {
  payGroupId: string;
  componentId: string;
  calculationType: "fixed" | "percentage" | "attendance_based";
  value: number;
  effectiveFrom: Timestamp;
  effectiveTo?: Timestamp;
}

export interface SalaryComponent extends BaseEntity {
  name: string;
  code: string;
  type: "earning" | "deduction";
  calculationType: "fixed" | "percentage_of_basic" | "attendance_based";
  defaultPercentage?: number;
  isTaxable: boolean;
  isStatutory: boolean;
  sortOrder: number;
  status: "active" | "inactive";
}

export interface PayrollRun extends BaseEntity {
  payGroupId: string;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  processedBy: string;
  processedAt: Timestamp;
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  status: "processing" | "completed" | "failed" | "cancelled";
}

export interface PayrollTransaction extends BaseEntity {
  payrollRunId: string;
  userId: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  earnings: { [componentCode: string]: number };
  deductions: { [componentCode: string]: number };
  status: "pending" | "paid" | "failed";
  paidAt?: Timestamp;
}

export interface PayslipTemplate extends BaseEntity {
  name: string;
  content: string;
  isDefault: boolean;
  status: "active" | "inactive";
}

// ── Assets ─────────────────────────────────────────────

export interface AssetCategory extends BaseEntity {
  name: string;
  description?: string;
  status: "active" | "inactive";
}

export interface AssetType extends BaseEntity {
  categoryId: string;
  name: string;
  description?: string;
  status: "active" | "inactive";
}

export interface Asset extends BaseEntity {
  typeId: string;
  categoryId: string;
  assetCode: string;
  name: string;
  description?: string;
  serialNumber?: string;
  purchaseDate?: Timestamp;
  purchaseCost?: number;
  warrantyExpiry?: Timestamp;
  condition: "new" | "good" | "fair" | "damaged" | "disposed";
  status: "available" | "assigned" | "under_maintenance" | "disposed";
  location?: string;
  imageURL?: string;
}

export interface AssetAssignment extends BaseEntity {
  assetId: string;
  userId: string;
  assignedDate: Timestamp;
  returnedDate?: Timestamp;
  conditionAtAssignment: string;
  conditionAtReturn?: string;
  notes?: string;
  status: "active" | "returned";
}

// ── Documents ──────────────────────────────────────────

export interface DocumentCategory extends BaseEntity {
  name: string;
  description?: string;
  status: "active" | "inactive";
}

export interface Document extends BaseEntity {
  categoryId: string;
  userId: string;
  title: string;
  description?: string;
  fileURL: string;
  fileType: string;
  fileSize: number;
  expiryDate?: Timestamp;
  status: "active" | "expired" | "archived";
  isVerified: boolean;
  verifiedById?: string;
  verifiedAt?: Timestamp;
}

export interface DocumentTemplate extends BaseEntity {
  name: string;
  type: "offer_letter" | "appointment" | "confirmation" | "increment" | "termination" | "experience" | "other";
  content: string;
  variables: string[];
  isDefault: boolean;
  status: "active" | "inactive";
}

// ── Engage (Social Feed) ───────────────────────────────

export interface Post extends BaseEntity {
  userId: string;
  content: string;
  mediaURLs: string[];
  tags: string[];
  likes: number;
  comments: number;
  isPinned: boolean;
  status: "published" | "archived" | "draft";
}

export interface Comment extends BaseEntity {
  postId: string;
  userId: string;
  content: string;
  parentCommentId?: string;
  likes: number;
}

export interface Reaction extends BaseEntity {
  postId?: string;
  commentId?: string;
  userId: string;
  type: "like" | "love" | "laugh" | "wow" | "sad" | "angry";
}

export interface Poll extends BaseEntity {
  postId: string;
  question: string;
  options: PollOption[];
  expiresAt: Timestamp;
  isMultipleChoice: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface PollVote extends BaseEntity {
  pollId: string;
  optionId: string;
  userId: string;
}

// ── Onboarding ─────────────────────────────────────────

export interface Onboarding extends BaseEntity {
  name: string;
  description?: string;
  departmentId?: string;
  designationId?: string;
  tasks: OnboardingTask[];
  isDefault: boolean;
  status: "active" | "inactive";
}

export interface OnboardingTask {
  id: string;
  title: string;
  description?: string;
  assignedTo: "employee" | "hr" | "manager" | "it" | "admin";
  dueDaysAfterJoining: number;
  isMandatory: boolean;
}

export interface EmployeeOnboardingTask extends BaseEntity {
  onboardingId: string;
  userId: string;
  taskId: string;
  title: string;
  assignedTo: string;
  assignedToUserId?: string;
  status: "pending" | "in_progress" | "completed" | "overdue";
  completedAt?: Timestamp;
  completedById?: string;
  dueDate: Timestamp;
}

// ── Employee Exit ──────────────────────────────────────

export interface EmployeeExit extends BaseEntity {
  userId: string;
  resignationDate: Timestamp;
  lastWorkingDate: Timestamp;
  reason: string;
  exitType: "resignation" | "termination" | "retirement" | "mutual_separation";
  status: "initiated" | "approval_pending" | "notice_period" | "clearance_pending" | "completed" | "cancelled";
  exitInterview?: string;
  clearanceItems: ExitClearanceItem[];
}

export interface ExitClearanceItem {
  id: string;
  item: string;
  assignedDepartment: string;
  status: "pending" | "cleared";
  clearedBy?: string;
  clearedAt?: Timestamp;
  notes?: string;
}

export interface EmployeeExitSetting extends BaseEntity {
  noticePeriodDays: number;
  requiresApproval: boolean;
  clearanceDepartments: string[];
  exitInterviewRequired: boolean;
  status: "active" | "inactive";
}

// ── Probation ──────────────────────────────────────────

export interface ProbationPolicy extends BaseEntity {
  name: string;
  defaultDurationDays: number;
  reviewFrequency: "monthly" | "quarterly" | "mid_term";
  reviewDates: number[];
  requiresApproval: boolean;
  autoConfirm: boolean;
  autoConfirmDays?: number;
  status: "active" | "inactive";
}

export interface ProbationReview extends BaseEntity {
  userId: string;
  reviewNumber: number;
  reviewDate: Timestamp;
  reviewedById: string;
  rating: "excellent" | "good" | "satisfactory" | "needs_improvement" | "poor";
  comments: string;
  recommendation: "confirm" | "extend" | "terminate";
  status: "pending" | "completed";
}

// ── Notice Period ──────────────────────────────────────

export interface NoticePeriod extends BaseEntity {
  userId: string;
  startDate: Timestamp;
  endDate: Timestamp;
  remainingDays: number;
  status: "active" | "completed" | "waived" | "extended";
  waivedById?: string;
  waivedAt?: Timestamp;
  extendedDays?: number;
  extendedReason?: string;
}

// ── Task & Ticket Management ────────────────────────────

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "completed" | "on_hold";
export type TicketCategory = "hr" | "it" | "payroll" | "leave" | "general";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface HRMTask extends BaseEntity {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assigneeName?: string;
  assignerId?: string;
  assignerName?: string;
  departmentId?: string;
  dueDate?: Timestamp;
  completedAt?: Timestamp;
  completedById?: string;
  progress: number; // 0-100
  notes?: string;
  tags?: string[];
  attachments?: TicketAttachment[];
}

export interface HRMTaskComment extends BaseEntity {
  taskId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  content: string;
}

export interface TaskAuditLog extends BaseEntity {
  taskId: string;
  action: "created" | "assigned" | "reassigned" | "status_updated" | "priority_updated" | "commented" | "completed" | "reopened";
  performedById: string;
  performedByName: string;
  previousValue?: string;
  newValue?: string;
  details?: string;
}

export interface Ticket extends BaseEntity {
  subject: string;
  description?: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdById: string;
  createdByName: string;
  assigneeId?: string;
  assigneeName?: string;
  departmentId?: string;
  resolvedAt?: Timestamp;
  resolvedById?: string;
  closedAt?: Timestamp;
  closedById?: string;
  resolution?: string;
  attachments?: TicketAttachment[];
}

export interface TicketReply extends BaseEntity {
  ticketId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  content: string;
  isInternal: boolean; // internal notes visible only to admins
}

export interface TicketAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileURL: string;
  uploadedById: string;
  uploadedByName: string;
  createdAt: Date;
}

export interface TicketTimeline extends BaseEntity {
  ticketId: string;
  action: "created" | "assigned" | "reassigned" | "status_updated" | "priority_updated" | "replied" | "resolved" | "closed" | "reopened";
  performedById: string;
  performedByName: string;
  previousValue?: string;
  newValue?: string;
  details?: string;
}

// ── Notifications ──────────────────────────────────────

export interface NotificationTemplate extends BaseEntity {
  name: string;
  type: "email" | "push" | "in_app" | "sms";
  subject?: string;
  content: string;
  variables: string[];
  isSystem: boolean;
}

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  body: string;
  type: "leave" | "attendance" | "payroll" | "onboarding" | "exit" | "general" | "task" | "ticket" | "post";
  referenceId?: string;
  referenceType?: string;
  isRead: boolean;
  readAt?: Timestamp;
  createdAt: Timestamp;
}

// ── Settings ───────────────────────────────────────────

export interface Setting {
  id: string;
  tenantId?: string;
  organizationId?: string;
  userId?: string;
  key: string;
  value: string;
  type: "string" | "number" | "boolean" | "json";
  category: "general" | "attendance" | "payroll" | "modules" | "basic" | "socials";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Language {
  id: string;
  code: string;
  name: string;
  isRtl: boolean;
  status: "active" | "inactive";
}

export interface Translation {
  id: string;
  languageId: string;
  tenantId: string;
  key: string;
  value: string;
  type: "email" | "ui" | "validation";
}

// ── Contact Support ────────────────────────────────────

export interface ContactSupport {
  id: string;
  tenantId: string;
  userId: string;
  subject: string;
  message: string;
  attachmentURL?: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Projects ───────────────────────────────────────────

export interface Project extends BaseEntity {
  name: string;
  description?: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  status: "planning" | "in_progress" | "completed" | "on_hold" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  ownerId: string;
  budget?: number;
  progress?: number; // 0-100, calculated from completed tasks / total tasks
}

export interface ProjectMember extends BaseEntity {
  projectId: string;
  userId: string;
  role: "manager" | "member" | "viewer";
  allocationPercentage?: number;
}

export interface ProjectTask extends BaseEntity {
  projectId: string;
  assigneeId?: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "review" | "completed";
  priority: "low" | "medium" | "high" | "critical";
  startDate?: Timestamp;
  dueDate?: Timestamp;
  completedAt?: Timestamp;
  estimatedHours?: number;
  actualHours?: number;
}

export interface TaskComment extends BaseEntity {
  taskId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  content: string;
}

export interface TaskAttachment extends BaseEntity {
  taskId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileURL: string;
}

export interface Milestone extends BaseEntity {
  projectId: string;
  title: string;
  description?: string;
  dueDate?: Timestamp;
  status: "pending" | "in_progress" | "completed" | "delayed";
  completedAt?: Timestamp;
}

// ── ID Card / Badge ────────────────────────────────────

export interface IDCardTemplate extends BaseEntity {
  name: string;
  content: string;
  fields: string[];
  dimensions: { width: number; height: number };
  isDefault: boolean;
  status: "active" | "inactive";
}

// ── AI Chat ────────────────────────────────────────────

// ── Recruitment ───────────────────────────────

export interface Job extends BaseEntity {
  title: string;
  department: string;
  location: string;
  type: "full-time" | "part-time" | "contract" | "internship";
  status: "draft" | "open" | "paused" | "closed";
  description?: string;
  requirements?: string;
  applicants: number;
  interviews: number;
  offers: number;
  createdById?: string;
}

export interface Candidate extends BaseEntity {
  name: string;
  email: string;
  phone?: string;
  position: string;
  jobId?: string;
  location?: string;
  status: "new" | "review" | "shortlisted" | "interviewing" | "offered" | "hired" | "rejected";
  resumeURL?: string;
  appliedDate: Date;
}

export interface Application extends BaseEntity {
  candidateId: string;
  jobId: string;
  stage: string;
  status: "pending" | "in_progress" | "accepted" | "rejected" | "withdrawn";
  notes?: string;
}

export interface Interview extends BaseEntity {
  candidateId: string;
  jobId: string;
  interviewerId: string;
  scheduledAt: Date;
  type: "phone" | "video" | "in_person" | "technical";
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
  feedback?: string;
  rating?: number;
}

export interface Offer extends BaseEntity {
  candidateId: string;
  jobId: string;
  salary: number;
  currency: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "negotiating";
  expiresAt: Date;
  notes?: string;
}

// ── Performance Module ───────────────────────────

export interface Goal extends BaseEntity {
  userId: string;
  title: string;
  description?: string;
  category: "performance" | "development" | "career" | "personal";
  type: "individual" | "team" | "department";
  status: "draft" | "in_progress" | "achieved" | "partially_achieved" | "not_achieved";
  priority: "low" | "medium" | "high" | "critical";
  startDate: Timestamp;
  targetDate: Timestamp;
  completedAt?: Timestamp;
  measurableOutcome?: string;
  progress: number; // 0-100
  weight: number; // 0-100
  approvedById?: string;
  approvedAt?: Timestamp;
  reviewNotes?: string;
}

export interface PerformanceReview extends BaseEntity {
  userId: string;
  reviewerId: string;
  reviewType: "self" | "manager" | "peer" | "360";
  period: "monthly" | "quarterly" | "half_yearly" | "yearly";
  periodStart: Timestamp;
  periodEnd: Timestamp;
  overallRating: number; // 1-5
  scores?: ReviewScore[];
  strengths?: string;
  areasForImprovement?: string;
  managerComments?: string;
  employeeComments?: string;
  status: "draft" | "submitted" | "acknowledged" | "completed";
  submittedAt?: Timestamp;
  acknowledgedAt?: Timestamp;
  completedAt?: Timestamp;
}

export interface ReviewScore {
  category: string;
  score: number; // 1-5
  comments?: string;
}

export interface PerformanceFeedback extends BaseEntity {
  userId: string;
  fromUserId: string;
  feedbackType: "praise" | "constructive" | "suggestion" | "recognition";
  message: string;
  context?: string;
  isAnonymous: boolean;
  isPublic: boolean;
  status: "pending" | "acknowledged" | "archived";
  acknowledgedAt?: Timestamp;
  tags?: string[];
}

export interface Kpi extends BaseEntity {
  userId: string;
  name: string;
  description?: string;
  category: "productivity" | "quality" | "attendance" | "sales" | "customer_satisfaction" | "other";
  target: number;
  actual: number;
  unit: string;
  weight: number; // 0-100
  period: "weekly" | "monthly" | "quarterly" | "yearly";
  periodStart: Timestamp;
  periodEnd: Timestamp;
  status: "on_track" | "behind" | "achieved" | "not_met";
}

// ── Audit Logs ──────────────────────────────────

export interface AuditLog {
  id: string;
  tenantId: string;
  action: "create_user" | "update_user" | "delete_user" | "update_role" | "update_status" | "reset_password" | "login_disabled" | "login_enabled";
  performedById: string;
  performedByName: string;
  targetUserId: string;
  targetUserEmail: string;
  details: string;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
}

export interface AIChatMessage {
  id: string;
  tenantId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
}
