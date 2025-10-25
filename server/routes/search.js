import express from 'express';
import { query } from '../config/database.js';
import { verifyStaffToken } from '../middleware/auth.js';

const router = express.Router();

// Apply staff authentication
router.use(verifyStaffToken);

/**
 * GET /api/search/patients
 * Search for patients only (used in emergency patient dialog)
 */
router.get('/patients', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        results: []
      });
    }

    const searchPattern = `%${q.trim()}%`;

    // Search patients
    const patients = await query(
      `SELECT
        user_id,
        patient_id,
        full_name,
        email,
        phone
       FROM users
       WHERE role = 'patient'
       AND patient_id IS NOT NULL
       AND (
         full_name LIKE ? OR
         patient_id LIKE ? OR
         email LIKE ? OR
         phone LIKE ?
       )
       ORDER BY full_name ASC
       LIMIT 20`,
      [searchPattern, searchPattern, searchPattern, searchPattern]
    );

    res.json({
      success: true,
      results: patients
    });

  } catch (error) {
    console.error('Patient search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching patients',
      error: error.message
    });
  }
});

/**
 * GET /api/search/global
 * Global search for patients and doctors
 */
router.get('/global', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: {
          patients: [],
          doctors: []
        }
      });
    }

    const searchPattern = `%${q.trim()}%`;

    // Search patients
    const patients = await query(
      `SELECT
        user_id,
        patient_id,
        full_name,
        email,
        phone,
        'patient' as type
       FROM users
       WHERE role = 'patient'
       AND (
         full_name LIKE ? OR
         patient_id LIKE ? OR
         email LIKE ?
       )
       LIMIT 10`,
      [searchPattern, searchPattern, searchPattern]
    );

    // Search doctors
    const doctors = await query(
      `SELECT
        u.user_id,
        u.staff_id,
        u.full_name,
        u.email,
        u.phone,
        GROUP_CONCAT(DISTINCT d.name SEPARATOR ', ') as departments,
        'doctor' as type
       FROM users u
       LEFT JOIN Doctor_Departments dd ON u.user_id = dd.doctor_id
       LEFT JOIN Departments d ON dd.department_id = d.department_id
       WHERE u.role = 'doctor'
       AND (
         u.full_name LIKE ? OR
         u.staff_id LIKE ? OR
         u.email LIKE ?
       )
       GROUP BY u.user_id
       LIMIT 10`,
      [searchPattern, searchPattern, searchPattern]
    );

    res.json({
      success: true,
      data: {
        patients,
        doctors
      }
    });

  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing search',
      error: error.message
    });
  }
});

export default router;
