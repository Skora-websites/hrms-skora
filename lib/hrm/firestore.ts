// Firestore.ts — backed 100% by MongoDB (drop-in replacement)
// No Firebase is used; all storage, queries, and auth are in MongoDB.
import "server-only";
import { createMongoService, WhereClause, QueryOptions, FirestoreWhereOp, FirestoreOrderDirection } from "@/lib/hrm/mongo";

// Re-export types for backward compatibility
export type { WhereClause, QueryOptions, FirestoreWhereOp, FirestoreOrderDirection };

// Alias: createFirestoreService now delegates to MongoDB
// Type imports for service instances
import type {
  Tenant, TenantLanguage, Organization, Department, Designation, BusinessUnit, Location,
  HRMUser, EmployeeJob, EmployeeDetail, EmployeeJobEvent, FamilyDetail, PastEmployer,
  EmployeeEducation, EmployeeCertification, EmployeeSalary, EmployeeSalaryHistory, ReportingManager,
  Role, Permission, ApprovalChain,
  Shift, WeeklyOff, EmployeeAttendance, AttendanceStats, RegularizationRequest,
  LeavePlan, LeaveType, LeaveBalance, LeaveBalanceHistory, LeaveRequest,
  OvertimePolicy, OvertimeRequest, OvertimeTerm,
  HolidayPlan, Holiday, CalendarEvent,
  PayGroup, PayGroupComponent, SalaryComponent, PayrollRun, PayrollTransaction, PayslipTemplate,
  AssetCategory, AssetType, Asset, AssetAssignment,
  Document, DocumentCategory, DocumentTemplate,
  Post, Comment, Reaction, Poll, PollVote,
  Onboarding, EmployeeOnboardingTask,
  EmployeeExit, EmployeeExitSetting,
  ProbationPolicy, ProbationReview, NoticePeriod,
  NotificationTemplate, Notification, Setting, Language, Translation, ContactSupport,
  Project, ProjectMember, ProjectTask, TaskComment, TaskAttachment, Milestone,
  IDCardTemplate, AIChatMessage, AuditLog,
  Goal, PerformanceReview, PerformanceFeedback, Kpi,
  HRMTask, HRMTaskComment, TaskAuditLog,
  Ticket, TicketReply, TicketTimeline,
} from "@/types";


export const createFirestoreService = createMongoService;

export const COLLECTIONS = {
  tenants: "tenants",
  tenantLanguages: "tenant_languages",
  organizations: "organizations",
  departments: "departments",
  designations: "designations",
  businessUnits: "business_units",
  locations: "locations",
  users: "users",
  employeeJobs: "employee_jobs",
  employeeDetails: "employee_details",
  employeeJobEvents: "employee_job_events",
  familyDetails: "family_details",
  pastEmployers: "past_employers",
  employeeEducations: "employee_educations",
  employeeCertifications: "employee_certifications",
  employeeSalaries: "employee_salaries",
  employeeSalaryHistory: "employee_salary_history",
  reportingManagers: "reporting_managers",
  roles: "roles",
  permissions: "permissions",
  approvalChains: "approval_chains",
  shifts: "shifts",
  weeklyOffs: "weekly_offs",
  attendance: "attendance",
  attendanceStats: "attendance_stats",
  regularizationRequests: "regularization_requests",
  leavePlans: "leave_plans",
  leaveTypes: "leave_types",
  leaveBalances: "leave_balances",
  leaveBalanceHistory: "leave_balance_history",
  leaveRequests: "leave_requests",
  overtimePolicies: "overtime_policies",
  overtimeRequests: "overtime_requests",
  overtimeTerms: "overtime_terms",
  holidayPlans: "holiday_plans",
  holidays: "holidays",
  calendarEvents: "calendar_events",
  payGroups: "pay_groups",
  payGroupComponents: "pay_group_components",
  salaryComponents: "salary_components",
  payrollRuns: "payroll_runs",
  payrollTransactions: "payroll_transactions",
  payslipTemplates: "payslip_templates",
  assetCategories: "asset_categories",
  assetTypes: "asset_types",
  assets: "assets",
  assetAssignments: "asset_assignments",
  documentCategories: "document_categories",
  documents: "documents",
  documentTemplates: "document_templates",
  posts: "posts",
  comments: "comments",
  reactions: "reactions",
  polls: "polls",
  pollVotes: "poll_votes",
  onboarding: "onboarding",
  employeeOnboardingTasks: "employee_onboarding_tasks",
  employeeExits: "employee_exits",
  exitSettings: "exit_settings",
  probationPolicies: "probation_policies",
  probationReviews: "probation_reviews",
  noticePeriods: "notice_periods",
  notificationTemplates: "notification_templates",
  notifications: "notifications",
  settings: "settings",
  languages: "languages",
  translations: "translations",
  contactSupport: "contact_support",
  projects: "projects",
  projectMembers: "project_members",
  projectTasks: "project_tasks",
  taskComments: "task_comments",
  taskAttachments: "task_attachments",
  milestones: "milestones",
  idCardTemplates: "id_card_templates",
  aiChatMessages: "ai_chat_messages",
  sessions: "sessions",
  verificationTokens: "verification_tokens",
  accounts: "accounts",
  jobLogs: "job_logs",
  auditLogs: "audit_logs",

  // Task & Ticket Management
  hrmTasks: "hrm_tasks",
  hrmTaskComments: "hrm_task_comments",
  taskAuditLogs: "task_audit_logs",
  tickets: "tickets",
  ticketReplies: "ticket_replies",
  ticketTimeline: "ticket_timeline",

  // Performance
  goals: "goals",
  performanceReviews: "performance_reviews",
  performanceFeedback: "performance_feedback",
  kpis: "kpis",
} as const;

// ── Audit Log ────────────────────────────────────────
export const auditLogsService = createFirestoreService<AuditLog>(COLLECTIONS.auditLogs);

// ── Core ───────────────────────────────────────────────
export const tenantsService = createFirestoreService<Tenant>(COLLECTIONS.tenants);
export const tenantLanguagesService = createFirestoreService<TenantLanguage>(COLLECTIONS.tenantLanguages);

// ── Organization ───────────────────────────────────────
export const organizationsService = createFirestoreService<Organization>(COLLECTIONS.organizations);
export const departmentsService = createFirestoreService<Department>(COLLECTIONS.departments);
export const designationsService = createFirestoreService<Designation>(COLLECTIONS.designations);
export const businessUnitsService = createFirestoreService<BusinessUnit>(COLLECTIONS.businessUnits);
export const locationsService = createFirestoreService<Location>(COLLECTIONS.locations);

// ── Users & Employees ──────────────────────────────────
export const hrmUsersService = createFirestoreService<HRMUser>(COLLECTIONS.users);
export const employeeJobsService = createFirestoreService<EmployeeJob>(COLLECTIONS.employeeJobs);
export const employeeDetailsService = createFirestoreService<EmployeeDetail>(COLLECTIONS.employeeDetails);
export const employeeJobEventsService = createFirestoreService<EmployeeJobEvent>(COLLECTIONS.employeeJobEvents);
export const familyDetailsService = createFirestoreService<FamilyDetail>(COLLECTIONS.familyDetails);
export const pastEmployersService = createFirestoreService<PastEmployer>(COLLECTIONS.pastEmployers);
export const employeeEducationsService = createFirestoreService<EmployeeEducation>(COLLECTIONS.employeeEducations);
export const employeeCertificationsService = createFirestoreService<EmployeeCertification>(COLLECTIONS.employeeCertifications);
export const employeeSalariesService = createFirestoreService<EmployeeSalary>(COLLECTIONS.employeeSalaries);
export const employeeSalaryHistoryService = createFirestoreService<EmployeeSalaryHistory>(COLLECTIONS.employeeSalaryHistory);
export const reportingManagersService = createFirestoreService<ReportingManager>(COLLECTIONS.reportingManagers);

// ── Roles & Permissions ────────────────────────────────
export const rolesService = createFirestoreService<Role>(COLLECTIONS.roles);
export const permissionsService = createFirestoreService<Permission>(COLLECTIONS.permissions);
export const approvalChainsService = createFirestoreService<ApprovalChain>(COLLECTIONS.approvalChains);

// ── Attendance ─────────────────────────────────────────
export const shiftsService = createFirestoreService<Shift>(COLLECTIONS.shifts);
export const weeklyOffsService = createFirestoreService<WeeklyOff>(COLLECTIONS.weeklyOffs);
export const attendanceService = createFirestoreService<EmployeeAttendance>(COLLECTIONS.attendance);
export const attendanceStatsService = createFirestoreService<AttendanceStats>(COLLECTIONS.attendanceStats);
export const regularizationRequestsService = createFirestoreService<RegularizationRequest>(COLLECTIONS.regularizationRequests);

// ── Leave & Overtime ───────────────────────────────────
export const leavePlansService = createFirestoreService<LeavePlan>(COLLECTIONS.leavePlans);
export const leaveTypesService = createFirestoreService<LeaveType>(COLLECTIONS.leaveTypes);
export const leaveBalancesService = createFirestoreService<LeaveBalance>(COLLECTIONS.leaveBalances);
export const leaveBalanceHistoryService = createFirestoreService<LeaveBalanceHistory>(COLLECTIONS.leaveBalanceHistory);
export const leaveRequestsService = createFirestoreService<LeaveRequest>(COLLECTIONS.leaveRequests);
export const overtimePoliciesService = createFirestoreService<OvertimePolicy>(COLLECTIONS.overtimePolicies);
export const overtimeRequestsService = createFirestoreService<OvertimeRequest>(COLLECTIONS.overtimeRequests);
export const overtimeTermsService = createFirestoreService<OvertimeTerm>(COLLECTIONS.overtimeTerms);

// ── Holiday ────────────────────────────────────────────
export const holidayPlansService = createFirestoreService<HolidayPlan>(COLLECTIONS.holidayPlans);
export const holidaysService = createFirestoreService<Holiday>(COLLECTIONS.holidays);
export const calendarEventsService = createFirestoreService<CalendarEvent>(COLLECTIONS.calendarEvents);

// ── Payroll ────────────────────────────────────────────
export const payGroupsService = createFirestoreService<PayGroup>(COLLECTIONS.payGroups);
export const payGroupComponentsService = createFirestoreService<PayGroupComponent>(COLLECTIONS.payGroupComponents);
export const salaryComponentsService = createFirestoreService<SalaryComponent>(COLLECTIONS.salaryComponents);
export const payrollRunsService = createFirestoreService<PayrollRun>(COLLECTIONS.payrollRuns);
export const payrollTransactionsService = createFirestoreService<PayrollTransaction>(COLLECTIONS.payrollTransactions);
export const payslipTemplatesService = createFirestoreService<PayslipTemplate>(COLLECTIONS.payslipTemplates);

// ── Assets ─────────────────────────────────────────────
export const assetCategoriesService = createFirestoreService<AssetCategory>(COLLECTIONS.assetCategories);
export const assetTypesService = createFirestoreService<AssetType>(COLLECTIONS.assetTypes);
export const assetsService = createFirestoreService<Asset>(COLLECTIONS.assets);
export const assetAssignmentsService = createFirestoreService<AssetAssignment>(COLLECTIONS.assetAssignments);

// ── Documents ──────────────────────────────────────────
export const documentCategoriesService = createFirestoreService<DocumentCategory>(COLLECTIONS.documentCategories);
export const documentsService = createFirestoreService<Document>(COLLECTIONS.documents);
export const documentTemplatesService = createFirestoreService<DocumentTemplate>(COLLECTIONS.documentTemplates);

// ── Engage ─────────────────────────────────────────────
export const postsService = createFirestoreService<Post>(COLLECTIONS.posts);
export const commentsService = createFirestoreService<Comment>(COLLECTIONS.comments);
export const reactionsService = createFirestoreService<Reaction>(COLLECTIONS.reactions);
export const pollsService = createFirestoreService<Poll>(COLLECTIONS.polls);
export const pollVotesService = createFirestoreService<PollVote>(COLLECTIONS.pollVotes);

// ── Onboarding ─────────────────────────────────────────
export const onboardingService = createFirestoreService<Onboarding>(COLLECTIONS.onboarding);
export const employeeOnboardingTasksService = createFirestoreService<EmployeeOnboardingTask>(COLLECTIONS.employeeOnboardingTasks);

// ── Exit ───────────────────────────────────────────────
export const employeeExitsService = createFirestoreService<EmployeeExit>(COLLECTIONS.employeeExits);
export const exitSettingsService = createFirestoreService<EmployeeExitSetting>(COLLECTIONS.exitSettings);

// ── Probation ──────────────────────────────────────────
export const probationPoliciesService = createFirestoreService<ProbationPolicy>(COLLECTIONS.probationPolicies);
export const probationReviewsService = createFirestoreService<ProbationReview>(COLLECTIONS.probationReviews);

// ── Notice Period ──────────────────────────────────────
export const noticePeriodsService = createFirestoreService<NoticePeriod>(COLLECTIONS.noticePeriods);

// ── Notifications ──────────────────────────────────────
export const notificationTemplatesService = createFirestoreService<NotificationTemplate>(COLLECTIONS.notificationTemplates);
export const notificationsService = createFirestoreService<Notification>(COLLECTIONS.notifications);

// ── Settings ───────────────────────────────────────────
export const settingsService = createFirestoreService<Setting>(COLLECTIONS.settings);
export const languagesService = createFirestoreService<Language>(COLLECTIONS.languages);
export const translationsService = createFirestoreService<Translation>(COLLECTIONS.translations);

// ── Support ────────────────────────────────────────────
export const contactSupportService = createFirestoreService<ContactSupport>(COLLECTIONS.contactSupport);

// ── Projects ───────────────────────────────────────────
export const projectsService = createFirestoreService<Project>(COLLECTIONS.projects);
export const projectMembersService = createFirestoreService<ProjectMember>(COLLECTIONS.projectMembers);
export const projectTasksService = createFirestoreService<ProjectTask>(COLLECTIONS.projectTasks);
export const taskCommentsService = createFirestoreService<TaskComment>(COLLECTIONS.taskComments);
export const taskAttachmentsService = createFirestoreService<TaskAttachment>(COLLECTIONS.taskAttachments);
export const milestonesService = createFirestoreService<Milestone>(COLLECTIONS.milestones);

// ── Other ──────────────────────────────────────────────
export const idCardTemplatesService = createFirestoreService<IDCardTemplate>(COLLECTIONS.idCardTemplates);
export const aiChatMessagesService = createFirestoreService<AIChatMessage>(COLLECTIONS.aiChatMessages);

// ── Task & Ticket Management ───────────────────────────
export const hrmTasksService = createFirestoreService<HRMTask>(COLLECTIONS.hrmTasks);
export const hrmTaskCommentsService = createFirestoreService<HRMTaskComment>(COLLECTIONS.hrmTaskComments);
export const taskAuditLogsService = createFirestoreService<TaskAuditLog>(COLLECTIONS.taskAuditLogs);
export const ticketsService = createFirestoreService<Ticket>(COLLECTIONS.tickets);
export const ticketRepliesService = createFirestoreService<TicketReply>(COLLECTIONS.ticketReplies);
export const ticketTimelineService = createFirestoreService<TicketTimeline>(COLLECTIONS.ticketTimeline);

// ── Performance ────────────────────────────────────────
export const goalsService = createFirestoreService<Goal>(COLLECTIONS.goals);
export const performanceReviewsService = createFirestoreService<PerformanceReview>(COLLECTIONS.performanceReviews);
export const performanceFeedbackService = createFirestoreService<PerformanceFeedback>(COLLECTIONS.performanceFeedback);
export const kpisService = createFirestoreService<Kpi>(COLLECTIONS.kpis);

// ── Re-export types for convenience ────────────────────
export type {
  Tenant,
  Organization,
  Department,
  Designation,
  BusinessUnit,
  Location,
  HRMUser,
  EmployeeJob,
  EmployeeDetail,
  EmployeeAttendance,
  LeaveRequest,
  LeaveBalance,
  LeaveType,
  LeavePlan,
  OvertimeRequest,
  OvertimePolicy,
  Shift,
  WeeklyOff,
  PayGroup,
  SalaryComponent,
  PayrollRun,
  PayrollTransaction,
  Asset,
  AssetAssignment,
  Post,
  Comment,
  Notification,
  Setting,
  Document,
  DocumentTemplate,
  Onboarding,
  EmployeeOnboardingTask,
  EmployeeExit,
  ProbationPolicy,
  NoticePeriod,
  Project,
  ProjectTask,
  Milestone,
  TaskComment,
  TaskAttachment,
  Role,
  Permission,
  ApprovalChain,
  CalendarEvent,
  RegularizationRequest,
  Goal,
  PerformanceReview,
  PerformanceFeedback,
  Kpi,
};

