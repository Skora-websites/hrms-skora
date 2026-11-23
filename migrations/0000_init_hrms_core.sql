-- =========================================================================
-- HRMS Core Database Schema (Auto-generated Initial Baseline)
-- Compatible with MySQL 5.7+ / MySQL 8.0+ / MariaDB 10.3+
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------
-- Table structure for table `ai_chat_messages`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `ai_chat_messages` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `userId` varchar(64) DEFAULT NULL,
  `role` varchar(20) DEFAULT NULL,
  `content` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ai_legacyId` (`legacyId`),
  KEY `ix_ai_tenantId` (`tenantId`),
  KEY `ix_ai_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `applications`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `applications` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `candidateId` varchar(64) NOT NULL,
  `jobId` varchar(64) NOT NULL,
  `status` varchar(30) DEFAULT NULL,
  `appliedAt` datetime(3) DEFAULT NULL,
  `interviewAt` datetime(3) DEFAULT NULL,
  `note` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_applications_legacyId` (`legacyId`),
  KEY `ix_applications_tenantId` (`tenantId`),
  KEY `ix_applications_candidateId` (`candidateId`),
  KEY `ix_applications_jobId` (`jobId`),
  KEY `ix_applications_status` (`status`),
  CONSTRAINT `ck_applications_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `asset_categories`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `asset_categories` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `color` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_asset_categories_legacyId` (`legacyId`),
  KEY `ix_asset_categories_tenantId` (`tenantId`),
  CONSTRAINT `ck_asset_categories_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `assets`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `assets` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `name` varchar(200) NOT NULL,
  `assetTag` varchar(50) DEFAULT NULL,
  `categoryId` varchar(64) DEFAULT NULL,
  `categoryName` varchar(100) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `assignedToId` varchar(64) DEFAULT NULL,
  `assignedToName` varchar(200) DEFAULT NULL,
  `assignedAt` datetime(3) DEFAULT NULL,
  `serialNumber` varchar(100) DEFAULT NULL,
  `purchaseDate` date DEFAULT NULL,
  `value` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_assets_legacyId` (`legacyId`),
  KEY `ix_assets_tenantId` (`tenantId`),
  KEY `ix_assets_categoryId` (`categoryId`),
  KEY `ix_assets_status` (`status`),
  KEY `ix_assets_assignedToId` (`assignedToId`),
  CONSTRAINT `ck_assets_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `attendance`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) NOT NULL,
  `date` date NOT NULL,
  `checkIn` datetime(3) DEFAULT NULL,
  `checkOut` datetime(3) DEFAULT NULL,
  `shiftId` varchar(64) DEFAULT NULL,
  `weeklyOffId` varchar(64) DEFAULT NULL,
  `workdayType` varchar(20) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `totalHours` decimal(12,2) DEFAULT NULL,
  `overtimeHours` decimal(12,2) DEFAULT NULL,
  `isLate` tinyint(1) DEFAULT NULL,
  `isEarlyDeparture` tinyint(1) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `source` varchar(20) DEFAULT NULL,
  `workLocation` varchar(20) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `currentLocation` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'AES-256-GCM encrypted at the application layer (KMS key)' CHECK (json_valid(`currentLocation`)),
  `auxHistory` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`auxHistory`)),
  `aux` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_user_date` (`tenantId`,`userId`,`date`),
  UNIQUE KEY `uq_attendance_legacyId` (`legacyId`),
  KEY `ix_attendance_tenantId` (`tenantId`),
  KEY `ix_attendance_userId` (`userId`),
  KEY `ix_attendance_status` (`status`),
  CONSTRAINT `ck_attendance_payload_json` CHECK (`payload` is null or json_valid(`payload`)),
  CONSTRAINT `ck_attendance_currentLocation_json` CHECK (`currentLocation` is null or json_valid(`currentLocation`)),
  CONSTRAINT `ck_attendance_auxHistory_json` CHECK (`auxHistory` is null or json_valid(`auxHistory`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `audit_logs`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `action` varchar(50) NOT NULL,
  `performedById` varchar(64) DEFAULT NULL,
  `performedByName` varchar(200) DEFAULT NULL,
  `targetUserId` varchar(64) DEFAULT NULL,
  `targetUserEmail` varchar(254) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `ipAddress` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_audit_logs_legacyId` (`legacyId`),
  KEY `ix_audit_logs_tenantId` (`tenantId`),
  KEY `ix_audit_logs_action` (`action`),
  KEY `ix_audit_logs_performedById` (`performedById`),
  CONSTRAINT `ck_audit_logs_payload_json` CHECK (`payload` is null or json_valid(`payload`)),
  CONSTRAINT `ck_audit_logs_metadata_json` CHECK (`metadata` is null or json_valid(`metadata`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `candidates`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `candidates` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `name` varchar(200) NOT NULL,
  `email` varchar(254) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `jobId` varchar(64) DEFAULT NULL,
  `stage` varchar(30) DEFAULT NULL,
  `source` varchar(50) DEFAULT NULL,
  `resumeUrl` varchar(500) DEFAULT NULL,
  `rating` int(11) DEFAULT NULL,
  `appliedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_candidates_legacyId` (`legacyId`),
  KEY `ix_candidates_tenantId` (`tenantId`),
  KEY `ix_candidates_jobId` (`jobId`),
  KEY `ix_candidates_stage` (`stage`),
  CONSTRAINT `ck_candidates_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `counters`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `counters` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `name` varchar(100) NOT NULL,
  `value` int(11) DEFAULT NULL,
  `seq` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `counters_name` (`tenantId`,`name`),
  UNIQUE KEY `uq_counters_legacyId` (`legacyId`),
  KEY `ix_counters_tenantId` (`tenantId`),
  KEY `ix_counters_name` (`name`),
  CONSTRAINT `ck_counters_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `custom_report_definitions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `custom_report_definitions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_custom_report_definitions_legacyId` (`legacyId`),
  KEY `ix_custom_report_definitions_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `deals`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `deals` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `stage` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `amount` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_deals_legacyId` (`legacyId`),
  KEY `ix_deals_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `department_headcount_plans`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `department_headcount_plans` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_department_headcount_plans_legacyId` (`legacyId`),
  KEY `ix_department_headcount_plans_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `departments`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `departments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `name` varchar(200) NOT NULL,
  `code` varchar(30) DEFAULT NULL,
  `headUserId` varchar(64) DEFAULT NULL,
  `headName` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_departments_legacyId` (`legacyId`),
  KEY `ix_departments_tenantId` (`tenantId`),
  CONSTRAINT `ck_departments_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `designations`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `designations` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `name` varchar(200) NOT NULL,
  `code` varchar(30) DEFAULT NULL,
  `level` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_designations_legacyId` (`legacyId`),
  KEY `ix_designations_tenantId` (`tenantId`),
  CONSTRAINT `ck_designations_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `document_categories`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `document_categories` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_document_categories_legacyId` (`legacyId`),
  KEY `ix_document_categories_tenantId` (`tenantId`),
  CONSTRAINT `ck_document_categories_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `document_letter_templates`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `document_letter_templates` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_document_letter_templates_legacyId` (`legacyId`),
  KEY `ix_document_letter_templates_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `documents`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `documents` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) NOT NULL,
  `title` varchar(250) NOT NULL,
  `description` text DEFAULT NULL,
  `categoryId` varchar(64) DEFAULT NULL,
  `fileName` varchar(255) DEFAULT NULL,
  `mimeType` varchar(100) DEFAULT NULL,
  `size` int(11) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `verifiedAt` datetime(3) DEFAULT NULL,
  `verifiedById` varchar(64) DEFAULT NULL,
  `fileUrl` varchar(500) DEFAULT NULL,
  `filePath` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_documents_legacyId` (`legacyId`),
  KEY `ix_documents_tenantId` (`tenantId`),
  KEY `ix_documents_userId` (`userId`),
  KEY `ix_documents_categoryId` (`categoryId`),
  KEY `ix_documents_status` (`status`),
  CONSTRAINT `ck_documents_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `early_departure_requests`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `early_departure_requests` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) NOT NULL,
  `attendanceId` varchar(64) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `requestedAt` datetime(3) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `decidedAt` datetime(3) DEFAULT NULL,
  `decidedById` varchar(64) DEFAULT NULL,
  `decidedByName` varchar(200) DEFAULT NULL,
  `decisionNote` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_early_departure_requests_legacyId` (`legacyId`),
  KEY `ix_early_departure_requests_tenantId` (`tenantId`),
  KEY `ix_early_departure_requests_userId` (`userId`),
  KEY `ix_early_departure_requests_attendanceId` (`attendanceId`),
  KEY `ix_early_departure_requests_date` (`date`),
  KEY `ix_early_departure_requests_status` (`status`),
  CONSTRAINT `ck_early_departure_requests_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `email_delivery_logs`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `email_delivery_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `to` varchar(254) NOT NULL,
  `subject` varchar(500) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `provider` varchar(20) DEFAULT NULL,
  `hasAttachment` tinyint(1) DEFAULT NULL,
  `error` text DEFAULT NULL,
  `sentAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email_delivery_logs_legacyId` (`legacyId`),
  KEY `ix_email_delivery_logs_tenantId` (`tenantId`),
  KEY `ix_email_delivery_logs_status` (`status`),
  CONSTRAINT `ck_email_delivery_logs_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `employee_onboarding_tasks`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `employee_onboarding_tasks` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `onboardingId` varchar(64) DEFAULT NULL,
  `userId` varchar(64) DEFAULT NULL,
  `email` varchar(254) DEFAULT NULL,
  `employeeName` varchar(200) DEFAULT NULL,
  `department` varchar(200) DEFAULT NULL,
  `designation` varchar(200) DEFAULT NULL,
  `employeeCode` varchar(30) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `submittedAt` datetime(3) DEFAULT NULL,
  `completedAt` datetime(3) DEFAULT NULL,
  `onboardingDetails` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'AES-256-GCM encrypted at the application layer (KMS key)' CHECK (json_valid(`onboardingDetails`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_employee_onboarding_tasks_legacyId` (`legacyId`),
  KEY `ix_employee_onboarding_tasks_tenantId` (`tenantId`),
  KEY `ix_employee_onboarding_tasks_onboardingId` (`onboardingId`),
  KEY `ix_employee_onboarding_tasks_userId` (`userId`),
  KEY `ix_employee_onboarding_tasks_employeeCode` (`employeeCode`),
  KEY `ix_employee_onboarding_tasks_status` (`status`),
  CONSTRAINT `ck_employee_onboarding_tasks_payload_json` CHECK (`payload` is null or json_valid(`payload`)),
  CONSTRAINT `ck_employee_onboarding_tasks_onboardingDetails_json` CHECK (`onboardingDetails` is null or json_valid(`onboardingDetails`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `engage_comments`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `engage_comments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `postId` varchar(64) NOT NULL,
  `authorId` varchar(64) DEFAULT NULL,
  `authorName` varchar(200) DEFAULT NULL,
  `content` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_engage_comments_legacyId` (`legacyId`),
  KEY `ix_engage_comments_tenantId` (`tenantId`),
  KEY `ix_engage_comments_postId` (`postId`),
  CONSTRAINT `ck_engage_comments_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `engage_posts`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `engage_posts` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `authorId` varchar(64) NOT NULL,
  `authorName` varchar(200) DEFAULT NULL,
  `content` text NOT NULL,
  `type` varchar(20) DEFAULT NULL,
  `likeCount` int(11) DEFAULT NULL,
  `commentCount` int(11) DEFAULT NULL,
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attachments`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_engage_posts_legacyId` (`legacyId`),
  KEY `ix_engage_posts_tenantId` (`tenantId`),
  KEY `ix_engage_posts_authorId` (`authorId`),
  CONSTRAINT `ck_engage_posts_payload_json` CHECK (`payload` is null or json_valid(`payload`)),
  CONSTRAINT `ck_engage_posts_attachments_json` CHECK (`attachments` is null or json_valid(`attachments`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `escalations`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `escalations` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) DEFAULT NULL,
  `title` varchar(250) NOT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `priority` varchar(20) DEFAULT NULL,
  `raisedById` varchar(64) DEFAULT NULL,
  `raisedByName` varchar(200) DEFAULT NULL,
  `decidedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_escalations_legacyId` (`legacyId`),
  KEY `ix_escalations_tenantId` (`tenantId`),
  KEY `ix_escalations_userId` (`userId`),
  KEY `ix_escalations_status` (`status`),
  CONSTRAINT `ck_escalations_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `exit_records`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `exit_records` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) NOT NULL,
  `status` varchar(20) DEFAULT NULL,
  `resignationDate` date DEFAULT NULL,
  `lastWorkingDate` date DEFAULT NULL,
  `noticePeriodDays` int(11) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `exitInterview` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`exitInterview`)),
  `clearance` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`clearance`)),
  `experienceLetterGeneratedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_exit_records_legacyId` (`legacyId`),
  KEY `ix_exit_records_tenantId` (`tenantId`),
  KEY `ix_exit_records_userId` (`userId`),
  KEY `ix_exit_records_status` (`status`),
  CONSTRAINT `ck_exit_records_payload_json` CHECK (`payload` is null or json_valid(`payload`)),
  CONSTRAINT `ck_exit_records_exitInterview_json` CHECK (`exitInterview` is null or json_valid(`exitInterview`)),
  CONSTRAINT `ck_exit_records_clearance_json` CHECK (`clearance` is null or json_valid(`clearance`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `exit_settlements`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `exit_settlements` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_exit_settlements_legacyId` (`legacyId`),
  KEY `ix_exit_settlements_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `expense_categories`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `expense_categories` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `name` varchar(128) NOT NULL,
  `code` varchar(64) NOT NULL,
  `monthlyCap` decimal(12,2) DEFAULT 0.00,
  `requiresReceipt` tinyint(1) DEFAULT 1,
  `description` text DEFAULT NULL,
  `status` varchar(32) DEFAULT 'active',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_expense_cat_legacyId` (`legacyId`),
  KEY `idx_expense_cat_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table structure for table `expenses`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `userId` varchar(64) NOT NULL,
  `employeeName` varchar(255) NOT NULL,
  `employeeEmail` varchar(255) NOT NULL,
  `department` varchar(128) DEFAULT NULL,
  `category` varchar(128) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'INR',
  `expenseDate` date NOT NULL,
  `merchant` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `receiptUrl` varchar(500) DEFAULT NULL,
  `receiptName` varchar(255) DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `approvedBy` varchar(64) DEFAULT NULL,
  `approvedByName` varchar(255) DEFAULT NULL,
  `approvedAt` datetime(3) DEFAULT NULL,
  `rejectionReason` text DEFAULT NULL,
  `reimbursedAt` datetime(3) DEFAULT NULL,
  `payrollRunId` varchar(64) DEFAULT NULL,
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_expenses_legacyId` (`legacyId`),
  KEY `idx_expenses_user` (`userId`),
  KEY `idx_expenses_tenant` (`tenantId`),
  KEY `idx_expenses_status` (`status`),
  KEY `idx_expenses_date` (`expenseDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table structure for table `files`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `files` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) DEFAULT NULL,
  `fileName` varchar(255) DEFAULT NULL,
  `mimeType` varchar(100) DEFAULT NULL,
  `size` int(11) DEFAULT NULL,
  `category` varchar(30) DEFAULT NULL,
  `storagePath` varchar(500) DEFAULT NULL,
  `checksum` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_files_legacyId` (`legacyId`),
  UNIQUE KEY `uq_files_storagePath` (`storagePath`),
  KEY `ix_files_tenantId` (`tenantId`),
  KEY `ix_files_userId` (`userId`),
  CONSTRAINT `ck_files_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `generated_employee_letters`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `generated_employee_letters` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_generated_employee_letters_legacyId` (`legacyId`),
  KEY `ix_generated_employee_letters_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `holidays`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `holidays` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `name` varchar(200) NOT NULL,
  `date` date NOT NULL,
  `type` varchar(30) DEFAULT NULL,
  `recurring` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_holidays_legacyId` (`legacyId`),
  KEY `ix_holidays_tenantId` (`tenantId`),
  KEY `ix_holidays_date` (`date`),
  CONSTRAINT `ck_holidays_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `internal_job_postings`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `internal_job_postings` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_internal_job_postings_legacyId` (`legacyId`),
  KEY `ix_internal_job_postings_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `jobs`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `jobs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `title` varchar(200) NOT NULL,
  `department` varchar(200) DEFAULT NULL,
  `designation` varchar(200) DEFAULT NULL,
  `location` varchar(200) DEFAULT NULL,
  `employmentType` varchar(30) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `openings` int(11) DEFAULT NULL,
  `closingDate` date DEFAULT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_jobs_legacyId` (`legacyId`),
  KEY `ix_jobs_tenantId` (`tenantId`),
  KEY `ix_jobs_status` (`status`),
  CONSTRAINT `ck_jobs_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `kudos`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `kudos` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `senderId` varchar(64) NOT NULL,
  `senderName` varchar(255) NOT NULL,
  `senderEmail` varchar(255) NOT NULL,
  `senderAvatar` varchar(500) DEFAULT NULL,
  `receiverId` varchar(64) NOT NULL,
  `receiverName` varchar(255) NOT NULL,
  `receiverEmail` varchar(255) NOT NULL,
  `receiverAvatar` varchar(500) DEFAULT NULL,
  `department` varchar(128) DEFAULT NULL,
  `points` int(11) NOT NULL DEFAULT 10,
  `badge` varchar(64) NOT NULL DEFAULT 'Team Player',
  `coreValue` varchar(64) NOT NULL DEFAULT '#Teamwork',
  `message` text NOT NULL,
  `likesCount` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kudos_legacyId` (`legacyId`),
  KEY `idx_kudos_receiver` (`receiverId`),
  KEY `idx_kudos_sender` (`senderId`),
  KEY `idx_kudos_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table structure for table `kudos_likes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `kudos_likes` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `kudosId` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `userName` varchar(255) NOT NULL,
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kudos_user` (`kudosId`,`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table structure for table `leads`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `leads` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `source` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_leads_legacyId` (`legacyId`),
  KEY `ix_leads_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `leave_balance_history`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `leave_balance_history` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) NOT NULL,
  `leaveTypeId` varchar(64) DEFAULT NULL,
  `year` int(11) DEFAULT NULL,
  `delta` decimal(12,2) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `referenceId` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_leave_balance_history_legacyId` (`legacyId`),
  KEY `ix_leave_balance_history_tenantId` (`tenantId`),
  KEY `ix_leave_balance_history_userId` (`userId`),
  CONSTRAINT `ck_leave_balance_history_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `leave_balances`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `leave_balances` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) NOT NULL,
  `leaveTypeId` varchar(64) DEFAULT NULL,
  `year` int(11) NOT NULL,
  `entitled` decimal(12,2) DEFAULT NULL,
  `taken` decimal(12,2) DEFAULT NULL,
  `balance` decimal(12,2) DEFAULT NULL,
  `carriedForward` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_leave_balances_legacyId` (`legacyId`),
  UNIQUE KEY `leave_balance_user_type_year` (`tenantId`,`userId`,`leaveTypeId`,`year`),
  KEY `ix_leave_balances_tenantId` (`tenantId`),
  KEY `ix_leave_balances_userId` (`userId`),
  KEY `ix_leave_balances_leaveTypeId` (`leaveTypeId`),
  KEY `ix_leave_balances_year` (`year`),
  CONSTRAINT `ck_leave_balances_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `leave_requests`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) NOT NULL,
  `leaveTypeId` varchar(64) DEFAULT NULL,
  `leaveTypeName` varchar(100) DEFAULT NULL,
  `fromDate` date NOT NULL,
  `toDate` date NOT NULL,
  `totalDays` decimal(12,2) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `attachmentURL` varchar(500) DEFAULT NULL,
  `attachmentName` varchar(200) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `decidedAt` datetime(3) DEFAULT NULL,
  `approvedById` varchar(64) DEFAULT NULL,
  `approvedByName` varchar(200) DEFAULT NULL,
  `decisionNote` text DEFAULT NULL,
  `halfDay` tinyint(1) DEFAULT NULL,
  `ceoReviewRequested` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_leave_requests_legacyId` (`legacyId`),
  KEY `ix_leave_requests_tenantId` (`tenantId`),
  KEY `ix_leave_requests_userId` (`userId`),
  KEY `ix_leave_requests_leaveTypeId` (`leaveTypeId`),
  KEY `ix_leave_requests_fromDate` (`fromDate`),
  KEY `ix_leave_requests_toDate` (`toDate`),
  KEY `ix_leave_requests_status` (`status`),
  CONSTRAINT `ck_leave_requests_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `leave_types`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `leave_types` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `name` varchar(100) NOT NULL,
  `code` varchar(30) DEFAULT NULL,
  `color` varchar(30) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `annualQuota` int(11) DEFAULT NULL,
  `accrualType` varchar(30) DEFAULT NULL,
  `paid` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_leave_types_legacyId` (`legacyId`),
  KEY `ix_leave_types_tenantId` (`tenantId`),
  CONSTRAINT `ck_leave_types_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `milestones`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `milestones` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `projectId` varchar(64) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `dueDate` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ms_legacyId` (`legacyId`),
  KEY `ix_ms_tenantId` (`tenantId`),
  KEY `ix_ms_projectId` (`projectId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `notifications`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) NOT NULL,
  `title` varchar(250) NOT NULL,
  `body` text DEFAULT NULL,
  `type` varchar(30) DEFAULT NULL,
  `isRead` tinyint(1) DEFAULT NULL,
  `readAt` datetime(3) DEFAULT NULL,
  `referenceId` varchar(64) DEFAULT NULL,
  `referenceType` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notifications_legacyId` (`legacyId`),
  KEY `ix_notifications_tenantId` (`tenantId`),
  KEY `ix_notifications_userId` (`userId`),
  KEY `ix_notifications_type` (`type`),
  KEY `ix_notifications_isRead` (`isRead`),
  CONSTRAINT `ck_notifications_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `offer_letters`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `offer_letters` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) NOT NULL,
  `employeeName` varchar(200) DEFAULT NULL,
  `employeeEmail` varchar(254) DEFAULT NULL,
  `department` varchar(200) DEFAULT NULL,
  `designation` varchar(200) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `salary` decimal(12,2) DEFAULT NULL,
  `joiningDate` datetime(3) DEFAULT NULL,
  `offerContent` text DEFAULT NULL,
  `password` varchar(100) DEFAULT NULL COMMENT 'AES-256-GCM encrypted at the application layer (KMS key)',
  `releasedAt` datetime(3) DEFAULT NULL,
  `downloadedAt` datetime(3) DEFAULT NULL,
  `emailedAt` datetime(3) DEFAULT NULL,
  `emailSent` tinyint(1) DEFAULT NULL,
  `emailSentAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_offer_letters_legacyId` (`legacyId`),
  KEY `ix_offer_letters_tenantId` (`tenantId`),
  KEY `ix_offer_letters_userId` (`userId`),
  KEY `ix_offer_letters_status` (`status`),
  CONSTRAINT `ck_offer_letters_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `onboarding_programs`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `onboarding_programs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `tasks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tasks`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_onboarding_programs_legacyId` (`legacyId`),
  KEY `ix_onboarding_programs_tenantId` (`tenantId`),
  CONSTRAINT `ck_onboarding_programs_payload_json` CHECK (`payload` is null or json_valid(`payload`)),
  CONSTRAINT `ck_onboarding_programs_tasks_json` CHECK (`tasks` is null or json_valid(`tasks`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `organizations`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `organizations` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `name` varchar(200) NOT NULL,
  `logoUrl` varchar(500) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `website` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_organizations_legacyId` (`legacyId`),
  KEY `ix_organizations_tenantId` (`tenantId`),
  CONSTRAINT `ck_organizations_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `overtime_records`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `overtime_records` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `userId` varchar(64) NOT NULL,
  `employeeName` varchar(255) NOT NULL,
  `employeeEmail` varchar(255) NOT NULL,
  `department` varchar(128) DEFAULT NULL,
  `date` date NOT NULL,
  `shiftStartTime` varchar(16) DEFAULT '09:00',
  `shiftEndTime` varchar(16) DEFAULT '18:00',
  `actualCheckIn` varchar(32) DEFAULT NULL,
  `actualCheckOut` varchar(32) DEFAULT NULL,
  `shiftMinutes` int(11) NOT NULL DEFAULT 480,
  `actualMinutes` int(11) NOT NULL DEFAULT 0,
  `overtimeMinutes` int(11) NOT NULL DEFAULT 0,
  `compensationType` varchar(32) NOT NULL DEFAULT 'pay',
  `hourlyRate` decimal(12,2) DEFAULT 0.00,
  `overtimePay` decimal(12,2) DEFAULT 0.00,
  `compOffDaysCredited` decimal(4,2) DEFAULT 0.00,
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `approvedBy` varchar(64) DEFAULT NULL,
  `approvedByName` varchar(255) DEFAULT NULL,
  `approvedAt` datetime(3) DEFAULT NULL,
  `rejectionReason` text DEFAULT NULL,
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_overtime_legacyId` (`legacyId`),
  KEY `idx_overtime_user` (`userId`),
  KEY `idx_overtime_date` (`date`),
  KEY `idx_overtime_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table structure for table `password_resets`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) NOT NULL,
  `email` varchar(254) DEFAULT NULL,
  `token` varchar(64) NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `usedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_password_resets_token` (`token`),
  UNIQUE KEY `uq_password_resets_legacyId` (`legacyId`),
  KEY `ix_password_resets_tenantId` (`tenantId`),
  KEY `ix_password_resets_userId` (`userId`),
  KEY `ix_password_resets_expiresAt` (`expiresAt`),
  CONSTRAINT `ck_password_resets_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `pay_groups`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `pay_groups` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pay_groups_legacyId` (`legacyId`),
  KEY `ix_pay_groups_tenantId` (`tenantId`),
  CONSTRAINT `ck_pay_groups_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `payroll_disbursement_batches`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `payroll_disbursement_batches` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payroll_disbursement_batches_legacyId` (`legacyId`),
  KEY `ix_payroll_disbursement_batches_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `payroll_runs`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `payroll_runs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `year` int(11) DEFAULT NULL,
  `month` int(11) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `runAt` datetime(3) DEFAULT NULL,
  `ranById` varchar(64) DEFAULT NULL,
  `ranByName` varchar(200) DEFAULT NULL,
  `totalGross` decimal(12,2) DEFAULT NULL,
  `totalNet` decimal(12,2) DEFAULT NULL,
  `totalDeductions` decimal(12,2) DEFAULT NULL,
  `employeeCount` int(11) DEFAULT NULL,
  `note` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payroll_runs_legacyId` (`legacyId`),
  UNIQUE KEY `payroll_run_tenant_month` (`tenantId`,`year`,`month`),
  KEY `ix_payroll_runs_tenantId` (`tenantId`),
  KEY `ix_payroll_runs_year` (`year`),
  KEY `ix_payroll_runs_month` (`month`),
  KEY `ix_payroll_runs_status` (`status`),
  CONSTRAINT `ck_payroll_runs_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `payroll_transactions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `payroll_transactions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `runId` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `employeeCode` varchar(30) DEFAULT NULL,
  `gross` decimal(12,2) DEFAULT NULL,
  `net` decimal(12,2) DEFAULT NULL,
  `deductions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`deductions`)),
  `breakdown` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`breakdown`)),
  `paidAt` datetime(3) DEFAULT NULL,
  `payslipUrl` varchar(500) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payroll_transactions_legacyId` (`legacyId`),
  KEY `ix_payroll_transactions_tenantId` (`tenantId`),
  KEY `ix_payroll_transactions_runId` (`runId`),
  KEY `ix_payroll_transactions_userId` (`userId`),
  KEY `ix_payroll_transactions_status` (`status`),
  CONSTRAINT `ck_payroll_transactions_payload_json` CHECK (`payload` is null or json_valid(`payload`)),
  CONSTRAINT `ck_payroll_transactions_deductions_json` CHECK (`deductions` is null or json_valid(`deductions`)),
  CONSTRAINT `ck_payroll_transactions_breakdown_json` CHECK (`breakdown` is null or json_valid(`breakdown`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `payslips`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `payslips` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) NOT NULL,
  `transactionId` varchar(64) DEFAULT NULL,
  `year` int(11) NOT NULL,
  `month` int(11) NOT NULL,
  `net` decimal(12,2) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `generatedAt` datetime(3) DEFAULT NULL,
  `downloadedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payslips_legacyId` (`legacyId`),
  KEY `ix_payslips_tenantId` (`tenantId`),
  KEY `ix_payslips_userId` (`userId`),
  KEY `ix_payslips_transactionId` (`transactionId`),
  KEY `ix_payslips_year` (`year`),
  KEY `ix_payslips_month` (`month`),
  CONSTRAINT `ck_payslips_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `performance_360_reviews`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `performance_360_reviews` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_performance_360_reviews_legacyId` (`legacyId`),
  KEY `ix_performance_360_reviews_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `performance_feedback`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `performance_feedback` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) NOT NULL,
  `fromUserId` varchar(64) DEFAULT NULL,
  `fromUserName` varchar(200) DEFAULT NULL,
  `content` text NOT NULL,
  `rating` int(11) DEFAULT NULL,
  `type` varchar(20) DEFAULT NULL,
  `anonymous` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_performance_feedback_legacyId` (`legacyId`),
  KEY `ix_performance_feedback_tenantId` (`tenantId`),
  KEY `ix_performance_feedback_userId` (`userId`),
  CONSTRAINT `ck_performance_feedback_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `performance_goals`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `performance_goals` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) NOT NULL,
  `title` varchar(250) NOT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `progress` int(11) DEFAULT NULL,
  `weight` int(11) DEFAULT NULL,
  `dueDate` datetime(3) DEFAULT NULL,
  `reviewId` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_performance_goals_legacyId` (`legacyId`),
  KEY `ix_performance_goals_tenantId` (`tenantId`),
  KEY `ix_performance_goals_userId` (`userId`),
  KEY `ix_performance_goals_status` (`status`),
  KEY `ix_performance_goals_reviewId` (`reviewId`),
  CONSTRAINT `ck_performance_goals_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `performance_kpis`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `performance_kpis` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) NOT NULL,
  `name` varchar(200) NOT NULL,
  `target` decimal(12,2) DEFAULT NULL,
  `actual` decimal(12,2) DEFAULT NULL,
  `unit` varchar(20) DEFAULT NULL,
  `period` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_performance_kpis_legacyId` (`legacyId`),
  KEY `ix_performance_kpis_tenantId` (`tenantId`),
  KEY `ix_performance_kpis_userId` (`userId`),
  CONSTRAINT `ck_performance_kpis_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `performance_reviews`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `performance_reviews` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) NOT NULL,
  `reviewerId` varchar(64) DEFAULT NULL,
  `reviewerName` varchar(200) DEFAULT NULL,
  `title` varchar(250) DEFAULT NULL,
  `period` varchar(50) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `overallRating` decimal(12,2) DEFAULT NULL,
  `summary` text DEFAULT NULL,
  `reviewedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_performance_reviews_legacyId` (`legacyId`),
  KEY `ix_performance_reviews_tenantId` (`tenantId`),
  KEY `ix_performance_reviews_userId` (`userId`),
  KEY `ix_performance_reviews_status` (`status`),
  CONSTRAINT `ck_performance_reviews_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `probation_policies`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `probation_policies` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prob_legacyId` (`legacyId`),
  KEY `ix_prob_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `project_members`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `project_members` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `projectId` varchar(64) DEFAULT NULL,
  `userId` varchar(64) DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pm_legacyId` (`legacyId`),
  KEY `ix_pm_tenantId` (`tenantId`),
  KEY `ix_pm_projectId` (`projectId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `project_tasks`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `project_tasks` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `projectId` varchar(64) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'TODO',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pt_legacyId` (`legacyId`),
  KEY `ix_pt_tenantId` (`tenantId`),
  KEY `ix_pt_projectId` (`projectId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `projects`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `projects` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(30) DEFAULT 'active',
  `managerId` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_projects_legacyId` (`legacyId`),
  KEY `ix_projects_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `push_notifications`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `push_notifications` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `title` varchar(250) NOT NULL,
  `body` text DEFAULT NULL,
  `type` varchar(30) DEFAULT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `sentBy` varchar(64) DEFAULT NULL,
  `sentTo` varchar(64) DEFAULT NULL,
  `read` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_push_notifications_legacyId` (`legacyId`),
  KEY `ix_push_notifications_tenantId` (`tenantId`),
  CONSTRAINT `ck_push_notifications_payload_json` CHECK (`payload` is null or json_valid(`payload`)),
  CONSTRAINT `ck_push_notifications_data_json` CHECK (`data` is null or json_valid(`data`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `push_subscriptions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) NOT NULL,
  `endpoint` varchar(500) NOT NULL,
  `p256dh` varchar(255) NOT NULL,
  `auth` varchar(255) NOT NULL,
  `userAgent` varchar(300) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_push_subscriptions_endpoint` (`endpoint`),
  UNIQUE KEY `uq_push_subscriptions_legacyId` (`legacyId`),
  KEY `ix_push_subscriptions_tenantId` (`tenantId`),
  KEY `ix_push_subscriptions_userId` (`userId`),
  CONSTRAINT `ck_push_subscriptions_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `regularization_requests`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `regularization_requests` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `userId` varchar(64) DEFAULT NULL,
  `attendanceId` varchar(64) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `type` varchar(30) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `requestedCheckIn` datetime(3) DEFAULT NULL,
  `requestedCheckOut` datetime(3) DEFAULT NULL,
  `reviewedById` varchar(64) DEFAULT NULL,
  `reviewedAt` datetime(3) DEFAULT NULL,
  `reviewerNotes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reg_legacyId` (`legacyId`),
  KEY `ix_reg_tenantId` (`tenantId`),
  KEY `ix_reg_userId` (`userId`),
  KEY `ix_reg_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `salary_advances`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `salary_advances` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `userId` varchar(64) NOT NULL,
  `employeeName` varchar(255) NOT NULL,
  `employeeEmail` varchar(255) NOT NULL,
  `department` varchar(128) DEFAULT NULL,
  `requestedAmount` decimal(12,2) NOT NULL,
  `maxEligibleAmount` decimal(12,2) NOT NULL,
  `accruedWage` decimal(12,2) NOT NULL,
  `reason` text NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `approvedBy` varchar(64) DEFAULT NULL,
  `approvedByName` varchar(255) DEFAULT NULL,
  `approvedAt` datetime(3) DEFAULT NULL,
  `rejectionReason` text DEFAULT NULL,
  `disbursedAt` datetime(3) DEFAULT NULL,
  `deductedPayrollMonth` varchar(16) DEFAULT NULL,
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_salary_adv_legacyId` (`legacyId`),
  KEY `idx_salary_adv_user` (`userId`),
  KEY `idx_salary_adv_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table structure for table `salary_components`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `salary_components` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `name` varchar(100) NOT NULL,
  `type` varchar(20) DEFAULT NULL,
  `amount` decimal(12,2) DEFAULT NULL,
  `percentage` decimal(12,2) DEFAULT NULL,
  `taxable` tinyint(1) DEFAULT NULL,
  `recurring` tinyint(1) DEFAULT NULL,
  `payGroupId` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_salary_components_legacyId` (`legacyId`),
  KEY `ix_salary_components_tenantId` (`tenantId`),
  KEY `ix_salary_components_payGroupId` (`payGroupId`),
  CONSTRAINT `ck_salary_components_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `sessions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `userId` varchar(64) NOT NULL,
  `token` varchar(64) NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sessions_token` (`token`),
  UNIQUE KEY `uq_sessions_legacyId` (`legacyId`),
  KEY `ix_sessions_tenantId` (`tenantId`),
  KEY `ix_sessions_userId` (`userId`),
  KEY `ix_sessions_expiresAt` (`expiresAt`),
  CONSTRAINT `ck_sessions_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `settings`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `key` varchar(100) NOT NULL,
  `role` varchar(30) DEFAULT NULL,
  `userId` varchar(64) DEFAULT NULL,
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`settings`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_settings_legacyId` (`legacyId`),
  UNIQUE KEY `settings_key_user` (`tenantId`,`key`,`userId`),
  KEY `ix_settings_tenantId` (`tenantId`),
  KEY `ix_settings_key` (`key`),
  CONSTRAINT `ck_settings_payload_json` CHECK (`payload` is null or json_valid(`payload`)),
  CONSTRAINT `ck_settings_settings_json` CHECK (`settings` is null or json_valid(`settings`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `shift_assignments`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `shift_assignments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_shift_assignments_legacyId` (`legacyId`),
  KEY `ix_shift_assignments_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `shift_swap_requests`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `shift_swap_requests` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_shift_swap_requests_legacyId` (`legacyId`),
  KEY `ix_shift_swap_requests_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `shifts`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `shifts` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_shifts_legacyId` (`legacyId`),
  KEY `ix_shifts_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `task_audit_logs`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `task_audit_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_task_audit_logs_legacyId` (`legacyId`),
  KEY `ix_task_audit_logs_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `tasks`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `title` varchar(250) NOT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `priority` varchar(20) DEFAULT NULL,
  `assigneeId` varchar(64) DEFAULT NULL,
  `assigneeName` varchar(200) DEFAULT NULL,
  `assignedById` varchar(64) DEFAULT NULL,
  `assignedByName` varchar(200) DEFAULT NULL,
  `dueDate` datetime(3) DEFAULT NULL,
  `completedAt` datetime(3) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `projectId` varchar(64) DEFAULT NULL,
  `teamId` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tasks_legacyId` (`legacyId`),
  KEY `ix_tasks_tenantId` (`tenantId`),
  KEY `ix_tasks_status` (`status`),
  KEY `ix_tasks_priority` (`priority`),
  KEY `ix_tasks_assigneeId` (`assigneeId`),
  KEY `ix_tasks_dueDate` (`dueDate`),
  KEY `ix_tasks_projectId` (`projectId`),
  CONSTRAINT `ck_tasks_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `tenants`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tenants` (
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `id` varchar(64) NOT NULL,
  `name` varchar(200) NOT NULL,
  `domain` varchar(200) DEFAULT NULL,
  `plan` varchar(50) DEFAULT NULL,
  `status` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`tenantId`),
  UNIQUE KEY `uq_tenants_legacyId` (`legacyId`),
  UNIQUE KEY `uq_tenants_domain` (`domain`),
  KEY `ix_tenants_tenantId` (`tenantId`),
  KEY `ix_tenants_status` (`status`),
  CONSTRAINT `ck_tenants_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `test_answers`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `test_answers` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `attemptId` varchar(64) DEFAULT NULL,
  `questionId` varchar(64) DEFAULT NULL,
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_test_answers_legacyId` (`legacyId`),
  KEY `ix_test_answers_tenantId` (`tenantId`),
  KEY `ix_answers_attempt_q` (`tenantId`,`attemptId`,`questionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `test_attempts`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `test_attempts` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `testId` varchar(64) DEFAULT NULL,
  `userId` varchar(64) DEFAULT NULL,
  `status` varchar(32) DEFAULT 'in_progress',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_test_attempts_legacyId` (`legacyId`),
  KEY `ix_test_attempts_tenantId` (`tenantId`),
  KEY `ix_attempts_user_test` (`tenantId`,`userId`,`testId`),
  KEY `ix_attempts_test_status` (`tenantId`,`testId`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `test_definitions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `test_definitions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `title` varchar(255) DEFAULT NULL,
  `department` varchar(64) DEFAULT NULL,
  `status` varchar(32) DEFAULT 'draft',
  `createdBy` varchar(64) DEFAULT NULL,
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_test_definitions_legacyId` (`legacyId`),
  KEY `ix_test_definitions_tenantId` (`tenantId`),
  KEY `ix_tests_dept_status` (`tenantId`,`department`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `test_evaluations`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `test_evaluations` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `attemptId` varchar(64) DEFAULT NULL,
  `evaluatorId` varchar(64) DEFAULT NULL,
  `status` varchar(32) DEFAULT 'pending',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_test_evaluations_legacyId` (`legacyId`),
  KEY `ix_test_evaluations_tenantId` (`tenantId`),
  KEY `ix_evals_attempt_status` (`tenantId`,`attemptId`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `test_questions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `test_questions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `type` varchar(32) DEFAULT 'MCQ',
  `topic` varchar(100) DEFAULT 'General',
  `status` varchar(32) DEFAULT 'ACTIVE',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_test_questions_legacyId` (`legacyId`),
  KEY `ix_test_questions_tenantId` (`tenantId`),
  KEY `ix_questions_topic_status` (`tenantId`,`topic`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `test_results`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `test_results` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `testId` varchar(64) DEFAULT NULL,
  `userId` varchar(64) DEFAULT NULL,
  `grade` varchar(32) DEFAULT NULL,
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_test_results_legacyId` (`legacyId`),
  KEY `ix_test_results_tenantId` (`tenantId`),
  KEY `ix_results_user_test` (`tenantId`,`userId`,`testId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `ticket_categories`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `ticket_categories` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ticket_categories_legacyId` (`legacyId`),
  KEY `ix_ticket_categories_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `ticket_comments`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `ticket_comments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ticket_comments_legacyId` (`legacyId`),
  KEY `ix_ticket_comments_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `ticket_replies`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `ticket_replies` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `ticketId` varchar(64) NOT NULL,
  `content` text NOT NULL,
  `authorId` varchar(64) DEFAULT NULL,
  `authorName` varchar(200) DEFAULT NULL,
  `isStaffReply` tinyint(1) DEFAULT NULL,
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attachments`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ticket_replies_legacyId` (`legacyId`),
  KEY `ix_ticket_replies_tenantId` (`tenantId`),
  KEY `ix_ticket_replies_ticketId` (`ticketId`),
  CONSTRAINT `ck_ticket_replies_payload_json` CHECK (`payload` is null or json_valid(`payload`)),
  CONSTRAINT `ck_ticket_replies_attachments_json` CHECK (`attachments` is null or json_valid(`attachments`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `ticket_routing_rules`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `ticket_routing_rules` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ticket_routing_rules_legacyId` (`legacyId`),
  KEY `ix_ticket_routing_rules_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `ticket_timeline`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `ticket_timeline` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ticket_timeline_legacyId` (`legacyId`),
  KEY `ix_ticket_timeline_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `ticket_transfers`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `ticket_transfers` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `ticketId` varchar(64) DEFAULT NULL,
  `toDepartment` varchar(64) DEFAULT NULL,
  `status` varchar(32) DEFAULT 'pending',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ticket_transfers_legacyId` (`legacyId`),
  KEY `ix_ticket_transfers_tenantId` (`tenantId`),
  KEY `ix_ticket_transfers_dept` (`tenantId`,`toDepartment`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `tickets`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `subject` varchar(250) NOT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `priority` varchar(20) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `raisedById` varchar(64) DEFAULT NULL,
  `raisedByName` varchar(200) DEFAULT NULL,
  `assignedToId` varchar(64) DEFAULT NULL,
  `assignedToName` varchar(200) DEFAULT NULL,
  `resolvedAt` datetime(3) DEFAULT NULL,
  `closedAt` datetime(3) DEFAULT NULL,
  `firstResponseAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tickets_legacyId` (`legacyId`),
  KEY `ix_tickets_tenantId` (`tenantId`),
  KEY `ix_tickets_status` (`status`),
  KEY `ix_tickets_priority` (`priority`),
  KEY `ix_tickets_raisedById` (`raisedById`),
  KEY `ix_tickets_assignedToId` (`assignedToId`),
  CONSTRAINT `ck_tickets_payload_json` CHECK (`payload` is null or json_valid(`payload`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `timesheets`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `timesheets` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `userId` varchar(64) DEFAULT NULL,
  `projectId` varchar(64) DEFAULT NULL,
  `taskId` varchar(64) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `hours` decimal(5,2) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(20) DEFAULT 'draft',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_timesheets_legacyId` (`legacyId`),
  KEY `ix_timesheets_tenantId` (`tenantId`),
  KEY `ix_timesheets_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `users`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL,
  `createdAt` datetime(3) DEFAULT NULL,
  `updatedAt` datetime(3) DEFAULT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `email` varchar(254) NOT NULL,
  `emailVerified` tinyint(1) DEFAULT NULL,
  `displayName` varchar(200) DEFAULT NULL,
  `firstName` varchar(100) DEFAULT NULL,
  `lastName` varchar(100) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `photoURL` varchar(500) DEFAULT NULL,
  `role` varchar(30) NOT NULL,
  `status` varchar(30) DEFAULT NULL,
  `loginStatus` varchar(30) DEFAULT NULL,
  `allowMobileLogin` tinyint(1) DEFAULT NULL,
  `lastLoginAt` datetime(3) DEFAULT NULL,
  `departmentId` varchar(64) DEFAULT NULL,
  `departmentName` varchar(200) DEFAULT NULL,
  `designationId` varchar(64) DEFAULT NULL,
  `designationName` varchar(200) DEFAULT NULL,
  `joiningDate` datetime(3) DEFAULT NULL,
  `employeeCode` varchar(30) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `emergencyContact` varchar(200) DEFAULT NULL,
  `emergencyPhone` varchar(30) DEFAULT NULL,
  `reportingManager` varchar(200) DEFAULT NULL,
  `managerEmail` varchar(254) DEFAULT NULL,
  `passwordHash` char(60) DEFAULT NULL,
  `bankAccount` varchar(100) DEFAULT NULL COMMENT 'AES-256-GCM encrypted at the application layer (KMS key)',
  `mustChangePassword` tinyint(1) DEFAULT NULL,
  `passwordChangedAt` datetime(3) DEFAULT NULL,
  `onboardingStatus` varchar(30) DEFAULT NULL,
  `domainWork` varchar(200) DEFAULT NULL,
  `allottedTeam` varchar(200) DEFAULT NULL,
  `employmentType` varchar(30) DEFAULT NULL,
  `onboardingDetails` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`onboardingDetails`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_legacyId` (`legacyId`),
  KEY `ix_users_tenantId` (`tenantId`),
  KEY `ix_users_displayName` (`displayName`),
  KEY `ix_users_role` (`role`),
  KEY `ix_users_status` (`status`),
  KEY `ix_users_departmentId` (`departmentId`),
  KEY `ix_users_employeeCode` (`employeeCode`),
  KEY `ix_users_reportingManager` (`reportingManager`),
  CONSTRAINT `ck_users_payload_json` CHECK (`payload` is null or json_valid(`payload`)),
  CONSTRAINT `ck_users_onboardingDetails_json` CHECK (`onboardingDetails` is null or json_valid(`onboardingDetails`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `weekly_offs`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `weekly_offs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_weekly_offs_legacyId` (`legacyId`),
  KEY `ix_weekly_offs_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `workflow_execution_logs`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `workflow_execution_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_workflow_execution_logs_legacyId` (`legacyId`),
  KEY `ix_workflow_execution_logs_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table structure for table `workflow_rules`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `workflow_rules` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `legacyId` char(24) DEFAULT NULL,
  `tenantId` varchar(64) NOT NULL DEFAULT 'default',
  `createdAt` datetime(3) DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `deletedAt` datetime(3) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_workflow_rules_legacyId` (`legacyId`),
  KEY `ix_workflow_rules_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;
