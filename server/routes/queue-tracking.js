import express from 'express';
import { verifyPatientToken } from '../middleware/auth.js';
import { query } from '../config/database.js';

const router = express.Router();

/**
 * GET /api/queue/my-position
 * Get patient's current queue position and real-time updates
 */
router.get('/my-position', verifyPatientToken, async (req, res) => {
  try {
    const patientId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];

    // Get patient's active appointments for today
    const myAppointments = await query(`
      SELECT
        a.appointment_id,
        a.doctor_id,
        a.appointment_date,
        a.appointment_time,
        a.queue_number,
        a.status,
        u.full_name as doctor_name,
        d.name as department_name
      FROM appointments a
      INNER JOIN users u ON a.doctor_id = u.user_id
      LEFT JOIN doctor_departments dd ON u.user_id = dd.user_id
      LEFT JOIN departments d ON dd.department_id = d.department_id
      WHERE a.patient_id = ?
        AND a.appointment_date = ?
        AND a.status IN ('scheduled', 'in-progress')
      ORDER BY a.appointment_time ASC
      LIMIT 1
    `, [patientId, today]);

    if (myAppointments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active appointment found for today'
      });
    }

    const myAppointment = myAppointments[0];

    // Count how many patients are ahead in the queue for the same doctor
    const patientsAhead = await query(`
      SELECT COUNT(*) as count
      FROM appointments
      WHERE doctor_id = ?
        AND appointment_date = ?
        AND queue_number < ?
        AND status IN ('scheduled', 'in-progress')
    `, [myAppointment.doctor_id, today, myAppointment.queue_number]);

    // Get total patients for this doctor today
    const totalPatients = await query(`
      SELECT COUNT(*) as count
      FROM appointments
      WHERE doctor_id = ?
        AND appointment_date = ?
        AND status IN ('scheduled', 'in-progress', 'completed')
    `, [myAppointment.doctor_id, today]);

    // Calculate estimated wait time (assuming 30 min per patient)
    const estimatedWaitMinutes = patientsAhead[0].count * 30;

    res.status(200).json({
      success: true,
      data: {
        appointmentId: myAppointment.appointment_id,
        queueNumber: myAppointment.queue_number,
        patientsAhead: patientsAhead[0].count,
        totalPatients: totalPatients[0].count,
        myPosition: patientsAhead[0].count + 1,
        estimatedWaitMinutes,
        estimatedWaitTime: formatWaitTime(estimatedWaitMinutes),
        appointmentTime: myAppointment.appointment_time,
        status: myAppointment.status,
        doctor: {
          name: myAppointment.doctor_name,
          department: myAppointment.department_name
        }
      }
    });

  } catch (error) {
    console.error('Get queue position error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching queue position',
      error: error.message
    });
  }
});

/**
 * GET /api/queue/doctor/:doctorId
 * Get current queue for a specific doctor (for real-time updates)
 */
router.get('/doctor/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    const queueList = await query(`
      SELECT
        a.appointment_id,
        a.queue_number,
        a.appointment_time,
        a.status,
        u.full_name as patient_name,
        u.patient_id
      FROM appointments a
      INNER JOIN users u ON a.patient_id = u.user_id
      WHERE a.doctor_id = ?
        AND a.appointment_date = ?
        AND a.status IN ('scheduled', 'in-progress')
      ORDER BY a.queue_number ASC
    `, [doctorId, today]);

    res.status(200).json({
      success: true,
      data: {
        currentQueue: queueList,
        totalInQueue: queueList.length
      }
    });

  } catch (error) {
    console.error('Get doctor queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching doctor queue',
      error: error.message
    });
  }
});

/**
 * Helper function to format wait time
 */
function formatWaitTime(minutes) {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
}

export default router;
