-- Create subjects table
CREATE TABLE IF NOT EXISTS `subjects` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL COMMENT 'Subject name (e.g., Mathematics, English, etc.)',
  `code` VARCHAR(255) UNIQUE COMMENT 'Short code for subject',
  `description` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_subjects_active` (`is_active`),
  INDEX `idx_subjects_name` (`name`)
) ENGINE=InnoDB;

-- Create subject_hierarchies table
CREATE TABLE IF NOT EXISTS `subject_hierarchies` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL COMMENT 'Hierarchy level name (e.g., Class 6, Chapter 1, etc.)',
  `parent_id` INTEGER,
  `subject_id` INTEGER,
  `level` INTEGER NOT NULL DEFAULT 1 COMMENT 'Hierarchy level (1 = Class, 2 = Chapter, 3 = Topic, etc.)',
  `description` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_subject_hierarchies_parent` (`parent_id`),
  INDEX `idx_subject_hierarchies_subject` (`subject_id`),
  INDEX `idx_subject_hierarchies_active` (`is_active`),
  FOREIGN KEY (`parent_id`) REFERENCES `subject_hierarchies` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Create free_tests table
CREATE TABLE IF NOT EXISTS `free_tests` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL COMMENT 'Free test title',
  `description` TEXT,
  `test_type` ENUM('practice', 'mock', 'sample', 'general') NOT NULL DEFAULT 'practice' COMMENT 'Type of free test',
  `subject_id` INTEGER,
  `subject_hierarchy_id` INTEGER,
  `total_questions` INTEGER NOT NULL DEFAULT 0,
  `duration_minutes` INTEGER NOT NULL DEFAULT 60 COMMENT 'Test duration in minutes',
  `allows_pause_resume` TINYINT(1) DEFAULT 1,
  `negative_marking` TINYINT(1) DEFAULT 0,
  `negative_marks` DECIMAL(3, 2) DEFAULT 0,
  `supports_multilanguage` TINYINT(1) DEFAULT 0 COMMENT 'Whether this test supports multiple languages',
  `instructions` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_featured` TINYINT(1) DEFAULT 0,
  `created_by` INTEGER,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_free_tests_active` (`is_active`),
  INDEX `idx_free_tests_type` (`test_type`),
  INDEX `idx_free_tests_subject` (`subject_id`),
  INDEX `idx_free_tests_created` (`created_at`),
  FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`subject_hierarchy_id`) REFERENCES `subject_hierarchies` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Insert sample subjects
INSERT IGNORE INTO `subjects` (`name`, `code`, `description`, `is_active`) VALUES
('Mathematics', 'MATH', 'Mathematics subject', 1),
('English', 'ENG', 'English subject', 1),
('General Knowledge', 'GK', 'General Knowledge subject', 1),
('Reasoning', 'REASON', 'Reasoning subject', 1),
('Computer Science', 'CS', 'Computer Science subject', 1),
('Physics', 'PHY', 'Physics subject', 1),
('Chemistry', 'CHEM', 'Chemistry subject', 1),
('Biology', 'BIO', 'Biology subject', 1),
('History', 'HIST', 'History subject', 1),
('Geography', 'GEO', 'Geography subject', 1);

-- Insert sample subject hierarchies
INSERT IGNORE INTO `subject_hierarchies` (`name`, `parent_id`, `subject_id`, `level`, `description`) VALUES
-- Mathematics hierarchies
('Class 10', NULL, 1, 1, 'Class 10 Mathematics'),
('Class 12', NULL, 1, 1, 'Class 12 Mathematics'),
('Algebra', 1, 1, 2, 'Algebra topics for Class 10'),
('Geometry', 1, 1, 2, 'Geometry topics for Class 10'),
('Calculus', 2, 1, 2, 'Calculus topics for Class 12'),

-- English hierarchies
('Grammar', NULL, 2, 1, 'English Grammar'),
('Literature', NULL, 2, 1, 'English Literature'),
('Comprehension', NULL, 2, 1, 'Reading Comprehension'),

-- General Knowledge hierarchies
('Indian History', NULL, 3, 1, 'Indian History topics'),
('World Geography', NULL, 3, 1, 'World Geography topics'),
('Current Affairs', NULL, 3, 1, 'Current Affairs and Events'),

-- Reasoning hierarchies
('Logical Reasoning', NULL, 4, 1, 'Logical Reasoning topics'),
('Analytical Reasoning', NULL, 4, 1, 'Analytical Reasoning topics');