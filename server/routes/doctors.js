import express from 'express';
import bcrypt from 'bcryptjs';
import { query, run } from '../config/database.js';
import { verifyStaffToken } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Apply staff authentication to all doctor routes
router.use(verifyStaffToken);

/**
 * GET /api/doctors
 * Get all doctors
 */
router.get('/', async (req, res) => {
  try {
    const doctors = await query(
      `SELECT
        u.user_id,
        u.staff_id,
        u.full_name,
        u.email,
        u.phone,
        u.is_active,
        u.is_online,
        u.last_login,
        u.created_at,
        GROUP_CONCAT(d.name, ', ') as departments,
        (SELECT COUNT(*)
         FROM appointments a
         WHERE a.doctor_id = u.user_id AND date(a.appointment_date) = date('now')) as today_patients,
        (SELECT COUNT(*)
         FROM doctor_schedules ds
         WHERE ds.doctor_id = u.user_id) as total_shifts
       FROM users u
       LEFT JOIN doctor_departments dd ON u.user_id = dd.user_id
       LEFT JOIN departments d ON dd.department_id = d.department_id
       WHERE u.role = 'doctor'
       GROUP BY u.user_id
       ORDER BY u.created_at DESC`
    );

    res.json({
      success: true,
      data: doctors
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching doctors',
      error: error.message
    });
  }
});

/**
 * GET /api/doctors/:id
 * Get doctor details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get doctor basic info
    const doctor = await query(
      `SELECT
        u.*,
        GROUP_CONCAT(d.name, ', ') as departments
       FROM users u
       LEFT JOIN doctor_departments dd ON u.user_id = dd.user_id
       LEFT JOIN departments d ON dd.department_id = d.department_id
       WHERE (u.user_id = ? OR u.staff_id = ?) AND u.role = 'doctor'
       GROUP BY u.user_id`,
      [id, id]
    );

    if (doctor.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Get doctor schedules
    const schedules = await query(
      `SELECT * FROM doctor_schedules
       WHERE doctor_id = ?
       ORDER BY
         CASE day_of_week
           WHEN 'Monday' THEN 1
           WHEN 'Tuesday' THEN 2
           WHEN 'Wednesday' THEN 3
           WHEN 'Thursday' THEN 4
           WHEN 'Friday' THEN 5
           WHEN 'Saturday' THEN 6
           WHEN 'Sunday' THEN 7
         END,
         start_time`,
      [doctor[0].user_id]
    );

    // Get appointments history
    const appointments = await query(
      `SELECT
        a.*,
        p.full_name as patient_name,
        p.patient_id,
        d.name as department_name
       FROM appointments a
       JOIN users p ON a.patient_id = p.user_id
       JOIN doctor_departments dd ON a.doctor_id = dd.user_id
       JOIN departments d ON dd.department_id = d.department_id
       WHERE a.doctor_id = ?
       ORDER BY a.appointment_date DESC, a.appointment_time DESC
       LIMIT 50`,
      [doctor[0].user_id]
    );

    res.json({
      success: true,
      data: {
        doctor: doctor[0],
        schedules,
        appointments
      }
    });
  } catch (error) {
    console.error('Get doctor details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching doctor details',
      error: error.message
    });
  }
});

/**
 * POST /api/doctors
 * Create new doctor account
 */
router.post(
  '/',
  [
    body('email').isEmail().withMessage('Must be a valid email address'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('phone').optional(),
    body('departmentIds').isArray().withMessage('Department IDs must be an array')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    try {
      const { email, password, fullName, phone, departmentIds } = req.body;

      // Check if email already exists
      const existingEmail = await query(
        'SELECT user_id FROM users WHERE email = ?',
        [email]
      );

      if (existingEmail.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'This email address is already registered. Each doctor must have a unique email.'
        });
      }

      // Check if name already exists (case-insensitive)
      const existingName = await query(
        'SELECT user_id FROM users WHERE LOWER(full_name) = LOWER(?) AND role = ?',
        [fullName, 'doctor']
      );

      if (existingName.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'A doctor with this name already exists. Each doctor must have a unique name.'
        });
      }

      // Generate next staff_id
      const lastStaff = await query(
        `SELECT staff_id FROM users
         WHERE role IN ('doctor', 'admin', 'superadmin')
           AND staff_id IS NOT NULL
         ORDER BY CAST(SUBSTR(staff_id, 4) AS INTEGER) DESC
         LIMIT 1`
      );

      let nextStaffId = 'EMP0001';
      if (lastStaff.length > 0 && lastStaff[0].staff_id) {
        const lastNumber = parseInt(lastStaff[0].staff_id.substring(3));
        const nextNumber = lastNumber + 1;
        nextStaffId = `EMP${String(nextNumber).padStart(4, '0')}`;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Insert doctor with generated staff_id
      const result = await run(
        `INSERT INTO users (email, password_hash, role, full_name, phone, staff_id, is_active)
         VALUES (?, ?, 'doctor', ?, ?, ?, 1)`,
        [email, passwordHash, fullName, phone || null, nextStaffId]
      );

      const doctorId = result.lastID;

      // Get the newly created doctor
      const newDoctor = await query(
        'SELECT user_id, staff_id, email, full_name FROM users WHERE user_id = ?',
        [doctorId]
      );

      // Assign to departments
      if (departmentIds && departmentIds.length > 0) {
        for (const deptId of departmentIds) {
          await run(
            'INSERT INTO doctor_departments (user_id, department_id) VALUES (?, ?)',
            [doctorId, deptId]
          );
        }
      }

      res.status(201).json({
        success: true,
        message: 'Doctor account created successfully',
        data: {
          userId: newDoctor[0].user_id,
          staffId: newDoctor[0].staff_id,
          email: newDoctor[0].email,
          fullName: newDoctor[0].full_name
        }
      });
    } catch (error) {
      console.error('Create doctor error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating doctor account',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/doctors/:id/schedules
 * Add doctor schedule/shift
 */
router.post('/:id/schedules', async (req, res) => {
  try {
    const { id } = req.params;
    const { dayOfWeek, startTime, endTime } = req.body;

    if (!dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Day of week, start time, and end time are required'
      });
    }

    // Verify doctor exists
    const doctor = await query(
      'SELECT * FROM users WHERE (user_id = ? OR staff_id = ?) AND role = ?',
      [id, id, 'doctor']
    );

    if (doctor.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Check if schedule already exists for this day and time
    const existing = await query(
      `SELECT * FROM doctor_schedules
       WHERE doctor_id = ? AND day_of_week = ? AND start_time = ?`,
      [doctor[0].user_id, dayOfWeek, startTime]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Schedule already exists for this day and time'
      });
    }

    // Insert schedule
    await run(
      `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, is_available)
       VALUES (?, ?, ?, ?, 1)`,
      [doctor[0].user_id, dayOfWeek, startTime, endTime]
    );

    res.status(201).json({
      success: true,
      message: 'Schedule added successfully'
    });
  } catch (error) {
    console.error('Add schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding schedule',
      error: error.message
    });
  }
});

/**
 * DELETE /api/doctors/:id/schedules/:scheduleId
 * Remove doctor schedule
 */
router.delete('/:id/schedules/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;

    await run(
      'DELETE FROM doctor_schedules WHERE schedule_id = ?',
      [scheduleId]
    );

    res.json({
      success: true,
      message: 'Schedule removed successfully'
    });
  } catch (error) {
    console.error('Remove schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing schedule',
      error: error.message
    });
  }
});

/**
 * GET /api/doctors/search
 * Search doctors
 */
router.get('/search/query', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchPattern = `%${q}%`;

    const doctors = await query(
      `SELECT
        u.user_id,
        u.staff_id,
        u.full_name,
        u.email,
        u.phone,
        u.is_active,
        GROUP_CONCAT(DISTINCT d.name SEPARATOR ', ') as departments
       FROM users u
       LEFT JOIN Doctor_Departments dd ON u.user_id = dd.doctor_id
       LEFT JOIN Departments d ON dd.department_id = d.department_id
       WHERE u.role = 'doctor'
       AND (
         u.full_name LIKE ? OR
         u.staff_id LIKE ? OR
         u.email LIKE ? OR
         d.name LIKE ?
       )
       GROUP BY u.user_id
       ORDER BY u.full_name`,
      [searchPattern, searchPattern, searchPattern, searchPattern]
    );

    res.json({
      success: true,
      data: doctors
    });
  } catch (error) {
    console.error('Search doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching doctors',
      error: error.message
    });
  }
});

/**
 * GET /api/doctors/departments
 * Get all departments for doctor assignment
 */
router.get('/departments/list', async (req, res) => {
  try {
    const departments = await query(
      'SELECT department_id, name, description FROM departments WHERE is_active = 1 ORDER BY name'
    );

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching departments',
      error: error.message
    });
  }
});

/**
 * GET /api/doctors/recent
 * Get recently created doctor accounts
 */
router.get('/recent/activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const recentDoctors = await query(
      `SELECT
        u.user_id,
        u.staff_id,
        u.full_name,
        u.email,
        u.created_at,
        GROUP_CONCAT(DISTINCT d.name SEPARATOR ', ') as departments
       FROM users u
       LEFT JOIN Doctor_Departments dd ON u.user_id = dd.doctor_id
       LEFT JOIN Departments d ON dd.department_id = d.department_id
       WHERE u.role = 'doctor'
       GROUP BY u.user_id
       ORDER BY u.created_at DESC
       LIMIT ?`,
      [limit]
    );

    res.json({
      success: true,
      data: recentDoctors
    });
  } catch (error) {
    console.error('Get recent doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent doctors',
      error: error.message
    });
  }
});

/**
 * DELETE /api/doctors/:id
 * Permanently delete a doctor and all related records
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if doctor exists
    const doctor = await query(
      'SELECT user_id, full_name, role FROM users WHERE user_id = ? AND role = ?',
      [id, 'doctor']
    );

    if (doctor.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Delete all related records first (foreign key constraints)
    // Using try-catch for each deletion in case tables don't exist

    // 1. Delete doctor schedules (if table exists)
    try {
      await run('DELETE FROM doctor_schedules WHERE doctor_id = ?', [id]);
    } catch (err) {
      console.log('Note: doctor_schedules table does not exist or is empty');
    }

    // 2. Delete doctor-department associations
    try {
      await run('DELETE FROM doctor_departments WHERE user_id = ?', [id]);
    } catch (err) {
      console.log('Note: Could not delete from doctor_departments');
    }

    // 3. Delete any messages sent by the doctor
    try {
      await run('DELETE FROM messages WHERE sender_id = ? AND sender_role = ?', [id, 'doctor']);
    } catch (err) {
      console.log('Note: messages table does not exist or is empty');
    }

    // 4. Update appointments - set doctor_id to NULL instead of deleting
    try {
      await run('UPDATE appointments SET doctor_id = NULL WHERE doctor_id = ?', [id]);
    } catch (err) {
      console.log('Note: Could not update appointments');
    }

    // 5. Update queue entries - set doctor_id to NULL
    try {
      await run('UPDATE queue SET doctor_id = NULL WHERE doctor_id = ?', [id]);
    } catch (err) {
      console.log('Note: queue table does not exist');
    }

    // 6. Finally, delete the doctor's user account
    await run('DELETE FROM users WHERE user_id = ?', [id]);

    res.json({
      success: true,
      message: `Doctor ${doctor[0].full_name} has been permanently removed from the system`
    });
  } catch (error) {
    console.error('Delete doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting doctor',
      error: error.message
    });
  }
});

export default router;
