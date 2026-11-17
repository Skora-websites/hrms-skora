import { describe, it, expect } from "vitest";
import {
  createExpense,
  getExpenses,
  approveExpense,
  reimburseExpense,
  getExpenseCategories,
} from "@/services/hrm/expenses";
import {
  calculateAccruedWage,
  requestSalaryAdvance,
  getSalaryAdvances,
  approveSalaryAdvance,
  disburseSalaryAdvance,
} from "@/services/hrm/payroll/salary-advance";
import {
  claimOvertime,
  getOvertimeRecords,
  approveOvertime,
} from "@/services/hrm/attendance/overtime";
import {
  getRemainingMonthlyAllowance,
  sendKudos,
  getKudosFeed,
  getKudosLeaderboard,
  toggleKudosLike,
} from "@/services/hrm/engage/kudos";
import {
  processActionableAIQuery,
} from "@/services/hrm/ai";

describe("Enterprise HRMS Modules Real Data Validation", () => {
  const tenantId = "default";
  const employeeId = "2";
  const employeeEmail = "surbhim1528@gmail.com";
  const employeeName = "Surbhi Mishra";

  const adminId = "63";
  const adminName = "HR Admin Audit User";

  // 1. Expense & Reimbursement
  describe("Module 1: Expense & Reimbursement Claims", () => {
    it("should fetch expense categories with caps and receipt requirements", async () => {
      const categories = await getExpenseCategories(tenantId);
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0]).toHaveProperty("name");
      expect(categories[0]).toHaveProperty("monthlyCap");
    });

    it("should submit a valid expense claim and process approval and reimbursement", async () => {
      const claim = await createExpense(tenantId, {
        userId: employeeId,
        employeeName,
        employeeEmail,
        department: "Engineering",
        category: "Travel & Commute",
        amount: 850,
        currency: "INR",
        expenseDate: "2026-11-15",
        merchant: "City Metro Cab",
        description: "Travel to client meeting",
        receiptUrl: "https://example.com/receipt.pdf",
      });

      expect(claim).toBeDefined();
      expect(claim.status).toBe("pending");
      expect(claim.amount).toBe(850);

      const approved = await approveExpense(claim.id, adminId, adminName);
      expect(approved?.status).toBe("approved");
      expect(approved?.approvedBy).toBe(adminId);

      const reimbursed = await reimburseExpense(claim.id, "RUN-TEST-01");
      expect(reimbursed?.status).toBe("reimbursed");
      expect(reimbursed?.payrollRunId).toBe("RUN-TEST-01");
    });
  });

  // 2. Earned Wage Access & Salary Advance
  describe("Module 2: Earned Wage Access / Salary Advance", () => {
    it("should calculate real-time accrued wage based on attendance", async () => {
      const accrual = await calculateAccruedWage(tenantId, employeeId);
      expect(accrual).toBeDefined();
      expect(accrual.daysInMonth).toBeGreaterThan(27);
      expect(accrual.daysWorked).toBeGreaterThan(0);
      expect(accrual.accruedWage).toBeGreaterThan(0);
      expect(accrual.maxAdvanceAllowed).toBeGreaterThan(0);
    });

    it("should request and disburse salary advance", async () => {
      const advance = await requestSalaryAdvance(tenantId, {
        userId: employeeId,
        employeeName,
        employeeEmail,
        department: "Engineering",
        requestedAmount: 500,
        reason: "Medical prescription",
      });

      expect(advance).toBeDefined();
      expect(advance.status).toBe("pending");
      expect(advance.requestedAmount).toBe(500);

      const approved = await approveSalaryAdvance(advance.id, adminId, adminName);
      expect(approved?.status).toBe("approved");

      const disbursed = await disburseSalaryAdvance(advance.id, adminId, adminName);
      expect(disbursed?.status).toBe("disbursed");
      expect(disbursed?.disbursedAt).toBeDefined();
    });
  });

  // 3. Overtime & Comp-Off Engine
  describe("Module 3: Overtime & Comp-Off Engine", () => {
    it("should calculate overtime delta and comp-off credits upon approval", async () => {
      const ot = await claimOvertime(tenantId, {
        userId: employeeId,
        employeeName,
        employeeEmail,
        department: "Engineering",
        date: "2026-11-12",
        shiftMinutes: 480,
        actualMinutes: 720, // 4 hours OT
        compensationType: "comp_off",
        hourlyRate: 250,
      });

      expect(ot).toBeDefined();
      expect(ot.overtimeMinutes).toBe(240);
      expect(ot.compOffDaysCredited).toBe(0.5);
      expect(ot.status).toBe("pending");

      const approved = await approveOvertime(ot.id, adminId, adminName);
      expect(approved?.status).toBe("credited");
    });
  });

  // 4. Peer Kudos & Recognition Wall
  describe("Module 4: Peer Kudos & Recognition Wall", () => {
    it("should manage monthly points allowance and process peer kudos", async () => {
      const allowanceBefore = await getRemainingMonthlyAllowance(tenantId, employeeId);
      expect(allowanceBefore.monthlyBudget).toBe(100);
      expect(allowanceBefore.remainingPoints).toBeGreaterThan(0);

      const kudos = await sendKudos(tenantId, {
        senderId: employeeId,
        senderName: employeeName,
        senderEmail: employeeEmail,
        receiverId: "3",
        receiverName: "Shubha Pallavi",
        receiverEmail: "shubha.pallavi@skorainfotech.com",
        points: 15,
        badge: "Innovator",
        coreValue: "#Innovation",
        message: "Great work optimizing the database indexes!",
      });

      expect(kudos).toBeDefined();
      expect(kudos.points).toBe(15);
      expect(kudos.badge).toBe("Innovator");

      // Like toggle
      const like = await toggleKudosLike(tenantId, kudos.id, adminId, adminName);
      expect(like.liked).toBe(true);
      expect(like.likesCount).toBeGreaterThan(0);

      // Leaderboard
      const leaderboard = await getKudosLeaderboard(tenantId);
      expect(Array.isArray(leaderboard)).toBe(true);
    });
  });

  // 5. Actionable AI HR Assistant
  describe("Module 5: Actionable AI HR Assistant", () => {
    it("should process intent and return structured actionable cards", async () => {
      const resLeave = await processActionableAIQuery(tenantId, employeeId, "Check my leave balance");
      expect(resLeave.intentDetected).toBe("check_leave_balance");

      const resEWA = await processActionableAIQuery(tenantId, employeeId, "How much salary advance can I get?");
      expect(resEWA.intentDetected).toBe("salary_advance_eligibility");
      expect(resEWA.cards).toBeDefined();
      expect(resEWA.cards![0].type).toBe("salary_advance");

      const resExpense = await processActionableAIQuery(tenantId, employeeId, "I want to claim an expense reimbursement");
      expect(resExpense.intentDetected).toBe("claim_expense");
      expect(resExpense.cards).toBeDefined();

      const resKudos = await processActionableAIQuery(tenantId, employeeId, "Send kudos to a teammate");
      expect(resKudos.intentDetected).toBe("send_kudos");
      expect(resKudos.cards).toBeDefined();
    });
  });
});
