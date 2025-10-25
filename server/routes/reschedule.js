import express from 'express';
import { query, run } from '../config/database.js';
import { verifyPatientToken } from '../middleware/auth.js';
import { getTodayZimbabwe } from '../utils/timezone.js';

const router = express.Router();

/**
 * Find next available weekday slot for rescheduling
 * Skips weekends and finds first available day with capacity
 */
async function findNextAvailableSlot(currentAppointmentId, departmentId, doctorId) {
  const today = getTodayZimbabwe();
  const MAX_PATIENTS_PER_DAY = 19; // Maximum capacity per doctor per day
  const MAX_DAYS_TO_CHECK = 30; // Check up to 30 days ahead

  // Get current appointment details
  const currentAppointment = await query(
    'SELECT appointment_date FROM appointments WHERE appointment_id = ?',
    [currentAppointmentId]
  );

  if (currentAppointment.length === 0) {
    throw new Error('Appointment not found');
  }

  const currentDate = new Date(currentAppointment[0].appointment_date);

  console.log('🔍 Finding next available slot...');
  console.log('   Current appointment date:', currentDate.toISOString().split('T')[0]);
  console.log('   Doctor ID:', doctorId);
  console.log('   Department ID:', departmentId);

  // Start checking from the day after current appointment
  let checkDate = new Date(currentDate);
  checkDate.setDate(checkDate.getDate() + 1); // Start from next day

  for (let i = 0; i < MAX_DAYS_TO_CHECK; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const dayOfWeek = checkDate.getDay();

    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log(`   ⏭️  Skipping ${dateStr} (${dayOfWeek === 0 ? 'Sunday' : 'Saturday'})`);
      checkDate.setDate(checkDate.getDate() + 1);
      continue;
    }

    // Check how many appointments this doctor has on this day
    const appointmentCount = await query(
      `SELECT COUNT(*) as count FROM appointments
       WHERE doctor_id = ?
       AND DATE(appointment_date) = ?
       AND status IN ('scheduled', 'called', 'in-progress')
       AND appointment_id != ?`,  // Exclude current appointment
      [doctorId, dateStr, currentAppointmentId]
    );

    const count = appointmentCount[0].count;

    console.log(`   📅 Checking ${dateStr}: ${count}/${MAX_PATIENTS_PER_DAY} appointments`);

    // If this day has capacity, it's available!
    if (count < MAX_PATIENTS_PER_DAY) {
      const queueNumber = count + 1; // Next queue number
      const appointmentTime = calculateAppointmentTime(queueNumber);

      console.log(`   ✅ Found available slot!`);
      console.log(`      Date: ${dateStr}`);
      console.log(`      Queue Number: ${queueNumber}`);
      console.log(`      Time: ${appointmentTime}`);

      return {
        date: dateStr,
        queueNumber: queueNumber,
        time: appointmentTime,
        daysFromNow: i + 1
      };
    }

    // This day is full, try next day
    console.log(`   ⚠️  ${dateStr} is full, trying next day...`);
    checkDate.setDate(checkDate.getDate() + 1);
  }

  // If we get here, no slots found in next 30 days
  throw new Error(`No available slots found in the next ${MAX_DAYS_TO_CHECK} days`);
}

/**
 * Calculate appointment time based on queue number
 * Each patient gets 25 minutes starting from 8:00 AM
 */
function calculateAppointmentTime(queueNumber) {
  const startHour = 8; // 8:00 AM
  const minutesPerPatient = 25;

  const totalMinutes = (queueNumber - 1) * minutesPerPatient;
  const hours = startHour + Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * POST /api/appointments/reschedule
 * Reschedule appointment to next available slot
 */
router.post('/reschedule', verifyPatientToken, async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const patientId = req.user.userId || req.user.user_id;

    console.log('='.repeat(60));
    console.log('📅 RESCHEDULE APPOINTMENT REQUEST');
    console.log('='.repeat(60));
    console.log('Patient ID:', patientId);
    console.log('Appointment ID:', appointmentId);

    // Verify patient owns this appointment
    const appointment = await query(
      `SELECT
        a.*,
        d.full_name as doctor_name,
        dept.name as department_name
       FROM appointments a
       LEFT JOIN users d ON a.doctor_id = d.user_id
       LEFT JOIN doctor_departments dd ON d.user_id = dd.user_id
       LEFT JOIN departments dept ON dd.department_id = dept.department_id
       WHERE a.appointment_id = ? AND a.patient_id = ?`,
      [appointmentId, patientId]
    );

    if (appointment.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or you do not have permission to reschedule it'
      });
    }

    const currentAppointment = appointment[0];

    // Can't reschedule completed or cancelled appointments
    if (['completed', 'cancelled', 'no-show'].includes(currentAppointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot reschedule ${currentAppointment.status} appointment`
      });
    }

    console.log('Current appointment:');
    console.log('   Date:', currentAppointment.appointment_date);
    console.log('   Doctor:', currentAppointment.doctor_name);
    console.log('   Department:', currentAppointment.department_name);
    console.log('   Status:', currentAppointment.status);

    // Find next available slot
    const nextSlot = await findNextAvailableSlot(
      appointmentId,
      currentAppointment.department_id,
      currentAppointment.doctor_id
    );

    console.log('');
    console.log('Rescheduling to:');
    console.log('   Date:', nextSlot.date);
    console.log('   Queue Number:', nextSlot.queueNumber);
    console.log('   Time:', nextSlot.time);
    console.log('   Days from now:', nextSlot.daysFromNow);

    // Update appointment with new slot
    await run(
      `UPDATE appointments
       SET appointment_date = ?,
           appointment_time = ?,
           queue_number = ?,
           updated_at = datetime('now', '+2 hours')
       WHERE appointment_id = ?`,
      [nextSlot.date, nextSlot.time, nextSlot.queueNumber, appointmentId]
    );

    console.log('✅ Appointment rescheduled successfully!');
    console.log('='.repeat(60));

    // Format date for display
    const newDate = new Date(nextSlot.date);
    const formattedDate = newDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: {
        newDate: nextSlot.date,
        formattedDate: formattedDate,
        newTime: nextSlot.time,
        newQueueNumber: nextSlot.queueNumber,
        doctorName: currentAppointment.doctor_name,
        departmentName: currentAppointment.department_name,
        daysFromNow: nextSlot.daysFromNow
      }
    });

  } catch (error) {
    console.error('='.repeat(60));
    console.error('❌ RESCHEDULE ERROR');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('='.repeat(60));

    res.status(500).json({
      success: false,
      message: error.message || 'Error rescheduling appointment',
      error: error.message
    });
  }
});

export default router;
