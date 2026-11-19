#!/usr/bin/env node
/**
 * Seeds Test Portal Tables, Composite Indexes, Question Bank & Default Assessments into MySQL.
 * Run via: node scripts/seed-tests-mysql.js
 */

const mysql = require("mysql2/promise");

const MYSQL_HOST = process.env.MYSQL_HOST || "localhost";
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || "root";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD ?? "";
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || "hrms";

async function main() {
  console.log(`Connecting to MySQL database "${MYSQL_DATABASE}" at ${MYSQL_HOST}:${MYSQL_PORT}...`);
  const pool = mysql.createPool({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 5,
  });

  try {
    // 1. Ensure test_* tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`test_definitions\` (
        \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
        \`legacyId\` char(24) DEFAULT NULL,
        \`tenantId\` varchar(64) NOT NULL DEFAULT 'default',
        \`title\` varchar(255) DEFAULT NULL,
        \`department\` varchar(64) DEFAULT NULL,
        \`status\` varchar(32) DEFAULT 'draft',
        \`createdBy\` varchar(64) DEFAULT NULL,
        \`createdAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`deletedAt\` datetime(3) DEFAULT NULL,
        \`payload\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_test_definitions_legacyId\` (\`legacyId\`),
        KEY \`ix_test_definitions_tenantId\` (\`tenantId\`),
        KEY \`ix_tests_dept_status\` (\`tenantId\`, \`department\`, \`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`test_questions\` (
        \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
        \`legacyId\` char(24) DEFAULT NULL,
        \`tenantId\` varchar(64) NOT NULL DEFAULT 'default',
        \`type\` varchar(32) DEFAULT 'MCQ',
        \`topic\` varchar(100) DEFAULT 'General',
        \`status\` varchar(32) DEFAULT 'ACTIVE',
        \`createdAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`deletedAt\` datetime(3) DEFAULT NULL,
        \`payload\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_test_questions_legacyId\` (\`legacyId\`),
        KEY \`ix_test_questions_tenantId\` (\`tenantId\`),
        KEY \`ix_questions_topic_status\` (\`tenantId\`, \`topic\`, \`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`test_attempts\` (
        \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
        \`legacyId\` char(24) DEFAULT NULL,
        \`tenantId\` varchar(64) NOT NULL DEFAULT 'default',
        \`testId\` varchar(64) DEFAULT NULL,
        \`userId\` varchar(64) DEFAULT NULL,
        \`status\` varchar(32) DEFAULT 'in_progress',
        \`createdAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`deletedAt\` datetime(3) DEFAULT NULL,
        \`payload\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_test_attempts_legacyId\` (\`legacyId\`),
        KEY \`ix_test_attempts_tenantId\` (\`tenantId\`),
        KEY \`ix_attempts_user_test\` (\`tenantId\`, \`userId\`, \`testId\`),
        KEY \`ix_attempts_test_status\` (\`tenantId\`, \`testId\`, \`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`test_answers\` (
        \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
        \`legacyId\` char(24) DEFAULT NULL,
        \`tenantId\` varchar(64) NOT NULL DEFAULT 'default',
        \`attemptId\` varchar(64) DEFAULT NULL,
        \`questionId\` varchar(64) DEFAULT NULL,
        \`createdAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`deletedAt\` datetime(3) DEFAULT NULL,
        \`payload\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_test_answers_legacyId\` (\`legacyId\`),
        KEY \`ix_test_answers_tenantId\` (\`tenantId\`),
        KEY \`ix_answers_attempt_q\` (\`tenantId\`, \`attemptId\`, \`questionId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`test_evaluations\` (
        \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
        \`legacyId\` char(24) DEFAULT NULL,
        \`tenantId\` varchar(64) NOT NULL DEFAULT 'default',
        \`attemptId\` varchar(64) DEFAULT NULL,
        \`evaluatorId\` varchar(64) DEFAULT NULL,
        \`status\` varchar(32) DEFAULT 'pending',
        \`createdAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`deletedAt\` datetime(3) DEFAULT NULL,
        \`payload\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_test_evaluations_legacyId\` (\`legacyId\`),
        KEY \`ix_test_evaluations_tenantId\` (\`tenantId\`),
        KEY \`ix_evals_attempt_status\` (\`tenantId\`, \`attemptId\`, \`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`test_results\` (
        \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
        \`legacyId\` char(24) DEFAULT NULL,
        \`tenantId\` varchar(64) NOT NULL DEFAULT 'default',
        \`testId\` varchar(64) DEFAULT NULL,
        \`userId\` varchar(64) DEFAULT NULL,
        \`grade\` varchar(32) DEFAULT NULL,
        \`createdAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`deletedAt\` datetime(3) DEFAULT NULL,
        \`payload\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_test_results_legacyId\` (\`legacyId\`),
        KEY \`ix_test_results_tenantId\` (\`tenantId\`),
        KEY \`ix_results_user_test\` (\`tenantId\`, \`userId\`, \`testId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    console.log("All 6 test_* tables verified with composite indexes.");

    // 2. Seed starter questions
    const sampleQuestions = [
      {
        type: "MCQ",
        text: "In JavaScript, what is the output of `typeof null`?",
        topic: "Engineering",
        status: "ACTIVE",
        options: [
          { id: "opt_1", text: "'null'" },
          { id: "opt_2", text: "'object'" },
          { id: "opt_3", text: "'undefined'" },
          { id: "opt_4", text: "'number'" },
        ],
        answerMode: "SINGLE",
        correctOptions: ["opt_2"],
        maxMarks: 2,
        suggestedDurationMinutes: 2,
      },
      {
        type: "MCQ",
        text: "Which SQL clause is used to filter records resulting from an aggregate function like `COUNT()` or `SUM()`?",
        topic: "Database",
        status: "ACTIVE",
        options: [
          { id: "opt_1", text: "WHERE" },
          { id: "opt_2", text: "ORDER BY" },
          { id: "opt_3", text: "HAVING" },
          { id: "opt_4", text: "GROUP BY" },
        ],
        answerMode: "SINGLE",
        correctOptions: ["opt_3"],
        maxMarks: 2,
        suggestedDurationMinutes: 2,
      },
      {
        type: "MCQ",
        text: "Under standard HR sandwich leaves policy, if an employee takes casual leave on Friday and Monday, how are Saturday and Sunday treated?",
        topic: "HR Policies",
        status: "ACTIVE",
        options: [
          { id: "opt_1", text: "Treated as standard paid weekly offs (2 days leave)" },
          { id: "opt_2", text: "Included in leave count as continuous leave (4 days leave)" },
          { id: "opt_3", text: "Treated as half-day leave" },
          { id: "opt_4", text: "Auto-converted to LWP" },
        ],
        answerMode: "SINGLE",
        correctOptions: ["opt_2"],
        maxMarks: 2,
        suggestedDurationMinutes: 2,
      },
      {
        type: "MCQ",
        text: "Which HTTP status code signifies that a client must authenticate itself to get the requested response?",
        topic: "General",
        status: "ACTIVE",
        options: [
          { id: "opt_1", text: "403 Forbidden" },
          { id: "opt_2", text: "401 Unauthorized" },
          { id: "opt_3", text: "404 Not Found" },
          { id: "opt_4", text: "400 Bad Request" },
        ],
        answerMode: "SINGLE",
        correctOptions: ["opt_2"],
        maxMarks: 2,
        suggestedDurationMinutes: 2,
      },
      {
        type: "DESCRIPTIVE",
        text: "Explain how you would design an idempotent background job for automated monthly leave accruals to prevent accidental double-crediting.",
        topic: "System Design",
        status: "ACTIVE",
        maxMarks: 10,
        suggestedDurationMinutes: 10,
        referenceAnswer: "Use deterministic idempotency keys formatted like `leave_accrual_<tenant>_<YYYY-MM>`, check existence before running, execute accrual updates in a database transaction, and log the execution with a unique constraint.",
      },
    ];

    console.log("Seeding sample question bank into MySQL...");
    const createdQuestionIds = [];
    for (const q of sampleQuestions) {
      const now = new Date().toISOString();
      const payload = JSON.stringify({ ...q, tenantId: "default", createdAt: now, updatedAt: now });
      const [res] = await pool.query(
        "INSERT INTO `test_questions` (`tenantId`, `type`, `topic`, `status`, `payload`) VALUES ('default', ?, ?, ?, ?)",
        [q.type, q.topic, q.status, payload]
      );
      createdQuestionIds.push(res.insertId.toString());
    }
    console.log(`Seeded ${createdQuestionIds.length} starter questions into Question Bank.`);

    // 3. Seed Starter Assessment
    const sampleTest = {
      title: "SKORA Full-Stack & Engineering Competency Test",
      description: "Baseline engineering assessment covering JavaScript runtime, SQL aggregation, idempotency system design, and organizational policies.",
      department: "Engineering",
      category: "Technical",
      durationMinutes: 30,
      totalMarks: 18,
      passPercentage: 60,
      status: "active",
      questionIds: createdQuestionIds,
      assignedDepartment: "All",
      proctoring: {
        requireFullscreen: false,
        maxViolationsAllowed: 3,
        lockOnViolationExceeded: true,
        autoSubmitOnTimerExpiry: true,
      },
      createdBy: "1",
      createdByName: "Super Admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log("Seeding default assessment...");
    const testPayload = JSON.stringify({ ...sampleTest, tenantId: "default" });
    await pool.query(
      "INSERT INTO `test_definitions` (`tenantId`, `title`, `department`, `status`, `createdBy`, `payload`) VALUES ('default', ?, ?, 'active', '1', ?)",
      [sampleTest.title, sampleTest.department, testPayload]
    );

    console.log("Assessment Portal seeding complete!");
  } catch (err) {
    console.error("Error during test portal seeding:", err);
  } finally {
    await pool.end();
  }
}

main();
