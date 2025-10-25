import express from 'express';
import { query, run } from '../config/database.js';
import { verifyStaffToken, verifyPatientToken } from '../middleware/auth.js';
import { getTodayZimbabwe } from '../utils/timezone.js';

const router = express.Router();

/**
 * Helper function to send notification to patient
 */
async function sendNotification(userId, userType, title, message, type, appointmentId = null) {
  try {
    await run(
      `INSERT INTO notifications (user_id, user_type, title, message, type, appointment_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, userType, title, message, type, appointmentId]
    );
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

/**
 * Helper function to check if patient needs position notification
 */
async function checkAndSendPositionNotification(appointmentId, newPosition) {
  try {
    const appointment = await query(
      `SELECT a.*, u.user_id, u.full_name
       FROM appointments a
       JOIN users u ON a.patient_id = u.user_id
       WHERE a.appointment_id = ?`,
      [appointmentId]
    );

    if (appointment.length === 0) return;

    const apt = appointment[0];

    // If patient is now at position 2, send notification
    if (newPosition === 2) {
      await sendNotification(
        apt.user_id,
        'patient',
        'Queue Update',
        'You are now 2nd in the queue! Your appointment will be called soon.',
        'queue_position',
        appointmentId
      );
    }
  } catch (error) {
    console.error('Error checking position notification:', error);
  }
}

/**
 * POST /api/queue/call
 * Doctor calls a patient for their appointment
 */
router.post('/call', verifyStaffToken, async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID is required'
      });
    }

    // Get appointment details
    const appointments = await query(
      `SELECT a.*, u.user_id, u.full_name
       FROM appointments a
       JOIN users u ON a.patient_id = u.user_id
       WHERE a.appointment_id = ?`,
      [appointmentId]
    );

    if (appointments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const appointment = appointments[0];

    // Update appointment status to 'called'
    await run(
      `UPDATE appointments
       SET status = 'called', updated_at = datetime('now')
       WHERE appointment_id = ?`,
      [appointmentId]
    );

    // Send notification to patient
    await sendNotification(
      appointment.user_id,
      'patient',
      'Your Appointment is Ready',
      "It's now time for your scheduled appointment. Please proceed to the consultation room.",
      'appointment_call',
      appointmentId
    );

    res.json({
      success: true,
      message: 'Patient called successfully'
    });
  } catch (error) {
    console.error('Call patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calling patient'
    });
  }
});

/**
 * POST /api/queue/start
 * Doctor starts a consultation session (25 minutes)
 */
router.post('/start', verifyStaffToken, async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID is required'
      });
    }

    // Update appointment status to 'in-progress' with session start time
    const sessionEndTime = new Date(Date.now() + 25 * 60 * 1000); // 25 minutes from now

    await run(
      `UPDATE appointments
       SET status = 'in-progress',
           session_start = datetime('now'),
           session_end = ?,
           updated_at = datetime('now')
       WHERE appointment_id = ?`,
      [sessionEndTime.toISOString(), appointmentId]
    );

    res.json({
      success: true,
      message: 'Consultation session started',
      sessionEndTime: sessionEndTime.toISOString()
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting session'
    });
  }
});

/**
 * POST /api/queue/skip
 * Doctor skips a patient, moving them down in the queue
 */
router.post('/skip', verifyStaffToken, async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID is required'
      });
    }

    // Get current appointment details
    const currentApt = await query(
      `SELECT * FROM appointments WHERE appointment_id = ?`,
      [appointmentId]
    );

    if (currentApt.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const current = currentApt[0];
    const currentQueue = current.queue_number;
    const currentDate = current.appointment_date;
    const doctorId = current.doctor_id;

    // Get next patient in queue (position after current)
    const nextApt = await query(
      `SELECT * FROM appointments
       WHERE doctor_id = ? AND appointment_date = ? AND queue_number = ?
         AND status NOT IN ('cancelled', 'completed', 'no-show')
       LIMIT 1`,
      [doctorId, currentDate, currentQueue + 1]
    );

    if (nextApt.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No next patient in queue to swap with'
      });
    }

    const next = nextApt[0];

    // Swap queue positions
    await run(
      `UPDATE appointments SET queue_number = ? WHERE appointment_id = ?`,
      [next.queue_number, current.appointment_id]
    );

    await run(
      `UPDATE appointments SET queue_number = ? WHERE appointment_id = ?`,
      [currentQueue, next.appointment_id]
    );

    // Check and send position notifications
    await checkAndSendPositionNotification(next.appointment_id, currentQueue);
    await checkAndSendPositionNotification(current.appointment_id, next.queue_number);

    res.json({
      success: true,
      message: 'Queue positions swapped successfully'
    });
  } catch (error) {
    console.error('Skip patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Error skipping patient'
    });
  }
});

/**
 * POST /api/queue/no-show
 * Mark patient as no-show and reschedule automatically
 */
router.post('/no-show', verifyStaffToken, async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID is required'
      });
    }

    // Get appointment details
    const appointments = await query(
      `SELECT a.*, u.user_id, u.full_name
       FROM appointments a
       JOIN users u ON a.patient_id = u.user_id
       WHERE a.appointment_id = ?`,
      [appointmentId]
    );

    if (appointments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const appointment = appointments[0];

    // Mark as no-show
    await run(
      `UPDATE appointments
       SET status = 'no-show', updated_at = datetime('now')
       WHERE appointment_id = ?`,
      [appointmentId]
    );

    // Calculate next available weekday
    let nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 1);

    // Skip weekends
    while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    const newAppointmentDate = nextDate.toISOString().split('T')[0];

    // Get next queue number for that day
    const queueResult = await query(
      `SELECT COALESCE(MAX(queue_number), 0) + 1 as next_queue
       FROM appointments
       WHERE doctor_id = ? AND appointment_date = ?
         AND status NOT IN ('cancelled', 'no-show')`,
      [appointment.doctor_id, newAppointmentDate]
    );

    const nextQueueNumber = queueResult[0].next_queue;

    // Calculate time slot (8am start, 25 min slots)
    const startHour = 8;
    const slotDuration = 25;
    const totalMinutes = (nextQueueNumber - 1) * slotDuration;
    const hours = startHour + Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const appointmentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    // Create new appointment
    await run(
      `INSERT INTO appointments
       (patient_id, doctor_id, department_id, appointment_date, appointment_time, queue_number, reason, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
      [
        appointment.patient_id,
        appointment.doctor_id,
        appointment.department_id,
        newAppointmentDate,
        appointmentTime,
        nextQueueNumber,
        appointment.reason || 'Rescheduled from no-show',
        `Rescheduled from ${appointment.appointment_date} due to absence`
      ]
    );

    // Send notification to patient
    await sendNotification(
      appointment.user_id,
      'patient',
      'Appointment Rescheduled',
      `Due to your absence, your appointment has been automatically rescheduled to ${newAppointmentDate} at ${appointmentTime}. You are #${nextQueueNumber} in the queue.`,
      'appointment_rescheduled',
      appointmentId
    );

    res.json({
      success: true,
      message: 'Patient marked as no-show and rescheduled',
      newAppointment: {
        date: newAppointmentDate,
        time: appointmentTime,
        queueNumber: nextQueueNumber
      }
    });
  } catch (error) {
    console.error('No-show error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing no-show'
    });
  }
});

/**
 * GET /api/queue/patient/:patientId
 * Get patient's current queue position and appointment details
 */
router.get('/patient/:patientId', verifyPatientToken, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Get patient's upcoming appointments with queue info
    const appointments = await query(
      `SELECT
        a.*,
        u.full_name as doctor_name,
        d.name as department_name
       FROM appointments a
       JOIN users u ON a.doctor_id = u.user_id
       JOIN departments d ON a.department_id = d.department_id
       WHERE a.patient_id = (SELECT user_id FROM users WHERE patient_id = ? OR user_id = ?)
         AND a.status IN ('scheduled', 'called', 'in-progress')
         AND a.appointment_date >= date('now')
       ORDER BY a.appointment_date ASC, a.queue_number ASC`,
      [patientId, patientId]
    );

    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Get patient queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient queue'
    });
  }
});

/**
 * GET /api/queue/notifications/:userId
 * Get unread notifications for a user
 */
router.get('/notifications/:userId', verifyPatientToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await query(
      `SELECT * FROM notifications
       WHERE user_id = ? AND is_read = 0
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
});

/**
 * PATCH /api/queue/notifications/:notificationId/read
 * Mark notification as read
 */
router.patch('/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;

    await run(
      `UPDATE notifications SET is_read = 1 WHERE notification_id = ?`,
      [notificationId]
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read'
    });
  }
});

/**
 * GET /api/queue-mgmt/doctor/today-schedule
 * Get today's appointments for the logged-in doctor ONLY
 */
router.get('/doctor/today-schedule', verifyStaffToken, async (req, res) => {
  try {
    const doctorId = req.user.userId;

    console.log('='.repeat(60));
    console.log('📋 FETCHING DOCTOR SCHEDULE');
    console.log('='.repeat(60));
    console.log('Doctor ID:', doctorId);

    // Get today's date in Zimbabwe timezone (CAT = UTC+2)
    const today = getTodayZimbabwe();
    console.log('Today (Zimbabwe Time):', today);

    // ✅ FIX: Get appointments for THIS DOCTOR for today AND future dates
    // (Shows today's appointments, or if empty, shows upcoming appointments)
    const appointments = await query(
      `SELECT
        a.appointment_id,
        a.appointment_date,
        a.appointment_time,
        a.queue_number,
        a.status,
        a.session_start,
        a.session_end,
        u.user_id as patient_user_id,
        u.full_name as patient_name,
        u.email as patient_email,
        u.phone as patient_phone,
        u.patient_id,
        d.name as department_name,
        a.reason as symptoms
       FROM appointments a
       JOIN users u ON a.patient_id = u.user_id
       LEFT JOIN doctor_departments dd ON a.doctor_id = dd.user_id
       LEFT JOIN departments d ON dd.department_id = d.department_id
       WHERE a.doctor_id = ?
       AND DATE(a.appointment_date) >= ?
       AND a.status != 'cancelled'
       ORDER BY a.appointment_date ASC, a.queue_number ASC
       LIMIT 50`,
      [doctorId, today]
    );

    console.log(`Found ${appointments.length} appointments for doctor ${doctorId}`);
    if (appointments.length > 0) {
      console.log('Appointments:', appointments.map(a => ({
        id: a.appointment_id,
        patient: a.patient_name,
        queue: a.queue_number,
        time: a.appointment_time
      })));
    }
    console.log('='.repeat(60));

    res.json({
      success: true,
      data: {
        appointments,
        date: today
      }
    });
  } catch (error) {
    console.error('='.repeat(60));
    console.error('❌ GET TODAY SCHEDULE ERROR');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('='.repeat(60));

    res.status(500).json({
      success: false,
      message: 'Error fetching today\'s schedule',
      error: error.message
    });
  }
});

/**
 * GET /api/queue-mgmt/doctor/schedule?date=YYYY-MM-DD
 * Get appointments for specific date for the logged-in doctor
 */
router.get('/doctor/schedule', verifyStaffToken, async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const requestedDate = req.query.date;

    if (!requestedDate) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required (format: YYYY-MM-DD)'
      });
    }

    console.log('='.repeat(60));
    console.log('📋 FETCHING DOCTOR SCHEDULE FOR SPECIFIC DATE');
    console.log('='.repeat(60));
    console.log('Doctor ID:', doctorId);
    console.log('Requested Date:', requestedDate);

    // Get appointments for THIS DOCTOR for the specific date
    const appointments = await query(
      `SELECT
        a.appointment_id,
        a.appointment_date,
        a.appointment_time,
        a.queue_number,
        a.status,
        a.session_start,
        a.session_end,
        u.user_id as patient_user_id,
        u.full_name as patient_name,
        u.email as patient_email,
        u.phone as patient_phone,
        u.patient_id,
        d.name as department_name,
        a.reason as symptoms
       FROM appointments a
       JOIN users u ON a.patient_id = u.user_id
       LEFT JOIN doctor_departments dd ON a.doctor_id = dd.user_id
       LEFT JOIN departments d ON dd.department_id = d.department_id
       WHERE a.doctor_id = ?
       AND DATE(a.appointment_date) = ?
       AND a.status != 'cancelled'
       ORDER BY a.queue_number ASC`,
      [doctorId, requestedDate]
    );

    console.log(`Found ${appointments.length} appointments for doctor ${doctorId} on ${requestedDate}`);
    if (appointments.length > 0) {
      console.log('Appointments:', appointments.map(a => ({
        id: a.appointment_id,
        patient: a.patient_name,
        queue: a.queue_number,
        time: a.appointment_time
      })));
    }
    console.log('='.repeat(60));

    res.json({
      success: true,
      data: {
        appointments,
        date: requestedDate
      }
    });
  } catch (error) {
    console.error('='.repeat(60));
    console.error('❌ GET SCHEDULE BY DATE ERROR');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('='.repeat(60));

    res.status(500).json({
      success: false,
      message: 'Error fetching schedule for date',
      error: error.message
    });
  }
});

/**
 * POST /api/queue-mgmt/doctor/close-shift
 * Mark all today's appointments as seen and close the shift
 */
router.post('/doctor/close-shift', verifyStaffToken, async (req, res) => {
  try {
    const staffId = req.user.userId;

    // Get doctor's department
    const doctorData = await query(
      `SELECT department_id, full_name FROM staff WHERE staff_id = ?`,
      [staffId]
    );

    if (doctorData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const departmentId = doctorData[0].department_id;
    const doctorName = doctorData[0].full_name;

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Update all pending/scheduled appointments for today to 'completed'
    await run(
      `UPDATE appointments
       SET status = 'completed',
           session_end = datetime('now')
       WHERE department_id = ?
       AND DATE(appointment_date) = ?
       AND status IN ('scheduled', 'pending', 'in-progress')`,
      [departmentId, today]
    );

    // Create a shift closure record (you may want to create a shifts table if it doesn't exist)
    // For now, we'll just return success
    // You could optionally create a shift_closures table to track when doctors close their shifts

    res.json({
      success: true,
      message: 'Shift closed successfully. All appointments marked as seen.',
      data: {
        date: today,
        doctorName,
        departmentId
      }
    });
  } catch (error) {
    console.error('Close shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Error closing shift'
    });
  }
});

export default router;
