import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

/**
 * GET /api/departments
 * Get all active departments
 * Public endpoint - no authentication required
 */
router.get('/', async (req, res) => {
  try {
    const departments = await query(
      `SELECT
        department_id,
        name,
        description
       FROM departments
       WHERE is_active = 1
       ORDER BY name ASC`
    );

    res.status(200).json({
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
 * GET /api/departments/:id/doctors
 * Get all active doctors in a specific department
 * Public endpoint - for appointment booking
 */
router.get('/:id/doctors', async (req, res) => {
  try {
    const { id } = req.params;

    const doctors = await query(
      `SELECT
        u.user_id,
        u.full_name,
        u.email,
        u.staff_id,
        d.name as department_name
       FROM users u
       JOIN doctor_departments dd ON u.user_id = dd.user_id
       JOIN departments d ON dd.department_id = d.department_id
       WHERE dd.department_id = ?
       AND u.role = 'doctor'
       AND u.is_active = 1
       ORDER BY u.full_name ASC`,
      [id]
    );

    res.status(200).json({
      success: true,
      data: doctors
    });
  } catch (error) {
    console.error('Get department doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching doctors',
      error: error.message
    });
  }
});

export default router;
