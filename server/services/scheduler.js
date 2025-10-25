import { query, run } from '../config/database.js';

/**
 * Automated Patient Scheduling Service
 * Intelligently assigns patients to doctors based on:
 * - Department specialty
 * - Current workload (patient count)
 * - Queue balancing
 * - Doctor shift capacity (based on admin-set schedules)
 * - Weekday scheduling (weekends auto-adjust to Monday)
 */

/**
 * Adjust date to next weekday if weekend
 * @param {Date} date - Date to check
 * @returns {Date} - Adjusted date (Monday if weekend)
 */
function adjustToWeekday(date) {
  const dayOfWeek = date.getDay();

  // If Saturday (6), add 2 days to get to Monday
  if (dayOfWeek === 6) {
    date.setDate(date.getDate() + 2);
  }
  // If Sunday (0), add 1 day to get to Monday
  else if (dayOfWeek === 0) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}

/**
 * Get doctor's shift capacity for a specific day
 * @param {number} doctorId - Doctor's user ID
 * @param {Date} appointmentDate - Date to check
 * @returns {Object} - {maxPatients, startTime, endTime}
 */
async function getDoctorShiftCapacity(doctorId, appointmentDate) {
  const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });

  try {
    // Get doctor's schedule for this day of week
    const schedule = await query(`
      SELECT start_time, end_time, is_available
      FROM doctor_schedules
      WHERE doctor_id = ?
        AND day_of_week = ?
    `, [doctorId, dayOfWeek]);

    if (schedule.length === 0 || !schedule[0].is_available) {
      // No schedule or not available - return default (8am-4pm = 19 patients with 25min slots)
      return {
        maxPatients: 19,
        startTime: '08:00',
        endTime: '16:00'
      };
    }

    const startTime = schedule[0].start_time;
    const endTime = schedule[0].end_time;

    // Calculate max patients based on shift duration
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const shiftDuration = endMinutes - startMinutes;

    // 25 minutes per patient
    const maxPatients = Math.floor(shiftDuration / 25);

    return {
      maxPatients,
      startTime,
      endTime
    };
  } catch (error) {
    console.error('Error getting doctor shift capacity:', error);
    // Default capacity if error
    return {
      maxPatients: 19,
      startTime: '08:00',
      endTime: '16:00'
    };
  }
}

/**
 * Find best available doctor for a patient with capacity checking
 * @param {number} departmentId - Department ID
 * @param {string} appointmentDate - Desired appointment date (YYYY-MM-DD)
 * @returns {Object} - Best doctor match with details or null if all full
 */
export async function findBestAvailableDoctor(departmentId, appointmentDate) {
  try {
    console.log('\n🔍 Finding Best Available Doctor...');
    console.log('  - Department ID:', departmentId, '(Type:', typeof departmentId + ')');
    console.log('  - Appointment Date:', appointmentDate);

    // Ensure departmentId is a number
    const deptId = typeof departmentId === 'string' ? parseInt(departmentId) : departmentId;
    console.log('  - Converted Department ID:', deptId, '(Type:', typeof deptId + ')');

    // Get all active doctors in the department with their current load
    const doctors = await query(`
      SELECT
        u.user_id,
        u.full_name,
        u.email,
        u.staff_id,
        COUNT(DISTINCT a.appointment_id) as current_patients
      FROM users u
      INNER JOIN doctor_departments dd ON u.user_id = dd.user_id
      LEFT JOIN appointments a ON u.user_id = a.doctor_id
        AND a.appointment_date = ?
        AND a.status NOT IN ('cancelled', 'completed', 'no-show')
      WHERE dd.department_id = ?
        AND u.role = 'doctor'
        AND u.is_active = 1
      GROUP BY u.user_id, u.full_name, u.email, u.staff_id
      ORDER BY current_patients ASC, u.user_id ASC
    `, [appointmentDate, deptId]);

    console.log(`  → Found ${doctors.length} doctors in department`);
    if (doctors.length > 0) {
      console.log('  → Doctors:', doctors.map(d => `${d.full_name} (${d.current_patients} patients)`).join(', '));
    }

    if (doctors.length === 0) {
      console.error('  ✗ ERROR: No doctors found in department');
      throw new Error('No available doctors found for this department');
    }

    // Check each doctor's capacity based on their shift schedule
    const [year, month, day] = appointmentDate.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));

    for (const doctor of doctors) {
      const shiftCapacity = await getDoctorShiftCapacity(doctor.user_id, dateObj);

      // If doctor has space in their shift
      if (doctor.current_patients < shiftCapacity.maxPatients) {
        return {
          doctorId: doctor.user_id,
          doctorName: doctor.full_name,
          doctorEmail: doctor.email,
          staffId: doctor.staff_id,
          currentLoad: doctor.current_patients,
          shiftCapacity: shiftCapacity.maxPatients,
          shiftStart: shiftCapacity.startTime,
          shiftEnd: shiftCapacity.endTime
        };
      }
    }

    // All doctors are at capacity for this date
    return null;

  } catch (error) {
    console.error('Error finding available doctor:', error);
    throw error;
  }
}

/**
 * Calculate next available queue number for a doctor and date
 * @param {number} doctorId
 * @param {Date} appointmentDate
 * @returns {number} - Next queue number
 */
export async function getNextQueueNumber(doctorId, appointmentDate) {
  try {
    const result = await query(`
      SELECT COALESCE(MAX(queue_number), 0) + 1 as next_queue
      FROM appointments
      WHERE doctor_id = ?
        AND appointment_date = ?
    `, [doctorId, appointmentDate]);

    return result[0]?.next_queue || 1;
  } catch (error) {
    console.error('Error getting next queue number:', error);
    return 1;
  }
}

/**
 * Calculate time slot based on queue number
 * @param {number} queueNumber
 * @returns {string} - Time in HH:MM format
 */
function calculateTimeSlot(queueNumber) {
  // Start at 8:00 AM, 25 minutes per patient
  const startHour = 8;
  const slotDuration = 25; // minutes

  const totalMinutes = (queueNumber - 1) * slotDuration;
  const hours = startHour + Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Calculate time slot based on queue number and custom shift start time
 * @param {number} queueNumber - Position in queue
 * @param {string} shiftStartTime - Shift start time in HH:MM format
 * @returns {string} - Time in HH:MM format
 */
function calculateTimeSlotFromShift(queueNumber, shiftStartTime) {
  const slotDuration = 25; // minutes
  const [startHour, startMin] = shiftStartTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const totalMinutes = startMinutes + (queueNumber - 1) * slotDuration;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Schedule appointment with automatic doctor assignment, weekend adjustment, and overflow handling
 * @param {Object} bookingData - Appointment details
 * @returns {Object} - Scheduled appointment details
 */
export async function scheduleAppointment(bookingData) {
  try {
    const {
      patientId,
      departmentId,
      symptomsDescription,
      appointmentDate: requestedDate,
      preferredDoctorId = null
    } = bookingData;

    // Step 1: Adjust date if weekend
    // ✅ FIX: Parse date as UTC to avoid timezone issues
    const [year, month, day] = requestedDate.split('-').map(Number);
    let appointmentDateObj = new Date(Date.UTC(year, month - 1, day));
    const originalDate = appointmentDateObj.toISOString().split('T')[0];
    appointmentDateObj = adjustToWeekday(appointmentDateObj);
    const adjustedDate = appointmentDateObj.toISOString().split('T')[0];

    const wasWeekendAdjusted = originalDate !== adjustedDate;
    let appointmentDate = adjustedDate;

    // Step 2: Try to find available doctor for the requested/adjusted date
    let assignedDoctor;
    let attemptedDates = [appointmentDate];
    let overflowedToNextDay = false;
    let maxAttempts = 7; // Try up to 7 days ahead

    // If patient has preferred doctor, try them first
    if (preferredDoctorId) {
      const doctorCheck = await query(
        `SELECT u.user_id, u.full_name, u.email, u.staff_id
         FROM users u
         INNER JOIN doctor_departments dd ON u.user_id = dd.user_id
         WHERE u.user_id = ? AND dd.department_id = ? AND u.role = 'doctor' AND u.is_active = 1`,
        [preferredDoctorId, departmentId]
      );

      if (doctorCheck.length > 0) {
        // Check if preferred doctor has capacity
        const [year, month, day] = appointmentDate.split('-').map(Number);
        const dateObj = new Date(Date.UTC(year, month - 1, day));
        const capacity = await getDoctorShiftCapacity(preferredDoctorId, dateObj);

        const currentLoad = await query(`
          SELECT COUNT(*) as count
          FROM appointments
          WHERE doctor_id = ? AND appointment_date = ?
            AND status NOT IN ('cancelled', 'no-show', 'completed')
        `, [preferredDoctorId, appointmentDate]);

        if (currentLoad[0].count < capacity.maxPatients) {
          assignedDoctor = {
            doctorId: doctorCheck[0].user_id,
            doctorName: doctorCheck[0].full_name,
            doctorEmail: doctorCheck[0].email,
            staffId: doctorCheck[0].staff_id,
            shiftCapacity: capacity.maxPatients,
            shiftStart: capacity.startTime,
            shiftEnd: capacity.endTime
          };
        }
      }
    }

    // If no preferred doctor or preferred doctor at capacity, find best available
    if (!assignedDoctor) {
      let attempt = 0;
      while (attempt < maxAttempts && !assignedDoctor) {
        // Try to find available doctor for current date
        assignedDoctor = await findBestAvailableDoctor(departmentId, appointmentDate);

        if (!assignedDoctor) {
          // All doctors full for this date, try next weekday
          const [year, month, day] = appointmentDate.split('-').map(Number);
          let nextDate = new Date(Date.UTC(year, month - 1, day));
          nextDate.setUTCDate(nextDate.getUTCDate() + 1);
          nextDate = adjustToWeekday(nextDate); // Skip weekends
          appointmentDate = nextDate.toISOString().split('T')[0];
          attemptedDates.push(appointmentDate);
          overflowedToNextDay = true;
          attempt++;
        } else {
          break;
        }
      }

      if (!assignedDoctor) {
        throw new Error(`All doctors in this department are fully booked for the next ${maxAttempts} weekdays. Please try a later date or contact the hospital.`);
      }
    }

    // Get next queue number for this doctor on the final date
    const queueNumber = await getNextQueueNumber(assignedDoctor.doctorId, appointmentDate);

    // Calculate appointment time slot based on doctor's shift
    const timeSlot = calculateTimeSlotFromShift(queueNumber, assignedDoctor.shiftStart || '08:00');

    // Build notes about adjustments
    let notes = `Queue number: ${queueNumber}`;
    if (wasWeekendAdjusted) {
      notes += ` | [Weekend booking adjusted to Monday]`;
    }
    if (overflowedToNextDay) {
      notes += ` | [Rescheduled from ${originalDate} - doctors were fully booked]`;
    }

    // Create appointment
    const appointmentResult = await run(`
      INSERT INTO appointments (
        patient_id,
        doctor_id,
        appointment_date,
        appointment_time,
        status,
        reason,
        notes,
        queue_number
      ) VALUES (?, ?, ?, ?, 'scheduled', ?, ?, ?)
    `, [
      patientId,
      assignedDoctor.doctorId,
      appointmentDate,
      timeSlot,
      symptomsDescription,
      notes,
      queueNumber
    ]);

    const appointmentId = appointmentResult.lastID;

    return {
      success: true,
      appointmentId,
      queueNumber,
      doctor: {
        id: assignedDoctor.doctorId,
        name: assignedDoctor.doctorName,
        email: assignedDoctor.doctorEmail,
        staffId: assignedDoctor.staffId
      },
      appointmentDate,
      appointmentTime: timeSlot,
      status: 'scheduled'
    };

  } catch (error) {
    console.error('Error scheduling appointment:', error);
    throw error;
  }
}

/**
 * Get available time slots for a doctor on a specific date
 * @param {number} doctorId
 * @param {string} appointmentDate
 * @returns {Array} - Available time slots
 */
export async function getAvailableTimeSlots(doctorId, appointmentDate) {
  try {
    // Get booked appointments
    const bookedSlots = await query(`
      SELECT appointment_time
      FROM appointments
      WHERE doctor_id = ?
        AND appointment_date = ?
        AND status NOT IN ('cancelled', 'no-show')
    `, [doctorId, appointmentDate]);

    const bookedTimes = new Set(bookedSlots.map(slot => slot.appointment_time));

    // Generate all possible slots (30-minute intervals from 9 AM to 5 PM)
    const availableSlots = [];
    let currentHour = 9;
    let currentMinute = 0;

    while (currentHour < 17) {
      const timeSlot = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

      if (!bookedTimes.has(timeSlot)) {
        availableSlots.push(timeSlot);
      }

      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour += 1;
      }
    }

    return availableSlots;

  } catch (error) {
    console.error('Error getting available time slots:', error);
    return [];
  }
}

export default {
  findBestAvailableDoctor,
  scheduleAppointment,
  getNextQueueNumber,
  getAvailableTimeSlots
};
