-- Fix Migration Conflicts Script
-- This script will mark the conflicting migrations as completed in the server database
-- Run this on your server database BEFORE running the migrations

USE mocktaledb;

-- Insert migration records for migrations that are trying to recreate existing tables
INSERT INTO SequelizeMeta (name) VALUES ('20250824000001-create-users') 
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO SequelizeMeta (name) VALUES ('20250824000002-create-admins') 
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO SequelizeMeta (name) VALUES ('20250824000003-create-exam-types') 
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO SequelizeMeta (name) VALUES ('20250824000016-create-pdf-categories') 
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO SequelizeMeta (name) VALUES ('20250824000010-create-test-series') 
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO SequelizeMeta (name) VALUES ('20250824000012-create-tests') 
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO SequelizeMeta (name) VALUES ('20250824000009-create-questions') 
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO SequelizeMeta (name) VALUES ('20250824000017-create-pdfs') 
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO SequelizeMeta (name) VALUES ('20250824000013-create-subscription') 
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO SequelizeMeta (name) VALUES ('20250824000015-create-user-answers') 
ON DUPLICATE KEY UPDATE name = name;

-- Show which migrations are now marked as completed
SELECT name FROM SequelizeMeta WHERE name LIKE '20250824%' ORDER BY name;