-- ================================================================
-- Migration: Profile, Account Security, and Activity Summary
-- Description: Add fields for 2FA, activity logs, and ensure
--              profile fields are properly set up
-- ================================================================

USE good_health_hospital;

-- ================================================================
-- 1. Update Staff Table for Profile & Security Features
-- ================================================================

-- Add 2FA fields if they don't exist
ALTER TABLE Staff
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE AFTER password,
ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255) DEFAULT NULL AFTER two_factor_enabled,
ADD COLUMN IF NOT EXISTS backup_codes TEXT DEFAULT NULL AFTER two_factor_secret,
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP NULL DEFAULT NULL AFTER backup_codes,
ADD COLUMN IF NOT EXISTS profile_updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER last_password_change;

-- Add index for 2FA lookups
CREATE INDEX IF NOT EXISTS idx_two_factor_enabled ON Staff(two_factor_enabled);

-- ================================================================
-- 2. Create Activity Logs Table
-- ================================================================

CREATE TABLE IF NOT EXISTS ActivityLogs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_role ENUM('patient', 'doctor', 'admin', 'superadmin') NOT NULL,
    action_type ENUM('login', 'logout', 'profile_update', 'password_change', '2fa_enable', '2fa_disable', 'account_created', 'appointment_booked', 'message_sent') NOT NULL,
    action_description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_user_role (user_role),
    INDEX idx_action_type (action_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 3. Create Monthly Summary View (for optimized queries)
-- ================================================================

-- This view provides quick access to monthly statistics
CREATE OR REPLACE VIEW MonthlySummary AS
SELECT
    DATE_FORMAT(created_at, '%Y-%m') AS month_year,

    -- New Patients
    COUNT(CASE WHEN user_role = 'patient' AND action_type = 'account_created' THEN 1 END) AS new_patients,

    -- New Doctors
    COUNT(CASE WHEN user_role = 'doctor' AND action_type = 'account_created' THEN 1 END) AS new_doctors,

    -- New Admins
    COUNT(CASE WHEN user_role IN ('admin', 'superadmin') AND action_type = 'account_created' THEN 1 END) AS new_admins,

    -- Appointments Booked
    COUNT(CASE WHEN action_type = 'appointment_booked' THEN 1 END) AS appointments_booked,

    -- Messages Sent
    COUNT(CASE WHEN action_type = 'message_sent' THEN 1 END) AS messages_sent,

    -- Total Logins
    COUNT(CASE WHEN action_type = 'login' THEN 1 END) AS total_logins,

    -- Profile Updates
    COUNT(CASE WHEN action_type = 'profile_update' THEN 1 END) AS profile_updates,

    -- Password Changes
    COUNT(CASE WHEN action_type = 'password_change' THEN 1 END) AS password_changes

FROM ActivityLogs
GROUP BY month_year
ORDER BY month_year DESC;

-- ================================================================
-- 4. Insert Sample Activity Logs for Testing
-- ================================================================

-- Sample activity logs for the current month (October 2025)
INSERT INTO ActivityLogs (user_id, user_role, action_type, action_description, ip_address, created_at) VALUES
-- Patient activities
(1, 'patient', 'account_created', 'New patient account created', '192.168.1.101', '2025-10-01 09:15:00'),
(2, 'patient', 'account_created', 'New patient account created', '192.168.1.102', '2025-10-02 10:30:00'),
(3, 'patient', 'account_created', 'New patient account created', '192.168.1.103', '2025-10-03 11:45:00'),
(4, 'patient', 'account_created', 'New patient account created', '192.168.1.104', '2025-10-04 14:20:00'),
(5, 'patient', 'account_created', 'New patient account created', '192.168.1.105', '2025-10-05 08:30:00'),

-- Doctor activities
(1, 'doctor', 'account_created', 'New doctor account created - Dr. Sarah Johnson', '192.168.1.201', '2025-10-01 08:00:00'),
(2, 'doctor', 'account_created', 'New doctor account created - Dr. Michael Chen', '192.168.1.202', '2025-10-02 09:00:00'),
(3, 'doctor', 'account_created', 'New doctor account created - Dr. Emily Rodriguez', '192.168.1.203', '2025-10-03 10:00:00'),

-- Admin activities
(1, 'admin', 'account_created', 'New admin account created', '192.168.1.50', '2025-10-01 07:00:00'),
(2, 'superadmin', 'account_created', 'Superadmin account created', '192.168.1.51', '2025-10-01 07:15:00'),

-- Appointment bookings
(1, 'patient', 'appointment_booked', 'Appointment booked with Dr. Sarah Johnson', '192.168.1.101', '2025-10-01 10:30:00'),
(2, 'patient', 'appointment_booked', 'Appointment booked with Dr. Michael Chen', '192.168.1.102', '2025-10-02 11:00:00'),
(3, 'patient', 'appointment_booked', 'Appointment booked with Dr. Emily Rodriguez', '192.168.1.103', '2025-10-03 14:15:00'),
(4, 'patient', 'appointment_booked', 'Appointment booked with Dr. Sarah Johnson', '192.168.1.104', '2025-10-04 09:30:00'),
(5, 'patient', 'appointment_booked', 'Appointment booked with Dr. Michael Chen', '192.168.1.105', '2025-10-05 15:45:00'),
(1, 'patient', 'appointment_booked', 'Appointment booked with Dr. Emily Rodriguez', '192.168.1.101', '2025-10-05 16:00:00'),

-- Messages sent
(1, 'doctor', 'message_sent', 'Urgent message sent to admin', '192.168.1.201', '2025-10-01 12:30:00'),
(2, 'doctor', 'message_sent', 'Normal message sent to admin', '192.168.1.202', '2025-10-02 13:15:00'),
(3, 'doctor', 'message_sent', 'Urgent message sent to admin', '192.168.1.203', '2025-10-03 14:45:00'),
(1, 'doctor', 'message_sent', 'Normal message sent to admin', '192.168.1.201', '2025-10-04 10:20:00'),
(2, 'doctor', 'message_sent', 'Urgent message sent to admin', '192.168.1.202', '2025-10-05 11:30:00'),

-- Login activities
(1, 'admin', 'login', 'Admin logged in', '192.168.1.50', '2025-10-01 08:30:00'),
(1, 'admin', 'login', 'Admin logged in', '192.168.1.50', '2025-10-02 08:15:00'),
(1, 'admin', 'login', 'Admin logged in', '192.168.1.50', '2025-10-03 08:45:00'),
(1, 'admin', 'login', 'Admin logged in', '192.168.1.50', '2025-10-04 09:00:00'),
(1, 'admin', 'login', 'Admin logged in', '192.168.1.50', '2025-10-05 08:30:00'),

-- Profile updates
(1, 'admin', 'profile_update', 'Admin updated profile information', '192.168.1.50', '2025-10-02 10:15:00'),
(1, 'doctor', 'profile_update', 'Doctor updated profile information', '192.168.1.201', '2025-10-03 11:30:00'),

-- Password changes
(1, 'admin', 'password_change', 'Admin changed password', '192.168.1.50', '2025-10-01 14:30:00'),

-- 2FA activities
(1, 'admin', '2fa_enable', 'Admin enabled 2FA', '192.168.1.50', '2025-10-01 15:00:00');

-- Sample logs for previous month (September 2025) for comparison
INSERT INTO ActivityLogs (user_id, user_role, action_type, action_description, created_at) VALUES
(1, 'patient', 'account_created', 'New patient account created', '2025-09-15 10:00:00'),
(2, 'patient', 'account_created', 'New patient account created', '2025-09-18 11:00:00'),
(1, 'doctor', 'account_created', 'New doctor account created', '2025-09-10 09:00:00'),
(1, 'admin', 'account_created', 'New admin account created', '2025-09-05 08:00:00'),
(1, 'patient', 'appointment_booked', 'Appointment booked', '2025-09-20 14:00:00'),
(2, 'patient', 'appointment_booked', 'Appointment booked', '2025-09-22 15:00:00'),
(1, 'doctor', 'message_sent', 'Message sent to admin', '2025-09-25 12:00:00');

-- ================================================================
-- 5. Create Stored Procedure for Monthly Summary
-- ================================================================

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS GetMonthlySummary(IN target_month VARCHAR(7))
BEGIN
    -- target_month format: 'YYYY-MM' (e.g., '2025-10')

    SELECT
        COALESCE(SUM(CASE WHEN user_role = 'patient' AND action_type = 'account_created' THEN 1 ELSE 0 END), 0) AS new_patients,
        COALESCE(SUM(CASE WHEN user_role = 'doctor' AND action_type = 'account_created' THEN 1 ELSE 0 END), 0) AS new_doctors,
        COALESCE(SUM(CASE WHEN user_role IN ('admin', 'superadmin') AND action_type = 'account_created' THEN 1 ELSE 0 END), 0) AS new_admins,
        COALESCE(SUM(CASE WHEN action_type = 'appointment_booked' THEN 1 ELSE 0 END), 0) AS appointments_booked,
        COALESCE(SUM(CASE WHEN action_type = 'message_sent' THEN 1 ELSE 0 END), 0) AS messages_sent,
        COALESCE(SUM(CASE WHEN action_type = 'login' THEN 1 ELSE 0 END), 0) AS total_logins,
        COALESCE(SUM(CASE WHEN action_type = 'profile_update' THEN 1 ELSE 0 END), 0) AS profile_updates,
        COALESCE(SUM(CASE WHEN action_type = 'password_change' THEN 1 ELSE 0 END), 0) AS password_changes,
        COALESCE(SUM(CASE WHEN action_type = '2fa_enable' THEN 1 ELSE 0 END), 0) AS two_factor_enabled,
        COALESCE(SUM(CASE WHEN action_type = '2fa_disable' THEN 1 ELSE 0 END), 0) AS two_factor_disabled
    FROM ActivityLogs
    WHERE DATE_FORMAT(created_at, '%Y-%m') = target_month;
END //

DELIMITER ;

-- ================================================================
-- 6. Create Function to Log Activity
-- ================================================================

DELIMITER //

CREATE FUNCTION IF NOT EXISTS LogActivity(
    p_user_id INT,
    p_user_role VARCHAR(20),
    p_action_type VARCHAR(50),
    p_action_description TEXT,
    p_ip_address VARCHAR(45)
) RETURNS INT
DETERMINISTIC
BEGIN
    INSERT INTO ActivityLogs (user_id, user_role, action_type, action_description, ip_address)
    VALUES (p_user_id, p_user_role, p_action_type, p_action_description, p_ip_address);

    RETURN LAST_INSERT_ID();
END //

DELIMITER ;

-- ================================================================
-- 7. Verification Queries
-- ================================================================

-- Verify Staff table structure
SELECT 'Staff table columns:' AS Info;
SHOW COLUMNS FROM Staff;

-- Verify ActivityLogs table
SELECT 'ActivityLogs table columns:' AS Info;
SHOW COLUMNS FROM ActivityLogs;

-- Test monthly summary for current month
SELECT 'Current Month Summary (October 2025):' AS Info;
CALL GetMonthlySummary('2025-10');

-- Test monthly summary for previous month
SELECT 'Previous Month Summary (September 2025):' AS Info;
CALL GetMonthlySummary('2025-09');

-- Show all monthly summaries
SELECT 'All Monthly Summaries:' AS Info;
SELECT * FROM MonthlySummary;

-- ================================================================
-- Migration Complete
-- ================================================================

SELECT '✅ Profile, Security & Activity Summary migration completed successfully!' AS Status;
