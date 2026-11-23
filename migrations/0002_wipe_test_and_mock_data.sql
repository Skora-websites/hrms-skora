-- =========================================================================
-- Migration 0002: Wipe Test, Demo, and Mock Artifacts
-- Safely removes test suite artifacts, demo accounts, dummy notifications,
-- mock tickets, candidate probes, and duplicate test definitions
-- while STRICTLY preserving authentic corporate accounts and records.
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Create temporary table of dummy user keys (numeric IDs and legacy string IDs)
DROP TEMPORARY TABLE IF EXISTS tmp_dummy_user_keys;
CREATE TEMPORARY TABLE tmp_dummy_user_keys (
  userKey VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci PRIMARY KEY
);

INSERT IGNORE INTO tmp_dummy_user_keys (userKey)
SELECT CAST(id AS CHAR(64)) COLLATE utf8mb4_general_ci FROM users
WHERE email LIKE '%@company.com'
   OR email LIKE '%@test.example.com'
   OR email LIKE '%@example.com'
   OR email LIKE '%@skora.internal'
   OR email LIKE '%demo%'
   OR email LIKE '%test%'
   OR email LIKE '%probe%'
   OR email LIKE '%placeholder%'
   OR email LIKE '%dummy%';

INSERT IGNORE INTO tmp_dummy_user_keys (userKey)
SELECT legacyId COLLATE utf8mb4_general_ci FROM users
WHERE (email LIKE '%@company.com'
   OR email LIKE '%@test.example.com'
   OR email LIKE '%@example.com'
   OR email LIKE '%@skora.internal'
   OR email LIKE '%demo%'
   OR email LIKE '%test%'
   OR email LIKE '%probe%'
   OR email LIKE '%placeholder%'
   OR email LIKE '%dummy%')
  AND legacyId IS NOT NULL;

-- 2. Delete test / probe notifications (both owned by dummy users and dummy account requests sent to admin)
DELETE FROM notifications
WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys)
   OR body LIKE '%@company.com%'
   OR body LIKE '%@test.example.com%'
   OR body LIKE '%@example.com%'
   OR body LIKE '%@skora.internal%'
   OR title LIKE '%Audit%'
   OR title LIKE '%Workflow Integration%';

-- 3. Delete sessions and password resets for dummy accounts
DELETE FROM sessions WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys);
DELETE FROM password_resets WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys);

-- 4. Delete push notifications and subscriptions for dummy accounts
DELETE FROM push_notifications WHERE sentTo COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys) OR sentBy COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys);
DELETE FROM push_subscriptions WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys);

-- 5. Delete dummy onboarding tasks
DELETE FROM employee_onboarding_tasks
WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys)
   OR email LIKE '%@company.com'
   OR email LIKE '%@test.example.com'
   OR email LIKE '%@example.com'
   OR email LIKE '%@skora.internal'
   OR email LIKE '%test.com%';

-- 6. Delete leave requests, balances, and history for dummy accounts
DELETE FROM leave_requests WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys);
DELETE FROM leave_balances WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys);
DELETE FROM leave_balance_history WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys);

-- 7. Delete expenses and timesheets for dummy accounts
DELETE FROM expenses WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys);
DELETE FROM timesheets WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys);

-- 8. Delete attendance records for dummy accounts
DELETE FROM attendance WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys);

-- 9. Delete payroll transactions and payslips for dummy accounts
DELETE FROM payroll_transactions WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys);
DELETE FROM payslips WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys);

-- 10. Delete performance reviews, goals, and feedback for dummy accounts
DELETE FROM performance_feedback WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys);
DELETE FROM performance_goals WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys);
DELETE FROM performance_kpis WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys);
DELETE FROM performance_reviews WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys);

-- 11. Delete test tasks and audit project tasks
DELETE FROM project_members WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys);
DELETE FROM tasks
WHERE assigneeId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys)
   OR title LIKE 'Audit Task Test%'
   OR title LIKE 'Workflow Integration Task%';

-- 12. Delete mock projects
DELETE FROM projects
WHERE name LIKE 'Audit Project%'
   OR name LIKE 'Dept Project%'
   OR name LIKE 'Browser E2E%';

-- 13. Delete mock tickets
DELETE FROM tickets
WHERE raisedById COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys)
   OR assignedToId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys)
   OR subject LIKE 'Audit Support Ticket%'
   OR raisedById IS NULL;

-- 14. Delete mock candidate test attempts and results
DELETE FROM test_attempts WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys) OR userId LIKE 'cand_%' OR userId IS NULL;
DELETE FROM test_results WHERE userId COLLATE utf8mb4_general_ci IN (SELECT userKey FROM tmp_dummy_user_keys) OR userId LIKE 'cand_%' OR userId IS NULL;

-- 15. Delete duplicate test definitions from test seeds
DELETE FROM test_definitions WHERE createdBy = 'admin_1' OR title IS NULL;

-- 16. Delete email delivery logs for dummy domains
DELETE FROM email_delivery_logs
WHERE `to` LIKE '%@company.com'
   OR `to` LIKE '%@test.example.com'
   OR `to` LIKE '%@example.com'
   OR `to` LIKE '%@skora.internal';

-- 17. Delete dummy users themselves
DELETE FROM users
WHERE email LIKE '%@company.com'
   OR email LIKE '%@test.example.com'
   OR email LIKE '%@example.com'
   OR email LIKE '%@skora.internal'
   OR email LIKE '%demo%'
   OR email LIKE '%test%'
   OR email LIKE '%probe%'
   OR email LIKE '%placeholder%'
   OR email LIKE '%dummy%';

DROP TEMPORARY TABLE IF EXISTS tmp_dummy_user_keys;
SET FOREIGN_KEY_CHECKS = 1;
