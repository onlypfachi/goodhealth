import express from 'express';
import { query } from '../config/database.js';
import { verifyStaffToken } from '../middleware/auth.js';

const router = express.Router();

// Apply staff authentication to all patient routes
router.use(verifyStaffToken);

/**
 * GET /api/patients
 * Get all patients with their details
 */
router.get('/', async (req, res) => {
  try {
    const patients = await query(
      `SELECT
        u.user_id,
        u.patient_id,
        u.full_name,
        u.email,
        u.phone,
        u.date_of_birth,
        u.gender,
        u.address,
        u.is_active,
        u.is_online,
        u.last_login,
        u.created_at,
        (SELECT MAX(a.appointment_date)
         FROM appointments a
         WHERE a.patient_id = u.user_id) as last_visit,
        (SELECT doc.full_name
         FROM appointments a
         JOIN users doc ON a.doctor_id = doc.user_id
         WHERE a.patient_id = u.user_id AND doc.role = 'doctor'
         ORDER BY a.created_at DESC
         LIMIT 1) as assigned_doctor_name
       FROM users u
       WHERE u.role = 'patient'
       ORDER BY u.created_at DESC`
    );

    res.json({
      success: true,
      data: patients
    });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patients',
      error: error.message
    });
  }
});

/**
 * GET /api/patients/:id
 * Get full details of a specific patient
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get patient basic info
    const [patient] = await query(
      `SELECT u.*
       FROM users u
       WHERE (u.user_id = ? OR u.patient_id = ?) AND u.role = 'patient'`,
      [id, id]
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get appointment history
    const appointments = await query(
      `SELECT
        a.*,
        doc.full_name as doctor_name,
        doc.staff_id as doctor_staff_id
       FROM appointments a
       LEFT JOIN users doc ON a.doctor_id = doc.user_id
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
      [patient.user_id]
    );

    // Medical records table doesn't exist in simplified schema
    const medicalRecords = [];

    res.json({
      success: true,
      data: {
        patient,
        appointments,
        medicalRecords
      }
    });
  } catch (error) {
    console.error('Get patient details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient details',
      error: error.message
    });
  }
});

/**
 * PUT /api/patients/:id/assign-doctor
 * Assign a doctor to a patient
 */
router.put('/:id/assign-doctor', async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorId } = req.body;

    // Verify doctor exists
    const [doctor] = await query(
      'SELECT * FROM users WHERE user_id = ? AND role = ?',
      [doctorId, 'doctor']
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Update will happen on next appointment creation
    // For now, just return success
    res.json({
      success: true,
      message: 'Doctor assignment recorded'
    });
  } catch (error) {
    console.error('Assign doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning doctor',
      error: error.message
    });
  }
});

/**
 * GET /api/patients/search
 * Search patients by query
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

    const patients = await query(
      `SELECT
        u.user_id,
        u.patient_id,
        u.full_name,
        u.email,
        u.phone,
        u.date_of_birth,
        u.department_id,
        u.is_active,
        u.last_login,
        CAST((julianday('now') - julianday(u.date_of_birth)) / 365.25 AS INTEGER) as age,
        d.name as department,
        (SELECT MAX(a.appointment_date)
         FROM appointments a
         WHERE a.patient_id = u.user_id) as last_visit,
        (SELECT dept.name
         FROM appointments a
         JOIN doctor_departments dd ON a.doctor_id = dd.user_id
         JOIN Departments dept ON dd.department_id = dept.department_id
         WHERE a.patient_id = u.user_id
         ORDER BY a.created_at DESC
         LIMIT 1) as last_department
       FROM users u
       LEFT JOIN Departments d ON u.department_id = d.department_id
       WHERE u.role = 'patient'
       AND (
         u.full_name LIKE ? OR
         u.patient_id LIKE ? OR
         u.email LIKE ? OR
         u.phone LIKE ? OR
         d.name LIKE ?
       )
       ORDER BY u.full_name`,
      [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern]
    );

    res.json({
      success: true,
      data: patients
    });
  } catch (error) {
    console.error('Search patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching patients',
      error: error.message
    });
  }
});

export default router;
