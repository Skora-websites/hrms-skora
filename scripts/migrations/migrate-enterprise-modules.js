const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'hrms',
  });
  console.log('Connected to MySQL. Creating tables...');

  // 1. expenses
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`expenses\` (
      \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
      \`legacyId\` char(24) DEFAULT NULL,
      \`tenantId\` varchar(64) NOT NULL DEFAULT 'default',
      \`userId\` varchar(64) NOT NULL,
      \`employeeName\` varchar(255) NOT NULL,
      \`employeeEmail\` varchar(255) NOT NULL,
      \`department\` varchar(128) DEFAULT NULL,
      \`category\` varchar(128) NOT NULL,
      \`amount\` decimal(12,2) NOT NULL,
      \`currency\` varchar(10) NOT NULL DEFAULT 'INR',
      \`expenseDate\` date NOT NULL,
      \`merchant\` varchar(255) DEFAULT NULL,
      \`description\` text DEFAULT NULL,
      \`receiptUrl\` varchar(500) DEFAULT NULL,
      \`receiptName\` varchar(255) DEFAULT NULL,
      \`status\` varchar(32) NOT NULL DEFAULT 'pending',
      \`approvedBy\` varchar(64) DEFAULT NULL,
      \`approvedByName\` varchar(255) DEFAULT NULL,
      \`approvedAt\` datetime(3) DEFAULT NULL,
      \`rejectionReason\` text DEFAULT NULL,
      \`reimbursedAt\` datetime(3) DEFAULT NULL,
      \`payrollRunId\` varchar(64) DEFAULT NULL,
      \`createdAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      \`deletedAt\` datetime(3) DEFAULT NULL,
      \`payload\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_expenses_legacyId\` (\`legacyId\`),
      KEY \`idx_expenses_user\` (\`userId\`),
      KEY \`idx_expenses_tenant\` (\`tenantId\`),
      KEY \`idx_expenses_status\` (\`status\`),
      KEY \`idx_expenses_date\` (\`expenseDate\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('expenses table checked/created');

  // 2. expense_categories
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`expense_categories\` (
      \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
      \`legacyId\` char(24) DEFAULT NULL,
      \`tenantId\` varchar(64) NOT NULL DEFAULT 'default',
      \`name\` varchar(128) NOT NULL,
      \`code\` varchar(64) NOT NULL,
      \`monthlyCap\` decimal(12,2) DEFAULT 0.00,
      \`requiresReceipt\` tinyint(1) DEFAULT 1,
      \`description\` text DEFAULT NULL,
      \`status\` varchar(32) DEFAULT 'active',
      \`createdAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      \`deletedAt\` datetime(3) DEFAULT NULL,
      \`payload\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_expense_cat_legacyId\` (\`legacyId\`),
      KEY \`idx_expense_cat_code\` (\`code\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('expense_categories table checked/created');

  // Seed default expense categories if empty
  const [catRows] = await conn.query('SELECT count(*) as cnt FROM expense_categories');
  if (catRows[0].cnt === 0) {
    const defaultCats = [
      ['Travel & Commute', 'TRAVEL', 15000, 1, 'Flight, train, taxi, fuel reimbursement'],
      ['Food & Client Dining', 'MEALS', 8000, 1, 'Client dinners, team meals, overtime meals'],
      ['Office & Tech Supplies', 'SUPPLIES', 10000, 1, 'Monitors, peripherals, stationery'],
      ['Internet & Mobile', 'CONNECTIVITY', 3000, 1, 'Monthly home broadband & mobile plan'],
      ['Training & Certifications', 'LEARNING', 25000, 1, 'Courses, exams, conferences, books'],
      ['Miscellaneous', 'OTHER', 5000, 0, 'Other incidentals and office expenses']
    ];
    for (const [name, code, cap, req, desc] of defaultCats) {
      await conn.query(
        'INSERT INTO expense_categories (tenantId, name, code, monthlyCap, requiresReceipt, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['default', name, code, cap, req, desc, 'active']
      );
    }
    console.log('Seeded 6 default expense categories');
  }

  // 3. salary_advances
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`salary_advances\` (
      \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
      \`legacyId\` char(24) DEFAULT NULL,
      \`tenantId\` varchar(64) NOT NULL DEFAULT 'default',
      \`userId\` varchar(64) NOT NULL,
      \`employeeName\` varchar(255) NOT NULL,
      \`employeeEmail\` varchar(255) NOT NULL,
      \`department\` varchar(128) DEFAULT NULL,
      \`requestedAmount\` decimal(12,2) NOT NULL,
      \`maxEligibleAmount\` decimal(12,2) NOT NULL,
      \`accruedWage\` decimal(12,2) NOT NULL,
      \`reason\` text NOT NULL,
      \`status\` varchar(32) NOT NULL DEFAULT 'pending',
      \`approvedBy\` varchar(64) DEFAULT NULL,
      \`approvedByName\` varchar(255) DEFAULT NULL,
      \`approvedAt\` datetime(3) DEFAULT NULL,
      \`rejectionReason\` text DEFAULT NULL,
      \`disbursedAt\` datetime(3) DEFAULT NULL,
      \`deductedPayrollMonth\` varchar(16) DEFAULT NULL,
      \`createdAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      \`deletedAt\` datetime(3) DEFAULT NULL,
      \`payload\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_salary_adv_legacyId\` (\`legacyId\`),
      KEY \`idx_salary_adv_user\` (\`userId\`),
      KEY \`idx_salary_adv_status\` (\`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('salary_advances table checked/created');

  // 4. overtime_records
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`overtime_records\` (
      \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
      \`legacyId\` char(24) DEFAULT NULL,
      \`tenantId\` varchar(64) NOT NULL DEFAULT 'default',
      \`userId\` varchar(64) NOT NULL,
      \`employeeName\` varchar(255) NOT NULL,
      \`employeeEmail\` varchar(255) NOT NULL,
      \`department\` varchar(128) DEFAULT NULL,
      \`date\` date NOT NULL,
      \`shiftStartTime\` varchar(16) DEFAULT '09:00',
      \`shiftEndTime\` varchar(16) DEFAULT '18:00',
      \`actualCheckIn\` varchar(32) DEFAULT NULL,
      \`actualCheckOut\` varchar(32) DEFAULT NULL,
      \`shiftMinutes\` int NOT NULL DEFAULT 480,
      \`actualMinutes\` int NOT NULL DEFAULT 0,
      \`overtimeMinutes\` int NOT NULL DEFAULT 0,
      \`compensationType\` varchar(32) NOT NULL DEFAULT 'pay',
      \`hourlyRate\` decimal(12,2) DEFAULT 0.00,
      \`overtimePay\` decimal(12,2) DEFAULT 0.00,
      \`compOffDaysCredited\` decimal(4,2) DEFAULT 0.00,
      \`status\` varchar(32) NOT NULL DEFAULT 'pending',
      \`approvedBy\` varchar(64) DEFAULT NULL,
      \`approvedByName\` varchar(255) DEFAULT NULL,
      \`approvedAt\` datetime(3) DEFAULT NULL,
      \`rejectionReason\` text DEFAULT NULL,
      \`createdAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      \`deletedAt\` datetime(3) DEFAULT NULL,
      \`payload\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_overtime_legacyId\` (\`legacyId\`),
      KEY \`idx_overtime_user\` (\`userId\`),
      KEY \`idx_overtime_date\` (\`date\`),
      KEY \`idx_overtime_status\` (\`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('overtime_records table checked/created');

  // 5. kudos
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`kudos\` (
      \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
      \`legacyId\` char(24) DEFAULT NULL,
      \`tenantId\` varchar(64) NOT NULL DEFAULT 'default',
      \`senderId\` varchar(64) NOT NULL,
      \`senderName\` varchar(255) NOT NULL,
      \`senderEmail\` varchar(255) NOT NULL,
      \`senderAvatar\` varchar(500) DEFAULT NULL,
      \`receiverId\` varchar(64) NOT NULL,
      \`receiverName\` varchar(255) NOT NULL,
      \`receiverEmail\` varchar(255) NOT NULL,
      \`receiverAvatar\` varchar(500) DEFAULT NULL,
      \`department\` varchar(128) DEFAULT NULL,
      \`points\` int NOT NULL DEFAULT 10,
      \`badge\` varchar(64) NOT NULL DEFAULT 'Team Player',
      \`coreValue\` varchar(64) NOT NULL DEFAULT '#Teamwork',
      \`message\` text NOT NULL,
      \`likesCount\` int NOT NULL DEFAULT 0,
      \`createdAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      \`deletedAt\` datetime(3) DEFAULT NULL,
      \`payload\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_kudos_legacyId\` (\`legacyId\`),
      KEY \`idx_kudos_receiver\` (\`receiverId\`),
      KEY \`idx_kudos_sender\` (\`senderId\`),
      KEY \`idx_kudos_created\` (\`createdAt\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('kudos table checked/created');

  // 6. kudos_likes
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`kudos_likes\` (
      \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
      \`tenantId\` varchar(64) NOT NULL DEFAULT 'default',
      \`kudosId\` varchar(64) NOT NULL,
      \`userId\` varchar(64) NOT NULL,
      \`userName\` varchar(255) NOT NULL,
      \`createdAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_kudos_user\` (\`kudosId\`, \`userId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('kudos_likes table checked/created');

  await conn.end();
  console.log('All migrations completed successfully.');
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
