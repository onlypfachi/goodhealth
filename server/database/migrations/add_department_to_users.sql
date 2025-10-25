-- Migration: Add department_id field to Users table for patient department tracking
-- Date: 2025-10-05

USE good_health_hospital;

-- Add department_id column to Users table
ALTER TABLE Users
ADD COLUMN department_id INT DEFAULT NULL AFTER gender,
ADD CONSTRAINT fk_user_department FOREIGN KEY (department_id) REFERENCES Departments(department_id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_users_department ON Users(department_id);

-- Update existing patients with their most recent department from appointments
UPDATE Users u
SET department_id = (
    SELECT a.department_id
    FROM Appointments a
    WHERE a.patient_id = u.user_id
    ORDER BY a.created_at DESC
    LIMIT 1
)
WHERE u.role = 'patient';
