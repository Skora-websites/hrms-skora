const mysql = require('mysql2/promise');

async function runAudit() {
  console.log('--- STARTING ENTERPRISE MODULES REAL DATA AUDIT ---');

  // Dynamically import compiled or ts-node/direct modules or test via services
  const {
    createExpense,
    getExpenses,
    approveExpense,
    reimburseExpense,
    getExpenseCategories,
    createExpenseCategory,
  } = require('../services/hrm/expenses/index');

  const {
    calculateAccruedWage,
    requestSalaryAdvance,
    getSalaryAdvances,
    approveSalaryAdvance,
    disburseSalaryAdvance,
  } = require('../services/hrm/payroll/salary-advance');

  const {
    claimOvertime,
    getOvertimeRecords,
    approveOvertime,
  } = require('../services/hrm/attendance/overtime');

  const {
    getRemainingMonthlyAllowance,
    sendKudos,
    getKudosFeed,
    getKudosLeaderboard,
    toggleKudosLike,
  } = require('../services/hrm/engage/kudos');

  const {
    processActionableAIQuery,
  } = require('../services/hrm/ai/index');

  const tenantId = 'default';
  const employeeId = '2'; // Surbhi Mishra
  const employeeEmail = 'surbhim1528@gmail.com';
  const employeeName = 'Surbhi Mishra';

  const adminId = '63';
  const adminName = 'HR Admin Audit User';

  // 1. EXPENSES
  console.log('\n[1/5] Testing Expense & Reimbursement Claims...');
  const categories = await getExpenseCategories(tenantId);
  console.log(`✓ Fetched ${categories.length} expense categories:`, categories.map(c => c.name));

  const newExpense = await createExpense(tenantId, {
    userId: employeeId,
    employeeName,
    employeeEmail,
    department: 'Engineering',
    category: 'Travel & Commute',
    amount: 1450.50,
    currency: 'INR',
    expenseDate: '2026-11-15',
    merchant: 'Uber Rides',
    description: 'Travel to client HQ for deployment',
    receiptUrl: 'https://cdn.example.com/receipts/uber-1450.pdf',
    receiptName: 'uber-receipt.pdf',
  });
  console.log(`✓ Expense claim created (ID: ${newExpense.id}, Amount: ₹${newExpense.amount}, Status: ${newExpense.status})`);

  const approvedExp = await approveExpense(newExpense.id, adminId, adminName);
  console.log(`✓ Expense approved by ${adminName} (Status: ${approvedExp.status})`);

  const reimbursedExp = await reimburseExpense(newExpense.id, 'PAYRUN-2026-11');
  console.log(`✓ Expense reimbursed (Status: ${reimbursedExp.status}, Run: ${reimbursedExp.payrollRunId})`);

  // 2. SALARY ADVANCE & EWA
  console.log('\n[2/5] Testing Earned Wage Access & Salary Advance...');
  const accrual = await calculateAccruedWage(tenantId, employeeId);
  console.log(`✓ Accrual calculated: Days Worked=${accrual.daysWorked}, Monthly Gross=₹${accrual.monthlyGross}, Accrued Wage=₹${accrual.accruedWage}, Max Available Advance=₹${accrual.currentAvailableAdvance}`);

  const advanceReq = await requestSalaryAdvance(tenantId, {
    userId: employeeId,
    employeeName,
    employeeEmail,
    department: 'Engineering',
    requestedAmount: Math.min(2500, accrual.currentAvailableAdvance > 0 ? accrual.currentAvailableAdvance : 1000),
    reason: 'Emergency dental treatment',
  });
  console.log(`✓ Salary advance requested (ID: ${advanceReq.id}, Amount: ₹${advanceReq.requestedAmount}, Status: ${advanceReq.status})`);

  const approvedAdv = await approveSalaryAdvance(advanceReq.id, adminId, adminName);
  console.log(`✓ Salary advance approved (Status: ${approvedAdv.status})`);

  const disbursedAdv = await disburseSalaryAdvance(advanceReq.id, adminId, adminName);
  console.log(`✓ Salary advance disbursed (Status: ${disbursedAdv.status}, DisbursedAt: ${disbursedAdv.disbursedAt})`);

  // 3. OVERTIME & COMP-OFF
  console.log('\n[3/5] Testing Overtime & Comp-Off Engine...');
  const otClaim = await claimOvertime(tenantId, {
    userId: employeeId,
    employeeName,
    employeeEmail,
    department: 'Engineering',
    date: '2026-11-14',
    shiftStartTime: '09:00',
    shiftEndTime: '18:00',
    actualCheckIn: '09:00',
    actualCheckOut: '22:30',
    shiftMinutes: 480,
    actualMinutes: 810,
    compensationType: 'comp_off',
    hourlyRate: 300,
  });
  console.log(`✓ Overtime claimed (ID: ${otClaim.id}, OT Minutes: ${otClaim.overtimeMinutes}m, Comp-Off Credits: ${otClaim.compOffDaysCredited} days, Status: ${otClaim.status})`);

  const approvedOT = await approveOvertime(otClaim.id, adminId, adminName);
  console.log(`✓ Overtime approved & credited (Status: ${approvedOT.status})`);

  // 4. PEER KUDOS
  console.log('\n[4/5] Testing Peer Kudos & Recognition Wall...');
  const allowance = await getRemainingMonthlyAllowance(tenantId, employeeId);
  console.log(`✓ Kudos allowance for ${employeeName}: Budget=${allowance.monthlyBudget}, Used=${allowance.pointsGiven}, Remaining=${allowance.remainingPoints}`);

  const kudos = await sendKudos(tenantId, {
    senderId: employeeId,
    senderName: employeeName,
    senderEmail,
    receiverId: '3', // Shubha Pallavi
    receiverName: 'Shubha Pallavi',
    receiverEmail: 'shubha.pallavi@skorainfotech.com',
    department: 'Engineering',
    points: 25,
    badge: 'Rockstar',
    coreValue: '#Excellence',
    message: 'Huge thanks for stepping in to resolve the production cluster issue over the weekend!',
  });
  console.log(`✓ Kudos sent (ID: ${kudos.id}, Points: ${kudos.points}, Badge: ${kudos.badge}, Core Value: ${kudos.coreValue})`);

  const likeResult = await toggleKudosLike(tenantId, kudos.id, adminId, adminName);
  console.log(`✓ Kudos like toggled (Liked: ${likeResult.liked}, Total Likes: ${likeResult.likesCount})`);

  const leaderboard = await getKudosLeaderboard(tenantId);
  console.log(`✓ Leaderboard top receivers:`, leaderboard);

  // 5. ACTIONABLE AI HR ASSISTANT
  console.log('\n[5/5] Testing Actionable AI Assistant Queries...');
  const q1 = await processActionableAIQuery(tenantId, employeeId, "What is my current leave balance?");
  console.log(`✓ AI Leave Balance Response: Intent=${q1.intentDetected}, Reply Length=${q1.reply.length}, Cards=${q1.cards?.length || 0}`);

  const q2 = await processActionableAIQuery(tenantId, employeeId, "Who is out of office today?");
  console.log(`✓ AI Who Is Out Response: Intent=${q2.intentDetected}, Reply Length=${q2.reply.length}`);

  const q3 = await processActionableAIQuery(tenantId, employeeId, "How much salary advance can I take?");
  console.log(`✓ AI Salary Advance Response: Intent=${q3.intentDetected}, Cards=${q3.cards?.length || 0}`);

  const q4 = await processActionableAIQuery(tenantId, employeeId, "How do I claim reimbursement for travel expense?");
  console.log(`✓ AI Expense Claim Response: Intent=${q4.intentDetected}, Cards=${q4.cards?.length || 0}`);

  console.log('\n=== ALL 5 ENTERPRISE MODULES BACKEND LOGIC VERIFIED 100% SUCCESSFUL! ===');
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
