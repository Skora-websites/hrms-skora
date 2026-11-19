export type QuestionType = "MCQ" | "DESCRIPTIVE";
export type AnswerMode = "SINGLE" | "MULTIPLE";
export type QuestionStatus = "ACTIVE" | "ARCHIVED";

export interface QuestionOption {
  id: string;
  text: string;
}

export interface TestQuestion {
  id: string;
  tenantId: string;
  type: QuestionType;
  text: string;
  topic: string;
  status: QuestionStatus;
  options?: QuestionOption[];
  answerMode?: AnswerMode;
  correctOptions?: string[]; // option ids
  referenceAnswer?: string; // for evaluators
  maxMarks: number;
  suggestedDurationMinutes?: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type TestStatus = "draft" | "active" | "archived" | "completed";
export type TestTargetType = "DEPARTMENT" | "SPECIFIC_USERS";

export interface TestProctoringSettings {
  requireFullscreen: boolean;
  maxViolationsAllowed: number; // e.g. 3 tab switches
  lockOnViolationExceeded: boolean;
  autoSubmitOnTimerExpiry: boolean;
}

export interface TestDefinition {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  department?: string; // department scope or null for all
  category?: string;
  durationMinutes: number; // e.g. 45 mins
  totalMarks: number;
  passPercentage: number; // e.g. 60%
  status: TestStatus;
  questionIds: string[];
  targetType?: TestTargetType;
  targetUserIds?: string[];
  assignedUserIds?: string[]; // targeted users or empty for all in dept
  assignedDepartment?: string;
  startDate?: string | null;
  dueDate?: string | null;
  maxAttempts?: number; // default: 1
  grantedRetakes?: Record<string, number>; // map of userId -> extra granted attempts count
  plannedDate?: string | null;
  proctoring: TestProctoringSettings;
  createdBy: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CandidateProgressItem {
  userId: string;
  name: string;
  email: string;
  department: string;
  status: "not_started" | "in_progress" | "submitted" | "evaluated" | "overdue";
  attemptsUsed: number;
  maxAttemptsAllowed: number;
  bestScore?: number;
  maxScore?: number;
  percentage?: number;
  passed?: boolean;
  latestAttemptId?: string;
  lastAttemptAt?: string;
}

export type AttemptStatus =
  | "in_progress"
  | "submitted"
  | "evaluated"
  | "timed_out"
  | "locked";

export interface TestAnswer {
  questionId: string;
  selectedOptions?: string[]; // for MCQ
  descriptiveText?: string; // for Descriptive
  marksAwarded?: number;
  evaluated?: boolean;
  feedback?: string;
  updatedAt: string;
}

export interface TestAttempt {
  id: string;
  tenantId: string;
  testId: string;
  testTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  department?: string;
  status: AttemptStatus;
  attemptNumber?: number;
  startedAt: string;
  expiresAt: string;
  submittedAt?: string;
  answers: Record<string, TestAnswer>; // map questionId -> answer
  violationCount: number;
  violationLogs: Array<{ reason: string; timestamp: string }>;
  mcqScore: number;
  descriptiveScore: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  evaluatedBy?: string;
  evaluatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestResultSummary {
  id: string;
  tenantId: string;
  attemptId: string;
  testId: string;
  testTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  department: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  grade: string; // "A+", "A", "B", "C", "F"
  completedAt: string;
}
