-- ================================================================
-- Migration: Profile, Account Security, and Activity Summary
-- Version: 2 (MySQL compatible)
-- ================================================================

USE good_health_hospital;

-- ================================================================
-- 1. Create Activity Logs Table
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
-- 2. Create Monthly Summary View
-- ================================================================

CREATE OR REPLACE VIEW MonthlySummary AS
SELECT
    DATE_FORMAT(created_at, '%Y-%m') AS month_year,
    COUNT(CASE WHEN user_role = 'patient' AND action_type = 'account_created' THEN 1 END) AS new_patients,
    COUNT(CASE WHEN user_role = 'doctor' AND action_type = 'account_created' THEN 1 END) AS new_doctors,
    COUNT(CASE WHEN user_role IN ('admin', 'superadmin') AND action_type = 'account_created' THEN 1 END) AS new_admins,
    COUNT(CASE WHEN action_type = 'appointment_booked' THEN 1 END) AS appointments_booked,
    COUNT(CASE WHEN action_type = 'message_sent' THEN 1 END) AS messages_sent,
    COUNT(CASE WHEN action_type = 'login' THEN 1 END) AS total_logins,
    COUNT(CASE WHEN action_type = 'profile_update' THEN 1 END) AS profile_updates,
    COUNT(CASE WHEN action_type = 'password_change' THEN 1 END) AS password_changes
FROM ActivityLogs
GROUP BY month_year
ORDER BY month_year DESC;

-- ================================================================
-- 3. Insert Sample Activity Logs
-- ================================================================

INSERT INTO ActivityLogs (user_id, user_role, action_type, action_description, ip_address, created_at) VALUES
-- October 2025 - Current month
(1, 'patient', 'account_created', 'New patient account created', '192.168.1.101', '2025-10-01 09:15:00'),
(2, 'patient', 'account_created', 'New patient account created', '192.168.1.102', '2025-10-02 10:30:00'),
(3, 'patient', 'account_created', 'New patient account created', '192.168.1.103', '2025-10-03 11:45:00'),
(4, 'patient', 'account_created', 'New patient account created', '192.168.1.104', '2025-10-04 14:20:00'),
(5, 'patient', 'account_created', 'New patient account created', '192.168.1.105', '2025-10-05 08:30:00'),

(1, 'doctor', 'account_created', 'New doctor account - Dr. Sarah Johnson', '192.168.1.201', '2025-10-01 08:00:00'),
(2, 'doctor', 'account_created', 'New doctor account - Dr. Michael Chen', '192.168.1.202', '2025-10-02 09:00:00'),
(3, 'doctor', 'account_created', 'New doctor account - Dr. Emily Rodriguez', '192.168.1.203', '2025-10-03 10:00:00'),

(1, 'admin', 'account_created', 'New admin account created', '192.168.1.50', '2025-10-01 07:00:00'),
(2, 'superadmin', 'account_created', 'Superadmin account created', '192.168.1.51', '2025-10-01 07:15:00'),

(1, 'patient', 'appointment_booked', 'Appointment with Dr. Sarah Johnson', '192.168.1.101', '2025-10-01 10:30:00'),
(2, 'patient', 'appointment_booked', 'Appointment with Dr. Michael Chen', '192.168.1.102', '2025-10-02 11:00:00'),
(3, 'patient', 'appointment_booked', 'Appointment with Dr. Emily Rodriguez', '192.168.1.103', '2025-10-03 14:15:00'),
(4, 'patient', 'appointment_booked', 'Appointment with Dr. Sarah Johnson', '192.168.1.104', '2025-10-04 09:30:00'),
(5, 'patient', 'appointment_booked', 'Appointment with Dr. Michael Chen', '192.168.1.105', '2025-10-05 15:45:00'),
(1, 'patient', 'appointment_booked', 'Appointment with Dr. Emily Rodriguez', '192.168.1.101', '2025-10-05 16:00:00'),

(1, 'doctor', 'message_sent', 'Urgent message sent to admin', '192.168.1.201', '2025-10-01 12:30:00'),
(2, 'doctor', 'message_sent', 'Normal message sent to admin', '192.168.1.202', '2025-10-02 13:15:00'),
(3, 'doctor', 'message_sent', 'Urgent message sent to admin', '192.168.1.203', '2025-10-03 14:45:00'),
(1, 'doctor', 'message_sent', 'Normal message sent to admin', '192.168.1.201', '2025-10-04 10:20:00'),
(2, 'doctor', 'message_sent', 'Urgent message sent to admin', '192.168.1.202', '2025-10-05 11:30:00'),

(1, 'admin', 'login', 'Admin logged in', '192.168.1.50', '2025-10-01 08:30:00'),
(1, 'admin', 'login', 'Admin logged in', '192.168.1.50', '2025-10-02 08:15:00'),
(1, 'admin', 'login', 'Admin logged in', '192.168.1.50', '2025-10-03 08:45:00'),
(1, 'admin', 'login', 'Admin logged in', '192.168.1.50', '2025-10-04 09:00:00'),
(1, 'admin', 'login', 'Admin logged in', '192.168.1.50', '2025-10-05 08:30:00'),

(1, 'admin', 'profile_update', 'Admin updated profile', '192.168.1.50', '2025-10-02 10:15:00'),
(1, 'doctor', 'profile_update', 'Doctor updated profile', '192.168.1.201', '2025-10-03 11:30:00'),

(1, 'admin', 'password_change', 'Admin changed password', '192.168.1.50', '2025-10-01 14:30:00'),
(1, 'admin', '2fa_enable', 'Admin enabled 2FA', '192.168.1.50', '2025-10-01 15:00:00'),

-- September 2025 - Previous month for comparison
(1, 'patient', 'account_created', 'New patient account', '192.168.1.101', '2025-09-15 10:00:00'),
(2, 'patient', 'account_created', 'New patient account', '192.168.1.102', '2025-09-18 11:00:00'),
(1, 'doctor', 'account_created', 'New doctor account', '192.168.1.201', '2025-09-10 09:00:00'),
(1, 'admin', 'account_created', 'New admin account', '192.168.1.50', '2025-09-05 08:00:00'),
(1, 'patient', 'appointment_booked', 'Appointment booked', '192.168.1.101', '2025-09-20 14:00:00'),
(2, 'patient', 'appointment_booked', 'Appointment booked', '192.168.1.102', '2025-09-22 15:00:00'),
(1, 'doctor', 'message_sent', 'Message sent', '192.168.1.201', '2025-09-25 12:00:00');

SELECT '✅ Activity logs and view created successfully!' AS Status;
