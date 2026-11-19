#!/usr/bin/env node
/**
 * Seeds Ticket Categories and Routing Rules into the HRMS MySQL Database.
 * Run via: node scripts/seed-tickets-mysql.js
 */

const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

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
    // 1. Ensure tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`ticket_categories\` (
        \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
        \`legacyId\` char(24) DEFAULT NULL,
        \`tenantId\` varchar(64) NOT NULL DEFAULT 'default',
        \`createdAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`payload\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_ticket_categories_legacyId\` (\`legacyId\`),
        KEY \`ix_ticket_categories_tenantId\` (\`tenantId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`ticket_routing_rules\` (
        \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
        \`legacyId\` char(24) DEFAULT NULL,
        \`tenantId\` varchar(64) NOT NULL DEFAULT 'default',
        \`createdAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`payload\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_ticket_routing_rules_legacyId\` (\`legacyId\`),
        KEY \`ix_ticket_routing_rules_tenantId\` (\`tenantId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`tickets\` (
        \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
        \`legacyId\` char(24) DEFAULT NULL,
        \`tenantId\` varchar(64) NOT NULL DEFAULT 'default',
        \`status\` varchar(32) DEFAULT NULL,
        \`priority\` varchar(32) DEFAULT NULL,
        \`department\` varchar(64) DEFAULT NULL,
        \`requesterId\` varchar(64) DEFAULT NULL,
        \`assigneeId\` varchar(64) DEFAULT NULL,
        \`ticketNumber\` varchar(64) DEFAULT NULL,
        \`createdAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`deletedAt\` datetime(3) DEFAULT NULL,
        \`payload\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_tickets_legacyId\` (\`legacyId\`),
        KEY \`ix_tickets_tenantId\` (\`tenantId\`),
        KEY \`ix_tickets_dept_status\` (\`tenantId\`, \`department\`, \`status\`),
        KEY \`ix_tickets_requester\` (\`tenantId\`, \`requesterId\`),
        KEY \`ix_tickets_assignee\` (\`tenantId\`, \`assigneeId\`),
        KEY \`ix_tickets_number\` (\`ticketNumber\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`ticket_comments\` (
        \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
        \`legacyId\` char(24) DEFAULT NULL,
        \`tenantId\` varchar(64) NOT NULL DEFAULT 'default',
        \`ticketId\` varchar(64) DEFAULT NULL,
        \`authorId\` varchar(64) DEFAULT NULL,
        \`visibility\` varchar(32) DEFAULT 'public',
        \`createdAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`deletedAt\` datetime(3) DEFAULT NULL,
        \`payload\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_ticket_comments_legacyId\` (\`legacyId\`),
        KEY \`ix_ticket_comments_tenantId\` (\`tenantId\`),
        KEY \`ix_ticket_comments_ticket\` (\`tenantId\`, \`ticketId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`ticket_transfers\` (
        \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
        \`legacyId\` char(24) DEFAULT NULL,
        \`tenantId\` varchar(64) NOT NULL DEFAULT 'default',
        \`ticketId\` varchar(64) DEFAULT NULL,
        \`toDepartment\` varchar(64) DEFAULT NULL,
        \`status\` varchar(32) DEFAULT 'pending',
        \`createdAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`deletedAt\` datetime(3) DEFAULT NULL,
        \`payload\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_ticket_transfers_legacyId\` (\`legacyId\`),
        KEY \`ix_ticket_transfers_tenantId\` (\`tenantId\`),
        KEY \`ix_ticket_transfers_dept\` (\`tenantId\`, \`toDepartment\`, \`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 2. Default Categories
    const categories = [
      { name: "IT Support", code: "it_support", description: "Hardware, software, VPN, access requests", color: "#3b82f6", isActive: true },
      { name: "HR & People Ops", code: "hr_people", description: "Policies, leaves, onboarding, letters", color: "#ec4899", isActive: true },
      { name: "Payroll & Compensation", code: "payroll", description: "Payslips, tax deductions, reimbursements, salary advances", color: "#10b981", isActive: true },
      { name: "Engineering & Dev", code: "engineering", description: "Bug reports, deployment, API issues, infrastructure", color: "#8b5cf6", isActive: true },
      { name: "Marketing & Design", code: "marketing", description: "Brand collateral, website updates, creatives", color: "#f59e0b", isActive: true },
      { name: "Sales & Client Ops", code: "sales", description: "Client query escalations, billing, contracts", color: "#06b6d4", isActive: true },
      { name: "General Administration", code: "general", description: "Office facilities, cafeteria, supplies", color: "#64748b", isActive: true },
    ];

    console.log("Seeding ticket categories into MySQL...");
    for (const cat of categories) {
      const payload = JSON.stringify({ ...cat, tenantId: "default" });
      await pool.query(
        "INSERT INTO `ticket_categories` (`tenantId`, `payload`) VALUES ('default', ?) ON DUPLICATE KEY UPDATE `payload` = VALUES(`payload`)",
        [payload]
      );
    }
    console.log(`Seeded ${categories.length} ticket categories.`);

    // 3. Default Routing Rules
    const routingRules = [
      {
        name: "Urgent Bug / Outage → Engineering",
        matchType: "any",
        conditions: [
          { field: "keyword", operator: "contains", value: "bug" },
          { field: "keyword", operator: "contains", value: "crash" },
          { field: "keyword", operator: "contains", value: "outage" },
          { field: "keyword", operator: "contains", value: "server down" },
          { field: "category", operator: "equals", value: "Engineering & Dev" },
        ],
        actions: [
          { type: "assign_department", value: "Engineering" },
          { type: "set_priority", value: "urgent" },
        ],
        status: "active",
        order: 1,
      },
      {
        name: "Hardware / Laptop / VPN → IT Support",
        matchType: "any",
        conditions: [
          { field: "keyword", operator: "contains", value: "laptop" },
          { field: "keyword", operator: "contains", value: "vpn" },
          { field: "keyword", operator: "contains", value: "wifi" },
          { field: "keyword", operator: "contains", value: "mouse" },
          { field: "category", operator: "equals", value: "IT Support" },
        ],
        actions: [
          { type: "assign_department", value: "IT" },
        ],
        status: "active",
        order: 2,
      },
      {
        name: "Salary / Reimbursement / Tax → Finance",
        matchType: "any",
        conditions: [
          { field: "keyword", operator: "contains", value: "salary" },
          { field: "keyword", operator: "contains", value: "payslip" },
          { field: "keyword", operator: "contains", value: "reimbursement" },
          { field: "keyword", operator: "contains", value: "tax" },
          { field: "category", operator: "equals", value: "Payroll & Compensation" },
        ],
        actions: [
          { type: "assign_department", value: "Finance" },
        ],
        status: "active",
        order: 3,
      },
      {
        name: "Policy / Leave / Document Request → HR",
        matchType: "any",
        conditions: [
          { field: "keyword", operator: "contains", value: "leave" },
          { field: "keyword", operator: "contains", value: "holiday" },
          { field: "keyword", operator: "contains", value: "experience letter" },
          { field: "category", operator: "equals", value: "HR & People Ops" },
        ],
        actions: [
          { type: "assign_department", value: "HR" },
        ],
        status: "active",
        order: 4,
      },
    ];

    console.log("Seeding ticket routing rules into MySQL...");
    for (const rule of routingRules) {
      const payload = JSON.stringify({ ...rule, tenantId: "default" });
      await pool.query(
        "INSERT INTO `ticket_routing_rules` (`tenantId`, `payload`) VALUES ('default', ?) ON DUPLICATE KEY UPDATE `payload` = VALUES(`payload`)",
        [payload]
      );
    }
    console.log(`Seeded ${routingRules.length} ticket routing rules.`);
    console.log("Ticket system MySQL seeding complete!");
  } catch (err) {
    console.error("Error during ticket seeding:", err);
  } finally {
    await pool.end();
  }
}

main();
