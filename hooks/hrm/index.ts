export { useCurrentUser } from "./use-auth";
export { useEmployees } from "./use-employees";
export { useAttendance, useAttendanceStats } from "./use-attendance";
export { useLeaves, useLeaveBalances, useLeaveTypes } from "./use-leave";
export { usePayrollRuns, usePayGroups, usePayrollRun, useEmployeePayroll } from "./use-payroll";
export { useAssets, useAssetCategories } from "./use-assets";
export { useDocuments, useDocumentCategories } from "./use-documents";
export { useNotifications } from "./use-notifications";
export { useDepartments, useDesignations, useOrganizations } from "./use-organization";
export { usePosts, useFeed, useComments } from "./use-engage";
export { useOnboardingPrograms, useEmployeeOnboardingTasks, useOnboardingDashboard } from "./use-onboarding";
export { useExits, useExitSettings, useNoticePeriod, useExitDashboard } from "./use-exit";
export { useHolidays, useHolidayPlans, useHolidayDashboard } from "./use-holidays";
export { useProbationPolicies, useProbationReviews, useProbationDashboard } from "./use-probation";
export { useSettings, useSetting } from "./use-settings";export {
  useProjects,
  useProject,
  useProjectDashboard,
  useProjectTasks,
  useTask,
  useKanbanBoard,
  useProjectMembers,
} from "./use-projects";

// Task & Ticket Management
export {
  useTasks,
  useTask as useHRMTask,
  useTaskDashboard,
  useTaskComments,
  useTaskAuditLogs,
} from "./use-tasks";
export {
  useTickets,
  useTicket,
  useTicketDashboard,
  useTicketReplies,
  useTicketTimeline,
} from "./use-tickets";

export { useFirestoreQuery, useCollection } from "./use-firestore-query";
