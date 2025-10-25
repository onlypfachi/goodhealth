# Good Health Hospital - Database Documentation

## Overview
This MySQL database schema supports a complete hospital booking management system with role-based access control, queue management, and comprehensive auditing.

## Database Features

### ✅ Security Features
- **Password Complexity**: Enforced at application layer (8+ chars, 2 of: uppercase/numbers/symbols)
- **ID Format Validation**:
  - Patient IDs: `P12345` (P + 5 digits)
  - Staff IDs: `EMP1234` (EMP + 4 digits)
- **Audit Logging**: All critical actions logged
- **Role-Based Access**: patient, doctor, admin, superadmin

### ✅ Core Tables
1. **Users** - All system users with role-based differentiation
2. **Departments** - Hospital departments
3. **Appointments** - Patient appointment bookings
4. **Queue_Management** - Daily queue system
5. **Medical_Records** - Patient medical history
6. **Doctor_Schedules** - Doctor availability
7. **Notifications** - User notifications
8. **Audit_Logs** - Security and action tracking
9. **Messages** - Internal messaging

### ✅ Automated Features
- **Auto-generate IDs**: Triggers automatically create patient_id/staff_id
- **Queue Numbers**: Auto-assigned based on department and date
- **Audit Trails**: Automatic logging of user creation and appointments
- **Indexes**: Optimized for common queries

## Installation

### Step 1: Install MySQL
```bash
# Download MySQL from: https://dev.mysql.com/downloads/
# Or use XAMPP/WAMP which includes MySQL
```

### Step 2: Create Database
```bash
# Login to MySQL
mysql -u root -p

# Run the schema file
source "c:/Users/DENIS/Documents/good health/server/database/schema.sql"

# Or import using command line
mysql -u root -p < "c:/Users/DENIS/Documents/good health/server/database/schema.sql"
```

### Step 3: Create Application User (Optional but Recommended)
```sql
CREATE USER 'goodhealth_app'@'localhost' IDENTIFIED BY 'SecurePassword123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON good_health_hospital.* TO 'goodhealth_app'@'localhost';
FLUSH PRIVILEGES;
```

### Step 4: Update Backend Configuration
Update your `.env` file in the server directory:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=good_health_hospital
DB_USER=goodhealth_app
DB_PASSWORD=SecurePassword123!
```

## Database Structure

### Users Table
```sql
- user_id (PK)
- email (UNIQUE)
- password_hash
- role (patient/doctor/admin/superadmin)
- patient_id (for patients only: P12345)
- staff_id (for staff only: EMP1234)
- created_by (FK to Users)
```

### Appointments Table
```sql
- appointment_id (PK)
- patient_id (FK)
- doctor_id (FK)
- department_id (FK)
- symptoms_description
- status (pending/confirmed/completed/cancelled)
- queue_number
- appointment_date
```

### Queue_Management Table
```sql
- queue_id (PK)
- appointment_id (FK, UNIQUE)
- queue_number
- queue_date
- status (waiting/called/in_consultation/completed)
```

## Stored Procedures

### generate_patient_id()
Generates next available patient ID in format P12345
```sql
CALL generate_patient_id(@next_id);
SELECT @next_id;
```

### generate_staff_id()
Generates next available staff ID in format EMP1234
```sql
CALL generate_staff_id(@next_id);
SELECT @next_id;
```

### get_next_queue_number()
Gets next queue number for department on specific date
```sql
CALL get_next_queue_number(1, '2025-01-10', @next_queue);
SELECT @next_queue;
```

## Views

### v_active_patients
Lists all active patients
```sql
SELECT * FROM v_active_patients;
```

### v_doctors
Lists all doctors with their departments
```sql
SELECT * FROM v_doctors;
```

### v_todays_appointments
Shows today's appointments
```sql
SELECT * FROM v_todays_appointments;
```

### v_queue_status
Current queue status by department
```sql
SELECT * FROM v_queue_status;
```

## Triggers

### auto_generate_ids
Automatically generates patient_id or staff_id on user insert

### auto_create_queue
Creates queue entry when appointment is booked

### log_user_creation
Logs all user creations to audit table

### log_appointment_creation
Logs all appointment creations

## Initial Data

### Departments (Pre-populated)
- General Practice
- Internal Medicine
- Pediatrics
- Gynecology & Obstetrics
- Surgery
- Cardiology
- Orthopedics
- Neurology
- Dermatology
- Ophthalmology
- ENT
- Emergency
- Laboratory
- Radiology
- Pharmacy

### Super Admin Account
- **Email**: superadmin@goodhealth.com
- **Staff ID**: EMP0001
- **Password**: Must be set during first login

## ID Format Rules

### Patient IDs
- Format: `P` + 5 digits
- Example: `P00001`, `P00234`, `P12345`
- Auto-generated sequentially
- Enforced by CHECK constraint

### Staff IDs
- Format: `EMP` + 4 digits
- Example: `EMP0001`, `EMP0234`, `EMP9999`
- Auto-generated sequentially
- Enforced by CHECK constraint

## Password Requirements
**Enforced at Application Layer**:
- Minimum 8 characters
- Must include at least 2 of:
  - Uppercase letters (A-Z)
  - Numbers (0-9)
  - Special symbols (!@#$%^&*)

## User Roles & Permissions

### Patient
- Can: Book appointments, view own records, update profile
- Cannot: Create other users, access admin functions

### Doctor
- Can: View assigned patients, manage queue, update medical records
- Cannot: Create users (except patients via registration)

### Admin
- Can: Create doctor/admin accounts, manage departments, view all data
- Cannot: Create super admin

### Super Admin
- Can: Everything including creating other admins
- Full system access

## Common Queries

### Create a new patient (auto-generates ID)
```sql
INSERT INTO Users (email, password_hash, role, full_name, phone)
VALUES ('patient@example.com', 'hashed_password', 'patient', 'John Doe', '+1234567890');
```

### Create a new doctor
```sql
INSERT INTO Users (email, password_hash, role, full_name, created_by)
VALUES ('doctor@example.com', 'hashed_password', 'doctor', 'Dr. Smith', 1);
```

### Book an appointment
```sql
INSERT INTO Appointments (patient_id, department_id, symptoms_description, appointment_date)
VALUES (2, 1, 'Fever and cough', '2025-01-10');
```

### Check today's queue
```sql
SELECT * FROM v_queue_status WHERE queue_date = CURDATE();
```

## Backup & Maintenance

### Backup Database
```bash
mysqldump -u root -p good_health_hospital > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
mysql -u root -p good_health_hospital < backup_20250104.sql
```

### Clean old audit logs (older than 90 days)
```sql
DELETE FROM Audit_Logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

## Indexes for Performance
All critical columns are indexed:
- User email, role, patient_id, staff_id
- Appointment patient_id, doctor_id, date, status
- Queue date, department, status
- Audit logs timestamp, action

## Support
For database issues or questions, refer to the main project documentation.
