-- =========================================================================
-- Migration: 0001_enterprise_modules.sql
-- Purpose: Enterprise tables, statutory configurations, and baseline seeds
-- Idempotent: Can be safely executed multiple times
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. roles_permissions_matrix
CREATE TABLE IF NOT EXISTS `roles_permissions_matrix` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `role` varchar(64) NOT NULL,
  `module` varchar(64) NOT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_perm_role_mod` (`tenantId`, `role`, `module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. statutory_config
CREATE TABLE IF NOT EXISTS `statutory_config` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `configType` varchar(64) NOT NULL,
  `configData` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `effectiveFrom` date DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_statutory_cfg_type` (`tenantId`, `configType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. employee_tax_declarations
CREATE TABLE IF NOT EXISTS `employee_tax_declarations` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `userId` varchar(64) NOT NULL,
  `financialYear` varchar(16) NOT NULL,
  `regime` varchar(16) NOT NULL DEFAULT 'new',
  `status` varchar(32) NOT NULL DEFAULT 'submitted',
  `verifiedBy` varchar(64) DEFAULT NULL,
  `verifiedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tax_decl_user_fy` (`tenantId`, `userId`, `financialYear`),
  KEY `ix_tax_decl_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. ticket_read_states
CREATE TABLE IF NOT EXISTS `ticket_read_states` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `ticketId` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `lastReadAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ticket_read_user` (`ticketId`, `userId`),
  KEY `ix_ticket_read_tenant` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. cron_job_logs
CREATE TABLE IF NOT EXISTS `cron_job_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `jobName` varchar(128) DEFAULT NULL,
  `status` varchar(32) DEFAULT NULL,
  `executedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cron_job_logs_legacyId` (`legacyId`),
  KEY `ix_cron_job_logs_tenantId` (`tenantId`),
  KEY `ix_cron_job_logs_job` (`jobName`, `status`),
  KEY `ix_cron_job_logs_date` (`executedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Baseline Seeds (Idempotent: Only inserted if missing)
-- -----------------------------------------------------

-- Seed Default Expense Categories
INSERT INTO `expense_categories` (`tenantId`, `name`, `code`, `monthlyCap`, `requiresReceipt`, `description`, `status`)
SELECT 'default', 'Travel & Commute', 'TRAVEL', 15000.00, 1, 'Flight, train, taxi, fuel reimbursement', 'active'
WHERE NOT EXISTS (SELECT 1 FROM `expense_categories` WHERE `code` = 'TRAVEL');

INSERT INTO `expense_categories` (`tenantId`, `name`, `code`, `monthlyCap`, `requiresReceipt`, `description`, `status`)
SELECT 'default', 'Food & Client Dining', 'MEALS', 8000.00, 1, 'Client dinners, team meals, overtime meals', 'active'
WHERE NOT EXISTS (SELECT 1 FROM `expense_categories` WHERE `code` = 'MEALS');

INSERT INTO `expense_categories` (`tenantId`, `name`, `code`, `monthlyCap`, `requiresReceipt`, `description`, `status`)
SELECT 'default', 'Office & Tech Supplies', 'SUPPLIES', 10000.00, 1, 'Monitors, peripherals, stationery', 'active'
WHERE NOT EXISTS (SELECT 1 FROM `expense_categories` WHERE `code` = 'SUPPLIES');

INSERT INTO `expense_categories` (`tenantId`, `name`, `code`, `monthlyCap`, `requiresReceipt`, `description`, `status`)
SELECT 'default', 'Internet & Mobile', 'CONNECTIVITY', 3000.00, 1, 'Monthly home broadband & mobile plan', 'active'
WHERE NOT EXISTS (SELECT 1 FROM `expense_categories` WHERE `code` = 'CONNECTIVITY');

INSERT INTO `expense_categories` (`tenantId`, `name`, `code`, `monthlyCap`, `requiresReceipt`, `description`, `status`)
SELECT 'default', 'Training & Certifications', 'LEARNING', 25000.00, 1, 'Courses, exams, conferences, books', 'active'
WHERE NOT EXISTS (SELECT 1 FROM `expense_categories` WHERE `code` = 'LEARNING');

INSERT INTO `expense_categories` (`tenantId`, `name`, `code`, `monthlyCap`, `requiresReceipt`, `description`, `status`)
SELECT 'default', 'Miscellaneous', 'OTHER', 5000.00, 0, 'Other incidentals and office expenses', 'active'
WHERE NOT EXISTS (SELECT 1 FROM `expense_categories` WHERE `code` = 'OTHER');

-- Seed Statutory Configuration Defaults (India Payroll Compliance)
INSERT INTO `statutory_config` (`tenantId`, `configType`, `configData`, `effectiveFrom`, `status`)
SELECT 'default', 'EPFO', '{"employeeContributionRate": 0.12, "employerContributionRate": 0.12, "wageCeiling": 15000, "adminChargeRate": 0.005}', '2024-04-01', 'active'
WHERE NOT EXISTS (SELECT 1 FROM `statutory_config` WHERE `configType` = 'EPFO');

INSERT INTO `statutory_config` (`tenantId`, `configType`, `configData`, `effectiveFrom`, `status`)
SELECT 'default', 'ESIC', '{"employeeContributionRate": 0.0075, "employerContributionRate": 0.0325, "wageCeiling": 21000}', '2024-04-01', 'active'
WHERE NOT EXISTS (SELECT 1 FROM `statutory_config` WHERE `configType` = 'ESIC');

INSERT INTO `statutory_config` (`tenantId`, `configType`, `configData`, `effectiveFrom`, `status`)
SELECT 'default', 'PROFESSIONAL_TAX', '{"standardMonthlyDeduction": 200, "state": "General"}', '2024-04-01', 'active'
WHERE NOT EXISTS (SELECT 1 FROM `statutory_config` WHERE `configType` = 'PROFESSIONAL_TAX');

SET FOREIGN_KEY_CHECKS = 1;
