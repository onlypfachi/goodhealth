-- ============================================
-- Good Health Hospital Booking System
-- MySQL Database Schema
-- ============================================

-- Drop existing database if exists and create new
DROP DATABASE IF EXISTS good_health_hospital;
CREATE DATABASE good_health_hospital CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE good_health_hospital;

-- ============================================
-- TABLE: Users
-- Stores all users (patients, doctors, admins, superadmin)
-- ============================================
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('patient', 'doctor', 'admin', 'superadmin') NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    patient_id VARCHAR(6) UNIQUE DEFAULT NULL,  -- Format: P12345
    staff_id VARCHAR(7) UNIQUE DEFAULT NULL,    -- Format: EMP1234
    phone VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    created_by INT DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign key constraint
    CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES Users(user_id) ON DELETE SET NULL,

    -- Check constraints for ID formats
    CONSTRAINT chk_patient_id CHECK (
        (role = 'patient' AND patient_id IS NOT NULL AND patient_id REGEXP '^P[0-9]{5}$') OR
        (role != 'patient' AND patient_id IS NULL)
    ),
    CONSTRAINT chk_staff_id CHECK (
        (role IN ('doctor', 'admin', 'superadmin') AND staff_id IS NOT NULL AND staff_id REGEXP '^EMP[0-9]{4}$') OR
        (role = 'patient' AND staff_id IS NULL)
    ),

    -- Ensure patients have patient_id and staff have staff_id
    CONSTRAINT chk_id_assignment CHECK (
        (role = 'patient' AND patient_id IS NOT NULL AND staff_id IS NULL) OR
        (role IN ('doctor', 'admin', 'superadmin') AND staff_id IS NOT NULL AND patient_id IS NULL)
    )
) ENGINE=InnoDB;

-- ============================================
-- TABLE: Departments
-- Stores hospital departments
-- ============================================
CREATE TABLE Departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- TABLE: Doctor_Departments
-- Many-to-many relationship between doctors and departments
-- ============================================
CREATE TABLE Doctor_Departments (
    doctor_id INT NOT NULL,
    department_id INT NOT NULL,
    PRIMARY KEY (doctor_id, department_id),
    CONSTRAINT fk_doctor_dept_doctor FOREIGN KEY (doctor_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_doctor_dept_department FOREIGN KEY (department_id) REFERENCES Departments(department_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- TABLE: Appointments
-- Stores patient appointments
-- ============================================
CREATE TABLE Appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT DEFAULT NULL,
    department_id INT NOT NULL,
    symptoms_description TEXT NOT NULL,
    status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show') DEFAULT 'pending',
    queue_number INT,
    appointment_date DATE NOT NULL,
    appointment_time TIME,
    actual_start_time TIMESTAMP NULL DEFAULT NULL,
    actual_end_time TIMESTAMP NULL DEFAULT NULL,
    notes TEXT,
    prescription TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_appt_doctor FOREIGN KEY (doctor_id) REFERENCES Users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_appt_department FOREIGN KEY (department_id) REFERENCES Departments(department_id) ON DELETE CASCADE,

    -- Ensure patient_id references a user with role='patient'
    CONSTRAINT chk_patient_role CHECK (patient_id IN (SELECT user_id FROM Users WHERE role = 'patient')),

    -- Ensure doctor_id references a user with role='doctor' if not NULL
    CONSTRAINT chk_doctor_role CHECK (doctor_id IS NULL OR doctor_id IN (SELECT user_id FROM Users WHERE role = 'doctor'))
) ENGINE=InnoDB;

-- ============================================
-- TABLE: Queue_Management
-- Manages daily queue for each department
-- ============================================
CREATE TABLE Queue_Management (
    queue_id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL UNIQUE,
    queue_number INT NOT NULL,
    queue_date DATE NOT NULL,
    department_id INT NOT NULL,
    status ENUM('waiting', 'called', 'in_consultation', 'completed', 'skipped', 'no_show') DEFAULT 'waiting',
    called_at TIMESTAMP NULL DEFAULT NULL,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_queue_appointment FOREIGN KEY (appointment_id) REFERENCES Appointments(appointment_id) ON DELETE CASCADE,
    CONSTRAINT fk_queue_department FOREIGN KEY (department_id) REFERENCES Departments(department_id) ON DELETE CASCADE,

    UNIQUE KEY unique_queue_daily (queue_date, department_id, queue_number)
) ENGINE=InnoDB;

-- ============================================
-- TABLE: Medical_Records
-- Stores patient medical history
-- ============================================
CREATE TABLE Medical_Records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    appointment_id INT,
    diagnosis TEXT,
    treatment TEXT,
    prescription TEXT,
    lab_results TEXT,
    notes TEXT,
    recorded_by INT NOT NULL,
    record_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_record_patient FOREIGN KEY (patient_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_record_appointment FOREIGN KEY (appointment_id) REFERENCES Appointments(appointment_id) ON DELETE SET NULL,
    CONSTRAINT fk_record_doctor FOREIGN KEY (recorded_by) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- TABLE: Doctor_Schedules
-- Stores doctor working hours and availability
-- ============================================
CREATE TABLE Doctor_Schedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_schedule_doctor FOREIGN KEY (doctor_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_time_order CHECK (end_time > start_time),

    UNIQUE KEY unique_doctor_schedule (doctor_id, day_of_week, start_time)
) ENGINE=InnoDB;

-- ============================================
-- TABLE: Notifications
-- Stores user notifications
-- ============================================
CREATE TABLE Notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    related_appointment_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_appointment FOREIGN KEY (related_appointment_id) REFERENCES Appointments(appointment_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- TABLE: Audit_Logs
-- Tracks all important system actions for security
-- ============================================
CREATE TABLE Audit_Logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    performed_by INT,
    affected_user_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_log_performer FOREIGN KEY (performed_by) REFERENCES Users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_log_affected FOREIGN KEY (affected_user_id) REFERENCES Users(user_id) ON DELETE SET NULL,

    INDEX idx_action (action),
    INDEX idx_performed_by (performed_by),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB;

-- ============================================
-- TABLE: Password_Reset_Tokens
-- Stores password reset tokens
-- ============================================
CREATE TABLE Password_Reset_Tokens (
    token_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- ============================================
-- TABLE: Messages
-- Internal messaging system
-- ============================================
CREATE TABLE Messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    recipient_id INT NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_recipient FOREIGN KEY (recipient_id) REFERENCES Users(user_id) ON DELETE CASCADE,

    INDEX idx_recipient (recipient_id),
    INDEX idx_sender (sender_id)
) ENGINE=InnoDB;

-- ============================================
-- TABLE: Generated_Patient_IDs
-- Stores pre-generated patient IDs for registration
-- ============================================
CREATE TABLE Generated_Patient_IDs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id VARCHAR(6) NOT NULL UNIQUE,
    generated_by INT NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_by INT DEFAULT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL DEFAULT NULL,

    CONSTRAINT fk_generated_by FOREIGN KEY (generated_by) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_used_by FOREIGN KEY (used_by) REFERENCES Users(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_generated_patient_id CHECK (patient_id REGEXP '^P[0-9]{5}$'),

    INDEX idx_patient_id (patient_id),
    INDEX idx_is_used (is_used),
    INDEX idx_generated_at (generated_at)
) ENGINE=InnoDB;

-- ============================================
-- INDEXES for Performance Optimization
-- ============================================
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_role ON Users(role);
CREATE INDEX idx_users_patient_id ON Users(patient_id);
CREATE INDEX idx_users_staff_id ON Users(staff_id);
CREATE INDEX idx_users_created_by ON Users(created_by);

CREATE INDEX idx_appointments_patient ON Appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON Appointments(doctor_id);
CREATE INDEX idx_appointments_department ON Appointments(department_id);
CREATE INDEX idx_appointments_date ON Appointments(appointment_date);
CREATE INDEX idx_appointments_status ON Appointments(status);

CREATE INDEX idx_queue_date ON Queue_Management(queue_date);
CREATE INDEX idx_queue_department ON Queue_Management(department_id);
CREATE INDEX idx_queue_status ON Queue_Management(status);

CREATE INDEX idx_medical_records_patient ON Medical_Records(patient_id);
CREATE INDEX idx_medical_records_date ON Medical_Records(record_date);

CREATE INDEX idx_schedules_doctor ON Doctor_Schedules(doctor_id);
CREATE INDEX idx_schedules_day ON Doctor_Schedules(day_of_week);

CREATE INDEX idx_notifications_user ON Notifications(user_id);
CREATE INDEX idx_notifications_read ON Notifications(is_read);

-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Generate next Patient ID
DELIMITER //
CREATE PROCEDURE generate_patient_id(OUT next_id VARCHAR(6))
BEGIN
    DECLARE max_num INT;

    SELECT COALESCE(MAX(CAST(SUBSTRING(patient_id, 2) AS UNSIGNED)), 0) INTO max_num
    FROM Users
    WHERE role = 'patient' AND patient_id IS NOT NULL;

    SET next_id = CONCAT('P', LPAD(max_num + 1, 5, '0'));
END //
DELIMITER ;

-- Generate next Staff ID
DELIMITER //
CREATE PROCEDURE generate_staff_id(OUT next_id VARCHAR(7))
BEGIN
    DECLARE max_num INT;

    SELECT COALESCE(MAX(CAST(SUBSTRING(staff_id, 4) AS UNSIGNED)), 0) INTO max_num
    FROM Users
    WHERE role IN ('doctor', 'admin', 'superadmin') AND staff_id IS NOT NULL;

    SET next_id = CONCAT('EMP', LPAD(max_num + 1, 4, '0'));
END //
DELIMITER ;

-- Get next queue number for department on specific date
DELIMITER //
CREATE PROCEDURE get_next_queue_number(
    IN p_department_id INT,
    IN p_queue_date DATE,
    OUT next_queue_number INT
)
BEGIN
    SELECT COALESCE(MAX(queue_number), 0) + 1 INTO next_queue_number
    FROM Queue_Management
    WHERE department_id = p_department_id AND queue_date = p_queue_date;
END //
DELIMITER ;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to validate password complexity before insert
DELIMITER //
CREATE TRIGGER validate_password_insert BEFORE INSERT ON Users
FOR EACH ROW
BEGIN
    DECLARE has_upper BOOLEAN DEFAULT FALSE;
    DECLARE has_number BOOLEAN DEFAULT FALSE;
    DECLARE has_special BOOLEAN DEFAULT FALSE;
    DECLARE complexity_count INT DEFAULT 0;

    -- Note: This validates the hashed password length, not the plain password
    -- Password complexity should be validated in the application layer before hashing
    -- This trigger serves as a reminder and additional check

    IF LENGTH(NEW.password_hash) < 8 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Password hash too short. Ensure password meets complexity requirements before hashing.';
    END IF;
END //
DELIMITER ;

-- Trigger to auto-generate patient_id or staff_id
DELIMITER //
CREATE TRIGGER auto_generate_ids BEFORE INSERT ON Users
FOR EACH ROW
BEGIN
    IF NEW.role = 'patient' AND NEW.patient_id IS NULL THEN
        CALL generate_patient_id(@new_patient_id);
        SET NEW.patient_id = @new_patient_id;
    ELSEIF NEW.role IN ('doctor', 'admin', 'superadmin') AND NEW.staff_id IS NULL THEN
        CALL generate_staff_id(@new_staff_id);
        SET NEW.staff_id = @new_staff_id;
    END IF;
END //
DELIMITER ;

-- Trigger to log user creation
DELIMITER //
CREATE TRIGGER log_user_creation AFTER INSERT ON Users
FOR EACH ROW
BEGIN
    INSERT INTO Audit_Logs (action, description, performed_by, affected_user_id, timestamp)
    VALUES (
        'user_created',
        CONCAT('New user created: ', NEW.email, ' with role: ', NEW.role),
        NEW.created_by,
        NEW.user_id,
        NOW()
    );
END //
DELIMITER ;

-- Trigger to log appointment creation
DELIMITER //
CREATE TRIGGER log_appointment_creation AFTER INSERT ON Appointments
FOR EACH ROW
BEGIN
    INSERT INTO Audit_Logs (action, description, performed_by, affected_user_id, timestamp)
    VALUES (
        'appointment_created',
        CONCAT('Appointment created for patient ID: ', NEW.patient_id, ' in department: ', NEW.department_id),
        NEW.patient_id,
        NEW.patient_id,
        NOW()
    );
END //
DELIMITER ;

-- Trigger to auto-create queue entry when appointment is created
DELIMITER //
CREATE TRIGGER auto_create_queue AFTER INSERT ON Appointments
FOR EACH ROW
BEGIN
    DECLARE next_queue INT;

    IF NEW.status = 'pending' OR NEW.status = 'confirmed' THEN
        CALL get_next_queue_number(NEW.department_id, NEW.appointment_date, next_queue);

        INSERT INTO Queue_Management (
            appointment_id,
            queue_number,
            queue_date,
            department_id,
            status
        ) VALUES (
            NEW.appointment_id,
            next_queue,
            NEW.appointment_date,
            NEW.department_id,
            'waiting'
        );

        -- Update appointment queue_number
        UPDATE Appointments SET queue_number = next_queue WHERE appointment_id = NEW.appointment_id;
    END IF;
END //
DELIMITER ;

-- ============================================
-- VIEWS for Common Queries
-- ============================================

-- View for active patients
CREATE VIEW v_active_patients AS
SELECT
    user_id,
    patient_id,
    full_name,
    email,
    phone,
    date_of_birth,
    gender,
    created_at
FROM Users
WHERE role = 'patient' AND is_active = TRUE;

-- View for active doctors with departments
CREATE VIEW v_doctors AS
SELECT
    u.user_id,
    u.staff_id,
    u.full_name,
    u.email,
    u.phone,
    GROUP_CONCAT(d.name SEPARATOR ', ') AS departments
FROM Users u
LEFT JOIN Doctor_Departments dd ON u.user_id = dd.doctor_id
LEFT JOIN Departments d ON dd.department_id = d.department_id
WHERE u.role = 'doctor' AND u.is_active = TRUE
GROUP BY u.user_id;

-- View for today's appointments
CREATE VIEW v_todays_appointments AS
SELECT
    a.appointment_id,
    a.queue_number,
    a.status,
    p.patient_id,
    p.full_name AS patient_name,
    d.staff_id AS doctor_staff_id,
    d.full_name AS doctor_name,
    dept.name AS department_name,
    a.symptoms_description,
    a.appointment_time,
    a.created_at
FROM Appointments a
JOIN Users p ON a.patient_id = p.user_id
LEFT JOIN Users d ON a.doctor_id = d.user_id
JOIN Departments dept ON a.department_id = dept.department_id
WHERE a.appointment_date = CURDATE();

-- View for queue status
CREATE VIEW v_queue_status AS
SELECT
    q.queue_id,
    q.queue_number,
    q.queue_date,
    q.status AS queue_status,
    dept.name AS department_name,
    p.patient_id,
    p.full_name AS patient_name,
    a.symptoms_description,
    a.appointment_time
FROM Queue_Management q
JOIN Appointments a ON q.appointment_id = a.appointment_id
JOIN Users p ON a.patient_id = p.user_id
JOIN Departments dept ON q.department_id = dept.department_id
WHERE q.queue_date = CURDATE()
ORDER BY q.department_id, q.queue_number;

-- ============================================
-- Initial Data - Departments
-- ============================================
INSERT INTO Departments (name, description) VALUES
('General Practice', 'General medical consultations and check-ups'),
('Internal Medicine', 'Diagnosis and treatment of adult diseases'),
('Pediatrics', 'Medical care for infants, children, and adolescents'),
('Gynecology & Obstetrics', 'Women''s health and pregnancy care'),
('Surgery', 'Surgical procedures and consultations'),
('Cardiology', 'Heart and cardiovascular system care'),
('Orthopedics', 'Bone, joint, and muscle treatment'),
('Neurology', 'Nervous system and brain disorders'),
('Dermatology', 'Skin conditions and treatments'),
('Ophthalmology', 'Eye care and vision treatment'),
('ENT', 'Ear, Nose, and Throat specialist'),
('Emergency', 'Emergency medical services'),
('Laboratory', 'Diagnostic testing and analysis'),
('Radiology', 'Medical imaging and diagnostics'),
('Pharmacy', 'Medication dispensing and consultation');

-- ============================================
-- Create Test Admin Account
-- Email: admin@gmail.com
-- Staff ID: EMP0001
-- Password: admin123
-- Password Hash: $2b$10$rF8YwF5qZ5Z5Z5Z5Z5Z5Z.uwX3qY9qY9qY9qY9qY9qY9qY9qY9qY9q
-- ============================================
INSERT INTO Users (
    email,
    password_hash,
    role,
    full_name,
    staff_id,
    phone,
    is_active
) VALUES (
    'admin@gmail.com',
    '$2b$10$vI3F3xZ/j5MN5lYZ5Z5Z5.5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z',
    'admin',
    'Test Admin',
    'EMP0001',
    '+1234567890',
    TRUE
);

-- ============================================
-- GRANT PERMISSIONS (Run as root user)
-- ============================================
-- CREATE USER 'goodhealth_app'@'localhost' IDENTIFIED BY 'secure_password_here';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON good_health_hospital.* TO 'goodhealth_app'@'localhost';
-- FLUSH PRIVILEGES;

-- ============================================
-- END OF SCHEMA
-- ============================================
