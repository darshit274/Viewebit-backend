-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Aug 27, 2025 at 09:20 AM
-- Server version: 8.3.0
-- PHP Version: 8.1.2-1ubuntu2.22

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `xehe123`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('super_admin','admin','moderator') NOT NULL DEFAULT 'admin',
  `avatar` varchar(255) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `lastLogin` datetime DEFAULT NULL,
  `permissions` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int NOT NULL,
  `uuid` char(36) NOT NULL,
  `test_series_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `name_gujarati` varchar(255) DEFAULT NULL COMMENT 'Category name in Gujarati',
  `description_gujarati` text COMMENT 'Category description in Gujarati',
  `node_type` enum('unset','container','question_holder') NOT NULL DEFAULT 'unset' COMMENT 'Type of node: unset (can become either), container (has subcategories), question_holder (has questions)',
  `parent_category_id` int DEFAULT NULL COMMENT 'Parent category for hierarchical structure',
  `hierarchy_level` int NOT NULL DEFAULT '0' COMMENT 'Depth level in hierarchy (0 = root, 1 = subcategory, etc.)',
  `display_order` int NOT NULL DEFAULT '0' COMMENT 'Order for display within same parent',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `exam_categories`
--

CREATE TABLE `exam_categories` (
  `id` int NOT NULL,
  `uuid` char(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `name_gujarati` varchar(200) DEFAULT NULL,
  `description` text,
  `description_gujarati` text COMMENT 'Category description in Gujarati',
  `parent_id` int DEFAULT NULL,
  `hierarchy_level` int NOT NULL DEFAULT '0',
  `hierarchy_path` varchar(500) DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` varchar(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `exam_types`
--

CREATE TABLE `exam_types` (
  `id` int NOT NULL,
  `name` varchar(255) NOT NULL COMMENT 'Exam name (e.g., "Deputy Section Officer", "PSI", "GPSC")',
  `code` varchar(255) NOT NULL COMMENT 'Short code for exam (e.g., "DSO", "PSI", "GPSC")',
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `hierarchy_categories`
--

CREATE TABLE `hierarchy_categories` (
  `id` int NOT NULL,
  `uuid` char(36) NOT NULL,
  `name` varchar(200) NOT NULL,
  `name_gujarati` varchar(400) DEFAULT NULL,
  `description` text,
  `description_gujarati` text,
  `test_series_id` int NOT NULL,
  `parent_id` int DEFAULT NULL,
  `hierarchy_level` int NOT NULL,
  `hierarchy_path` varchar(500) DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `icon_url` varchar(500) DEFAULT NULL,
  `color_code` varchar(7) DEFAULT NULL,
  `slug` varchar(200) DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `instructions` text,
  `instructions_gujarati` text,
  `is_active` tinyint(1) DEFAULT '1',
  `is_featured` tinyint(1) DEFAULT '0',
  `child_categories_count` int DEFAULT '0',
  `tests_count` int DEFAULT '0',
  `total_questions` int DEFAULT '0',
  `total_attempts` int DEFAULT '0',
  `created_by` char(36) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `new_tests`
--

CREATE TABLE `new_tests` (
  `id` int NOT NULL,
  `uuid` char(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `title_gujarati` varchar(400) DEFAULT NULL,
  `description` text,
  `description_gujarati` text,
  `test_series_id` int NOT NULL,
  `category_id` int NOT NULL,
  `test_type` enum('practice','mock','assessment','sample','full_length','previous_year','sectional') DEFAULT 'practice',
  `duration_minutes` int NOT NULL,
  `total_questions` int DEFAULT '0',
  `total_marks` int DEFAULT '0',
  `passing_marks` int DEFAULT '0',
  `is_free` tinyint(1) DEFAULT '0',
  `price` decimal(10,2) DEFAULT '0.00',
  `is_one_time` tinyint(1) DEFAULT '0',
  `allows_pause` tinyint(1) DEFAULT '1',
  `max_attempts` int DEFAULT NULL,
  `has_negative_marking` tinyint(1) DEFAULT '0',
  `negative_marks` decimal(3,2) DEFAULT '0.00',
  `marks_per_question` int DEFAULT '1',
  `available_from` datetime DEFAULT NULL,
  `available_until` datetime DEFAULT NULL,
  `show_results_immediately` tinyint(1) DEFAULT '1',
  `show_correct_answers` tinyint(1) DEFAULT '1',
  `show_explanations` tinyint(1) DEFAULT '1',
  `supports_multilanguage` tinyint(1) DEFAULT '1',
  `randomize_questions` tinyint(1) DEFAULT '0',
  `randomize_options` tinyint(1) DEFAULT '0',
  `instructions` text,
  `instructions_gujarati` text,
  `slug` varchar(200) DEFAULT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_featured` tinyint(1) DEFAULT '0',
  `is_published` tinyint(1) DEFAULT '0',
  `published_at` datetime DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `total_attempts` int DEFAULT '0',
  `total_completions` int DEFAULT '0',
  `average_score` decimal(5,2) DEFAULT '0.00',
  `average_time_taken` int DEFAULT '0',
  `highest_score` decimal(5,2) DEFAULT '0.00',
  `lowest_score` decimal(5,2) DEFAULT '0.00',
  `pass_rate` decimal(5,2) DEFAULT '0.00',
  `created_by` char(36) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `new_test_series`
--

CREATE TABLE `new_test_series` (
  `id` int NOT NULL,
  `uuid` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `name_gujarati` text,
  `description` text,
  `description_gujarati` text,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(10) NOT NULL DEFAULT 'INR',
  `free_test_count` int NOT NULL DEFAULT '0',
  `difficulty_level` enum('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  `max_attempts_per_test` int NOT NULL DEFAULT '1',
  `supports_pause_resume` tinyint(1) DEFAULT '1',
  `supports_multilanguage` tinyint(1) DEFAULT '1',
  `has_negative_marking` tinyint(1) DEFAULT '0',
  `negative_marks` decimal(3,2) DEFAULT '0.25',
  `instructions` text,
  `instructions_gujarati` text,
  `slug` varchar(200) DEFAULT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_featured` tinyint(1) DEFAULT '0',
  `is_published` tinyint(1) DEFAULT '0',
  `published_at` datetime DEFAULT NULL,
  `total_categories` int DEFAULT '0',
  `total_tests` int DEFAULT '0',
  `total_questions` int DEFAULT '0',
  `total_enrollments` int DEFAULT '0',
  `average_rating` decimal(3,2) DEFAULT '0.00',
  `total_reviews` int DEFAULT '0',
  `created_by` char(36) DEFAULT NULL,
  `pricing_type` enum('free','paid') NOT NULL DEFAULT 'free',
  `demo_tests_count` int NOT NULL DEFAULT '0',
  `subscription_duration_days` int NOT NULL DEFAULT '365',
  `features` json DEFAULT NULL COMMENT 'JSON field to store additional features like study materials, mock tests, etc.',
  `discount_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `type` enum('quiz_reminder','test_result','new_content','subscription','general') NOT NULL DEFAULT 'general',
  `data` json DEFAULT NULL,
  `topic` varchar(255) DEFAULT NULL,
  `status` enum('pending','sent','delivered','failed','read') NOT NULL DEFAULT 'pending',
  `sent_at` datetime DEFAULT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pdfs`
--

CREATE TABLE `pdfs` (
  `id` char(36) NOT NULL,
  `title` varchar(255) NOT NULL COMMENT 'Display title for the PDF',
  `description` text,
  `category_id` int DEFAULT NULL,
  `file_path` varchar(255) NOT NULL COMMENT 'Server path to the PDF file',
  `original_filename` varchar(255) NOT NULL COMMENT 'Original filename when uploaded',
  `file_size` bigint NOT NULL COMMENT 'File size in bytes',
  `mime_type` varchar(255) DEFAULT 'application/pdf' COMMENT 'MIME type of the file',
  `access_level` enum('free','premium','restricted') DEFAULT 'free' COMMENT 'Who can access this PDF',
  `test_series_id` char(36) DEFAULT NULL COMMENT 'Link to specific test series if applicable',
  `exam_type_id` int DEFAULT NULL COMMENT 'Link to exam type if applicable',
  `tags` json DEFAULT NULL COMMENT 'Array of tags for better search',
  `download_count` int DEFAULT '0' COMMENT 'Number of times downloaded',
  `view_count` int DEFAULT '0' COMMENT 'Number of times viewed',
  `is_active` tinyint(1) DEFAULT '1',
  `is_featured` tinyint(1) DEFAULT '0',
  `uploaded_by` char(36) DEFAULT NULL COMMENT 'Admin who uploaded this PDF',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pdf_categories`
--

CREATE TABLE `pdf_categories` (
  `id` int NOT NULL,
  `name` varchar(255) NOT NULL COMMENT 'Category name (e.g., Study Materials, Previous Papers, etc.)',
  `slug` varchar(255) NOT NULL COMMENT 'URL-friendly version of name',
  `description` text,
  `icon` varchar(255) DEFAULT NULL COMMENT 'Icon name for category display',
  `color` varchar(255) DEFAULT '#3B82F6' COMMENT 'Hex color code for category',
  `sort_order` int DEFAULT '0' COMMENT 'Display order for categories',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `questions`
--

CREATE TABLE `questions` (
  `id` int NOT NULL,
  `uuid` char(36) NOT NULL,
  `test_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL COMMENT 'Direct link to category for simplified hierarchy',
  `question_text` text NOT NULL,
  `question_text_gujarati` text COMMENT 'Question text in Gujarati language',
  `option_a` text NOT NULL,
  `option_a_gujarati` text COMMENT 'Option A in Gujarati language',
  `option_b` text NOT NULL,
  `option_b_gujarati` text COMMENT 'Option B in Gujarati language',
  `option_c` text NOT NULL,
  `option_c_gujarati` text COMMENT 'Option C in Gujarati language',
  `option_d` text NOT NULL,
  `option_d_gujarati` text COMMENT 'Option D in Gujarati language',
  `correct_answer` enum('A','B','C','D') NOT NULL,
  `explanation` text,
  `explanation_gujarati` text COMMENT 'Explanation in Gujarati language',
  `marks` int NOT NULL DEFAULT '1',
  `subject_tag` varchar(100) DEFAULT NULL COMMENT 'Subject tag for the question (e.g., Mathematics, Physics)',
  `topic_tag` varchar(100) DEFAULT NULL COMMENT 'Topic tag for the question (e.g., Algebra, Geometry)',
  `difficulty_tag` enum('easy','medium','hard') NOT NULL DEFAULT 'medium' COMMENT 'Difficulty level of the question',
  `time_to_solve_seconds` int NOT NULL DEFAULT '120' COMMENT 'Expected time to solve this question in seconds',
  `question_type` enum('single_choice','multiple_choice','true_false','fill_blank') NOT NULL DEFAULT 'single_choice' COMMENT 'Type of question',
  `negative_marks` decimal(3,2) DEFAULT NULL COMMENT 'Negative marks for wrong answer',
  `display_order` int NOT NULL DEFAULT '0' COMMENT 'Display order for sorting questions',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `question_imports`
--

CREATE TABLE `question_imports` (
  `id` char(36) NOT NULL,
  `admin_id` char(36) NOT NULL,
  `category_id` int NOT NULL,
  `test_series_id` int DEFAULT NULL,
  `filename` varchar(255) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `file_size` bigint NOT NULL,
  `file_type` enum('excel','csv') NOT NULL,
  `total_rows` int DEFAULT '0',
  `successful_imports` int DEFAULT '0',
  `failed_imports` int DEFAULT '0',
  `import_status` enum('uploaded','validating','validated','importing','completed','failed') NOT NULL DEFAULT 'uploaded',
  `validation_errors` json DEFAULT NULL COMMENT 'JSON array of validation errors with row numbers',
  `import_errors` json DEFAULT NULL COMMENT 'JSON array of import errors with row numbers',
  `import_summary` json DEFAULT NULL COMMENT 'Summary of imported question IDs and statistics',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SequelizeMeta`
--

CREATE TABLE `SequelizeMeta` (
  `name` varchar(255) COLLATE utf8mb3_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subscription`
--

CREATE TABLE `subscription` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `test_series_id` char(36) NOT NULL,
  `transaction_id` varchar(255) NOT NULL,
  `payment_method` varchar(255) DEFAULT NULL,
  `amount_paid` double NOT NULL,
  `currency` varchar(255) DEFAULT 'INR',
  `status` enum('pending','completed','failed','refunded') DEFAULT 'pending',
  `purchase_date` datetime NOT NULL,
  `expiry_date` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sub_categories`
--

CREATE TABLE `sub_categories` (
  `id` int NOT NULL,
  `uuid` char(36) NOT NULL,
  `category_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `name_gujarati` varchar(255) DEFAULT NULL COMMENT 'Sub-category name in Gujarati',
  `description_gujarati` text COMMENT 'Sub-category description in Gujarati',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tests`
--

CREATE TABLE `tests` (
  `id` int NOT NULL,
  `uuid` char(36) NOT NULL,
  `sub_category_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `duration_minutes` int NOT NULL DEFAULT '60',
  `total_marks` int NOT NULL DEFAULT '0',
  `is_demo` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'True if this test is a demo test in a paid series',
  `is_free_in_paid_series` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'True if this test is free even in a paid test series',
  `negative_marking_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `negative_marks_per_wrong` decimal(3,2) NOT NULL DEFAULT '0.25' COMMENT 'Negative marks deducted for each wrong answer',
  `is_one_time_only` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'True if student can take this test only once in one session',
  `max_duration_minutes` int DEFAULT NULL COMMENT 'Maximum duration for one-time tests (overrides duration_minutes)',
  `attempt_restrictions` json DEFAULT NULL COMMENT 'JSON field for attempt restrictions like max attempts, cooldown periods',
  `passing_marks` int DEFAULT NULL COMMENT 'Minimum marks required to pass the test',
  `instructions` text COMMENT 'Special instructions for the test',
  `instructions_gujarati` text COMMENT 'Test instructions in Gujarati',
  `is_free_in_series` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether this test is free in a paid series',
  `negative_marking` decimal(3,2) DEFAULT NULL COMMENT 'Negative marking for this specific test (overrides series setting)',
  `time_duration_minutes` int NOT NULL DEFAULT '60' COMMENT 'Test duration in minutes',
  `max_attempts_override` int DEFAULT NULL COMMENT 'Override max attempts for this specific test',
  `difficulty_level` enum('easy','medium','hard') NOT NULL DEFAULT 'medium' COMMENT 'Difficulty level of the test',
  `randomize_questions` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether to randomize question order',
  `show_results_immediately` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether to show results immediately after test completion',
  `pass_percentage` decimal(5,2) NOT NULL DEFAULT '60.00' COMMENT 'Minimum percentage required to pass',
  `allow_review` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether students can review answers after test',
  `total_questions` int NOT NULL DEFAULT '0' COMMENT 'Total number of questions in the test',
  `display_order` int NOT NULL DEFAULT '0' COMMENT 'Display order for sorting tests',
  `title_gujarati` varchar(255) DEFAULT NULL COMMENT 'Test title in Gujarati language',
  `description_gujarati` text COMMENT 'Test description in Gujarati language',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `test_series`
--

CREATE TABLE `test_series` (
  `id` int NOT NULL,
  `uuid` char(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `title_gujarati` varchar(400) DEFAULT NULL,
  `description` text,
  `category_id` int NOT NULL,
  `price` decimal(10,2) DEFAULT '0.00',
  `is_free` tinyint(1) DEFAULT '0',
  `difficulty_level` enum('beginner','intermediate','advanced','expert') DEFAULT 'intermediate',
  `total_tests` int DEFAULT '0',
  `is_published` tinyint(1) DEFAULT '0',
  `is_featured` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` varchar(36) DEFAULT NULL,
  `name_gujarati` text COMMENT 'Test series name in Gujarati language',
  `description_gujarati` text COMMENT 'Test series description in Gujarati language',
  `free_tests_count` int NOT NULL DEFAULT '0' COMMENT 'Number of free tests in paid series',
  `requires_subscription` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether series requires subscription to access',
  `negative_marking_enabled` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether negative marking is enabled for this series',
  `negative_marking_value` decimal(3,2) DEFAULT '0.25' COMMENT 'Negative marking value (e.g., 0.25, 0.20, 0.33)',
  `one_time_completion` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether tests can be taken only once',
  `max_attempts` int NOT NULL DEFAULT '1' COMMENT 'Maximum attempts allowed per test',
  `auto_submit_on_expire` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Auto submit test when time expires',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `test_sessions`
--

CREATE TABLE `test_sessions` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `test_id` int NOT NULL,
  `started_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `is_completed` tinyint(1) NOT NULL DEFAULT '0',
  `is_submitted` tinyint(1) NOT NULL DEFAULT '0',
  `remaining_time_seconds` int DEFAULT NULL COMMENT 'Remaining time in seconds for the test session',
  `current_question_index` int NOT NULL DEFAULT '0',
  `total_questions` int NOT NULL,
  `session_data` json DEFAULT NULL COMMENT 'JSON field to store session-specific data like answered questions, time spent per question, etc.',
  `answers_data` json DEFAULT NULL COMMENT 'JSON field to store all answers for quick access',
  `calculated_score` decimal(10,2) DEFAULT NULL COMMENT 'Final calculated score including negative marking',
  `total_correct` int NOT NULL DEFAULT '0',
  `total_wrong` int NOT NULL DEFAULT '0',
  `total_unanswered` int NOT NULL DEFAULT '0',
  `total_marked_for_review` int NOT NULL DEFAULT '0',
  `status` enum('active','paused','completed','expired','cancelled') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `uuid` char(36) NOT NULL,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `profileImage` varchar(255) DEFAULT NULL,
  `otp` int DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `lastLogin` datetime DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `isEmailVerified` tinyint(1) NOT NULL DEFAULT '0',
  `otpExpiry` datetime DEFAULT NULL,
  `subscription_status` enum('none','active','expired') NOT NULL DEFAULT 'none',
  `total_subscriptions` int NOT NULL DEFAULT '0',
  `subscription_expiry_reminder_sent` tinyint(1) NOT NULL DEFAULT '0',
  `fullName` varchar(255) DEFAULT NULL,
  `phoneNumber` varchar(255) DEFAULT NULL,
  `dateOfBirth` date DEFAULT NULL,
  `schoolName` varchar(255) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `state` varchar(255) DEFAULT NULL,
  `avatarUrl` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_answers`
--

CREATE TABLE `user_answers` (
  `id` int NOT NULL,
  `test_session_id` char(36) NOT NULL,
  `question_id` int NOT NULL,
  `selected_option` enum('A','B','C','D') DEFAULT NULL,
  `is_correct` tinyint(1) DEFAULT '0',
  `time_spent` int DEFAULT '0' COMMENT 'Time spent on this question in seconds',
  `is_flagged` tinyint(1) DEFAULT '0',
  `is_visited` tinyint(1) DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `admins_email` (`email`),
  ADD KEY `admins_role` (`role`),
  ADD KEY `admins_is_active` (`isActive`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD KEY `idx_categories_parent` (`parent_category_id`),
  ADD KEY `idx_categories_test_series_level` (`test_series_id`,`hierarchy_level`),
  ADD KEY `idx_categories_node_type` (`node_type`);

--
-- Indexes for table `exam_categories`
--
ALTER TABLE `exam_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD KEY `exam_categories_parent_id` (`parent_id`),
  ADD KEY `exam_categories_hierarchy_level` (`hierarchy_level`),
  ADD KEY `exam_categories_is_active` (`is_active`),
  ADD KEY `exam_categories_uuid` (`uuid`);

--
-- Indexes for table `exam_types`
--
ALTER TABLE `exam_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `hierarchy_categories`
--
ALTER TABLE `hierarchy_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `hierarchy_categories_series_level_index` (`test_series_id`,`hierarchy_level`),
  ADD KEY `hierarchy_categories_parent_index` (`parent_id`),
  ADD KEY `hierarchy_categories_path_index` (`hierarchy_path`),
  ADD KEY `hierarchy_categories_active_index` (`is_active`),
  ADD KEY `hierarchy_categories_display_order_index` (`display_order`);

--
-- Indexes for table `new_tests`
--
ALTER TABLE `new_tests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `new_tests_series_index` (`test_series_id`),
  ADD KEY `new_tests_category_index` (`category_id`),
  ADD KEY `new_tests_type_index` (`test_type`),
  ADD KEY `new_tests_status_index` (`is_active`,`is_published`),
  ADD KEY `new_tests_display_order_index` (`display_order`),
  ADD KEY `new_tests_availability_index` (`available_from`,`available_until`);

--
-- Indexes for table `new_test_series`
--
ALTER TABLE `new_test_series`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `new_test_series_status_index` (`is_active`,`is_published`),
  ADD KEY `new_test_series_created_by_index` (`created_by`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notifications_user_id` (`user_id`),
  ADD KEY `notifications_type` (`type`),
  ADD KEY `notifications_status` (`status`),
  ADD KEY `notifications_created_at` (`created_at`),
  ADD KEY `notifications_user_id_read_at` (`user_id`,`read_at`);

--
-- Indexes for table `pdfs`
--
ALTER TABLE `pdfs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pdfs_category_id` (`category_id`),
  ADD KEY `pdfs_test_series_id` (`test_series_id`),
  ADD KEY `pdfs_exam_type_id` (`exam_type_id`),
  ADD KEY `pdfs_access_level` (`access_level`),
  ADD KEY `pdfs_is_active` (`is_active`),
  ADD KEY `pdfs_is_featured` (`is_featured`),
  ADD KEY `pdfs_created_at` (`created_at`);

--
-- Indexes for table `pdf_categories`
--
ALTER TABLE `pdf_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `pdf_categories_slug` (`slug`),
  ADD KEY `pdf_categories_is_active` (`is_active`),
  ADD KEY `pdf_categories_sort_order` (`sort_order`);

--
-- Indexes for table `questions`
--
ALTER TABLE `questions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD KEY `questions_test_id` (`test_id`),
  ADD KEY `questions_subject_tag` (`subject_tag`),
  ADD KEY `questions_difficulty_tag` (`difficulty_tag`),
  ADD KEY `questions_display_order` (`display_order`),
  ADD KEY `questions_marks` (`marks`),
  ADD KEY `idx_questions_category` (`category_id`);

--
-- Indexes for table `question_imports`
--
ALTER TABLE `question_imports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `question_imports_admin_id` (`admin_id`),
  ADD KEY `question_imports_category_id` (`category_id`),
  ADD KEY `test_series_id` (`test_series_id`),
  ADD KEY `question_imports_import_status` (`import_status`),
  ADD KEY `question_imports_created_at` (`created_at`);

--
-- Indexes for table `SequelizeMeta`
--
ALTER TABLE `SequelizeMeta`
  ADD PRIMARY KEY (`name`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `subscription`
--
ALTER TABLE `subscription`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `transaction_id` (`transaction_id`),
  ADD KEY `subscription_user_id` (`user_id`),
  ADD KEY `subscription_test_series_id` (`test_series_id`),
  ADD KEY `subscription_status` (`status`),
  ADD KEY `subscription_transaction_id` (`transaction_id`);

--
-- Indexes for table `sub_categories`
--
ALTER TABLE `sub_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `tests`
--
ALTER TABLE `tests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD KEY `sub_category_id` (`sub_category_id`),
  ADD KEY `idx_tests_is_demo` (`is_demo`),
  ADD KEY `idx_tests_is_free_in_paid_series` (`is_free_in_paid_series`),
  ADD KEY `idx_tests_is_one_time_only` (`is_one_time_only`),
  ADD KEY `idx_tests_negative_marking_enabled` (`negative_marking_enabled`),
  ADD KEY `tests_is_free_in_series` (`is_free_in_series`),
  ADD KEY `tests_difficulty_level` (`difficulty_level`),
  ADD KEY `tests_display_order` (`display_order`);

--
-- Indexes for table `test_series`
--
ALTER TABLE `test_series`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD KEY `test_series_category_id` (`category_id`),
  ADD KEY `test_series_is_published` (`is_published`),
  ADD KEY `test_series_is_active` (`is_active`),
  ADD KEY `test_series_uuid` (`uuid`),
  ADD KEY `test_series_is_free` (`is_free`),
  ADD KEY `test_series_requires_subscription` (`requires_subscription`);

--
-- Indexes for table `test_sessions`
--
ALTER TABLE `test_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_active_session_per_user_test` (`user_id`,`test_id`,`status`),
  ADD KEY `test_sessions_user_id` (`user_id`),
  ADD KEY `test_sessions_test_id` (`test_id`),
  ADD KEY `test_sessions_user_id_test_id` (`user_id`,`test_id`),
  ADD KEY `test_sessions_status` (`status`),
  ADD KEY `test_sessions_is_completed` (`is_completed`),
  ADD KEY `test_sessions_started_at` (`started_at`),
  ADD KEY `test_sessions_completed_at` (`completed_at`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`uuid`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `users_is_active` (`isActive`),
  ADD KEY `users_last_login` (`lastLogin`);

--
-- Indexes for table `user_answers`
--
ALTER TABLE `user_answers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_session_question` (`test_session_id`,`question_id`),
  ADD KEY `user_answers_test_session_id` (`test_session_id`),
  ADD KEY `user_answers_question_id` (`question_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `exam_categories`
--
ALTER TABLE `exam_categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `exam_types`
--
ALTER TABLE `exam_types`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `hierarchy_categories`
--
ALTER TABLE `hierarchy_categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `new_tests`
--
ALTER TABLE `new_tests`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `new_test_series`
--
ALTER TABLE `new_test_series`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pdf_categories`
--
ALTER TABLE `pdf_categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `questions`
--
ALTER TABLE `questions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sub_categories`
--
ALTER TABLE `sub_categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tests`
--
ALTER TABLE `tests`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `test_series`
--
ALTER TABLE `test_series`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_answers`
--
ALTER TABLE `user_answers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`parent_category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `exam_categories`
--
ALTER TABLE `exam_categories`
  ADD CONSTRAINT `exam_categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `exam_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `hierarchy_categories`
--
ALTER TABLE `hierarchy_categories`
  ADD CONSTRAINT `hierarchy_categories_ibfk_1` FOREIGN KEY (`test_series_id`) REFERENCES `new_test_series` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `hierarchy_categories_ibfk_2` FOREIGN KEY (`parent_id`) REFERENCES `hierarchy_categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `hierarchy_categories_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL ON UPDATE SET NULL;

--
-- Constraints for table `new_tests`
--
ALTER TABLE `new_tests`
  ADD CONSTRAINT `new_tests_ibfk_1` FOREIGN KEY (`test_series_id`) REFERENCES `new_test_series` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `new_tests_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `hierarchy_categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `new_tests_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL ON UPDATE SET NULL;

--
-- Constraints for table `new_test_series`
--
ALTER TABLE `new_test_series`
  ADD CONSTRAINT `new_test_series_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL ON UPDATE SET NULL;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`uuid`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `pdfs`
--
ALTER TABLE `pdfs`
  ADD CONSTRAINT `pdfs_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `pdf_categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `pdfs_ibfk_2` FOREIGN KEY (`exam_type_id`) REFERENCES `exam_types` (`id`);

--
-- Constraints for table `questions`
--
ALTER TABLE `questions`
  ADD CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `question_imports`
--
ALTER TABLE `question_imports`
  ADD CONSTRAINT `question_imports_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `question_imports_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `question_imports_ibfk_3` FOREIGN KEY (`test_series_id`) REFERENCES `new_test_series` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `subscription`
--
ALTER TABLE `subscription`
  ADD CONSTRAINT `subscription_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`uuid`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `sub_categories`
--
ALTER TABLE `sub_categories`
  ADD CONSTRAINT `sub_categories_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tests`
--
ALTER TABLE `tests`
  ADD CONSTRAINT `tests_ibfk_1` FOREIGN KEY (`sub_category_id`) REFERENCES `sub_categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `test_series`
--
ALTER TABLE `test_series`
  ADD CONSTRAINT `test_series_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `exam_categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `test_sessions`
--
ALTER TABLE `test_sessions`
  ADD CONSTRAINT `test_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`uuid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `test_sessions_ibfk_2` FOREIGN KEY (`test_id`) REFERENCES `tests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `user_answers`
--
ALTER TABLE `user_answers`
  ADD CONSTRAINT `user_answers_ibfk_1` FOREIGN KEY (`test_session_id`) REFERENCES `test_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `user_answers_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
