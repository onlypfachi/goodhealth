-- Migration: Create Messages table for admin-doctor communications
-- Date: 2025-10-05

USE good_health_hospital;

-- Create Messages table
CREATE TABLE IF NOT EXISTS Messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    sender_role ENUM('doctor', 'admin', 'patient') NOT NULL,
    recipient_id INT DEFAULT NULL,
    recipient_role ENUM('admin', 'doctor') DEFAULT 'admin',
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority ENUM('normal', 'urgent') DEFAULT 'normal',
    status ENUM('unread', 'read') DEFAULT 'unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL DEFAULT NULL,

    -- Foreign keys
    CONSTRAINT fk_message_sender FOREIGN KEY (sender_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_message_recipient FOREIGN KEY (recipient_id) REFERENCES Users(user_id) ON DELETE SET NULL,

    -- Indexes for performance
    INDEX idx_messages_recipient (recipient_id, status),
    INDEX idx_messages_sender (sender_id),
    INDEX idx_messages_priority (priority),
    INDEX idx_messages_status (status),
    INDEX idx_messages_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add sample messages for testing (optional)
INSERT INTO Messages (sender_id, sender_name, sender_role, subject, content, priority, status)
SELECT
    u.user_id,
    u.full_name,
    'doctor',
    CASE
        WHEN RAND() > 0.7 THEN 'Urgent: Patient Transfer Request'
        WHEN RAND() > 0.5 THEN 'Equipment Request for Department'
        WHEN RAND() > 0.3 THEN 'Schedule Change Request'
        ELSE 'General Inquiry'
    END,
    CASE
        WHEN RAND() > 0.7 THEN 'Requesting immediate transfer of patient to ICU for critical monitoring. Please approve.'
        WHEN RAND() > 0.5 THEN 'Need approval for new medical equipment. Budget estimate attached.'
        WHEN RAND() > 0.3 THEN 'Would like to adjust my schedule for next week due to personal reasons.'
        ELSE 'I have some questions regarding the new hospital protocols.'
    END,
    CASE WHEN RAND() > 0.7 THEN 'urgent' ELSE 'normal' END,
    CASE WHEN RAND() > 0.5 THEN 'unread' ELSE 'read' END
FROM Users u
WHERE u.role = 'doctor'
LIMIT 10;
