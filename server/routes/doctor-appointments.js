import express from 'express';
import { verifyStaffToken } from '../middleware/auth.js';
import { query, run } from '../config/database.js';

const router = express.Router();

/**
 * GET /api/doctor/appointments
 * Get all appointments for the logged-in doctor
 */
router.get('/appointments', verifyStaffToken, async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];

    // Get today's appointments for this doctor
    const appointments = await query(`
      SELECT
        a.appointment_id,
        a.patient_id,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.reason,
        a.notes,
        a.queue_number,
        u.full_name as patient_name,
        u.patient_id as hospital_id,
        u.phone,
        u.email,
        u.date_of_birth,
        u.gender
      FROM appointments a
      INNER JOIN users u ON a.patient_id = u.user_id
      WHERE a.doctor_id = ?
        AND a.appointment_date >= ?
      ORDER BY a.appointment_date ASC, a.queue_number ASC, a.appointment_time ASC
    `, [doctorId, today]);

    res.status(200).json({
      success: true,
      data: appointments.map(apt => ({
        id: apt.appointment_id.toString(),
        name: apt.patient_name,
        hospitalId: apt.hospital_id,
        symptoms: apt.reason || 'No symptoms provided',
        queueNumber: apt.queue_number || 0,
        appointmentTime: apt.appointment_time,
        status: apt.status,
        phone: apt.phone,
        email: apt.email,
        medicalHistory: '',
        appointmentId: apt.appointment_id.toString(),
        patientUserId: apt.patient_id
      }))
    });

  } catch (error) {
    console.error('Get doctor appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments',
      error: error.message
    });
  }
});

/**
 * PATCH /api/doctor/appointments/:id/status
 * Update appointment status
 */
router.patch('/appointments/:id/status', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const doctorId = req.user.userId;

    // Verify this appointment belongs to the doctor
    const appointment = await query(
      'SELECT * FROM appointments WHERE appointment_id = ? AND doctor_id = ?',
      [id, doctorId]
    );

    if (appointment.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or not authorized'
      });
    }

    // Update status
    await run(
      `UPDATE appointments
       SET status = ?, updated_at = datetime('now')
       WHERE appointment_id = ?`,
      [status, id]
    );

    res.status(200).json({
      success: true,
      message: 'Appointment status updated'
    });

  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating appointment',
      error: error.message
    });
  }
});

/**
 * GET /api/doctor/stats
 * Get doctor statistics for today
 */
router.get('/stats', verifyStaffToken, async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];

    const stats = await query(`
      SELECT
        COUNT(*) as total_patients,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'no-show' THEN 1 ELSE 0 END) as no_show
      FROM appointments
      WHERE doctor_id = ? AND appointment_date = ?
    `, [doctorId, today]);

    res.status(200).json({
      success: true,
      data: stats[0] || {
        total_patients: 0,
        waiting: 0,
        completed: 0,
        no_show: 0
      }
    });

  } catch (error) {
    console.error('Get doctor stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

export default router;
