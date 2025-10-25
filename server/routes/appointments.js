import express from 'express';
import { verifyPatientToken, verifyStaffToken } from '../middleware/auth.js';
import { requireStaff, canAccessPatientData } from '../middleware/rbac.js';
import { scheduleAppointment, getAvailableTimeSlots } from '../services/scheduler.js';
import { query, run } from '../config/database.js';

const router = express.Router();

/**
 * POST /api/appointments/book
 * Book a new appointment with automatic doctor assignment
 * Body: { departmentId, symptoms, appointmentDate, appointmentTime (optional), preferredDoctorId (optional) }
 */
router.post('/book', verifyPatientToken, async (req, res) => {
  try {
    // ===== ENHANCED LOGGING FOR DEBUGGING =====
    console.log('='.repeat(60));
    console.log('📋 APPOINTMENT BOOKING REQUEST');
    console.log('='.repeat(60));
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    console.log('Patient User ID:', req.user.userId);
    console.log('Patient Email:', req.user.email);

    const {
      department,
      departmentId,
      symptoms,
      appointmentDate,
      appointmentTime = null,
      preferredDoctorId = null,
      date,
      time
    } = req.body;

    const patientId = req.user.userId;

    console.log('\n📊 Parsed Request Data:');
    console.log('  - department:', department);
    console.log('  - departmentId:', departmentId);
    console.log('  - symptoms:', symptoms?.substring(0, 50) + '...');
    console.log('  - appointmentDate:', appointmentDate);
    console.log('  - date:', date);

    // Map department slugs to names (must match database exactly)
    const departmentMap = {
      'general-medicine': 'General Medicine',
      'general-practice': 'General Medicine', // Alias for general medicine
      'cardiology': 'Cardiology',
      'pediatrics': 'Pediatrics',
      'orthopedics': 'Orthopedics',
      'dermatology': 'Dermatology',
      'neurology': 'Neurology',
      'gynecology': 'Obstetrics & Gynecology',
      'obstetrics-gynecology': 'Obstetrics & Gynecology',
      'emergency': 'Emergency Medicine',
      'emergency-medicine': 'Emergency Medicine',
      'internal-medicine': 'Internal Medicine',
      'surgery': 'Surgery'
    };

    // ===== FIX: Accept either department or departmentId =====
    // The frontend may send 'department' as either:
    // 1. A numeric string ID (e.g., "1", "2")
    // 2. A department slug (e.g., "general-medicine")
    // 3. A department name (e.g., "General Medicine")
    let finalDepartmentId = departmentId;

    console.log('\n🔍 Processing Department Identifier...');

    if (!finalDepartmentId && department) {
      // Check if department is a numeric ID
      const numericId = parseInt(department);
      if (!isNaN(numericId) && numericId > 0) {
        console.log(`  ✓ Department is numeric ID: ${numericId}`);
        finalDepartmentId = numericId;
      } else {
        // Try to find department by slug or name
        console.log(`  → Looking up department by name/slug: "${department}"`);
        const departmentName = departmentMap[department] || department;
        console.log(`  → Mapped name: "${departmentName}"`);

        const deptResult = await query(
          `SELECT department_id FROM departments WHERE name = ? OR name LIKE ?`,
          [departmentName, `${departmentName}%`]
        );

        console.log(`  → Query result:`, deptResult);

        if (deptResult.length > 0) {
          finalDepartmentId = deptResult[0].department_id;
          console.log(`  ✓ Found department ID: ${finalDepartmentId}`);
        } else {
          console.log(`  ✗ No department found for: "${department}"`);
        }
      }
    }

    console.log(`\n✅ Final Department ID: ${finalDepartmentId}`);

    // Use date/time if appointmentDate/appointmentTime not provided
    const finalDate = appointmentDate || date;
    const finalTime = appointmentTime || time;

    // Validate required fields
    if (!finalDepartmentId && !department) {
      return res.status(400).json({
        success: false,
        message: 'Department is required'
      });
    }

    if (!symptoms) {
      return res.status(400).json({
        success: false,
        message: 'Symptoms description is required'
      });
    }

    if (!finalDate) {
      return res.status(400).json({
        success: false,
        message: 'Appointment date is required'
      });
    }

    // Validate date is in the future
    const selectedDate = new Date(finalDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Appointment date must be in the future'
      });
    }

    // ✅ PREVENT DUPLICATE BOOKINGS: Check if patient already has appointment today
    console.log('\n🔍 Checking for duplicate bookings...');
    const existingAppointments = await query(
      `SELECT appointment_id, appointment_date, appointment_time, status
       FROM appointments
       WHERE patient_id = ? AND appointment_date = ? AND status NOT IN ('cancelled', 'no-show', 'completed')`,
      [patientId, finalDate]
    );

    if (existingAppointments.length > 0) {
      console.log('  ✗ Duplicate booking detected!', existingAppointments[0]);
      const existing = existingAppointments[0];
      return res.status(400).json({
        success: false,
        message: `You already have an appointment scheduled for ${finalDate} at ${existing.appointment_time}. You can only book one appointment per day.`,
        error: 'DUPLICATE_BOOKING',
        existingAppointment: {
          date: existing.appointment_date,
          time: existing.appointment_time,
          status: existing.status
        }
      });
    }
    console.log('  ✓ No duplicate bookings found');

    // ===== Call Automated Scheduler =====
    console.log('\n🤖 Calling Automated Scheduler...');
    console.log('Scheduler Parameters:', {
      patientId,
      departmentId: finalDepartmentId,
      symptomsDescription: symptoms?.substring(0, 50),
      appointmentDate: finalDate,
      appointmentTime: finalTime,
      preferredDoctorId
    });

    const scheduledAppointment = await scheduleAppointment({
      patientId,
      departmentId: finalDepartmentId,
      symptomsDescription: symptoms,
      appointmentDate: finalDate,
      appointmentTime: finalTime,
      preferredDoctorId
    });

    console.log('\n✅ Appointment Scheduled Successfully!');
    console.log('Scheduled Data:', JSON.stringify(scheduledAppointment, null, 2));
    console.log('='.repeat(60));

    // Get department name for response
    const departmentInfo = await query(
      'SELECT name FROM departments WHERE department_id = ?',
      [finalDepartmentId]
    );
    const departmentName = departmentInfo.length > 0 ? departmentInfo[0].name : 'Department';

    res.status(201).json({
      success: true,
      message: `Appointment scheduled successfully with ${scheduledAppointment.doctor.name}`,
      data: {
        appointmentId: scheduledAppointment.appointmentId,
        queueNumber: scheduledAppointment.queueNumber,
        doctor: scheduledAppointment.doctor,
        departmentName: departmentName,
        date: scheduledAppointment.appointmentDate,
        time: scheduledAppointment.appointmentTime,
        appointmentDate: scheduledAppointment.appointmentDate,
        appointmentTime: scheduledAppointment.appointmentTime,
        status: scheduledAppointment.status
      }
    });

  } catch (error) {
    console.error('='.repeat(60));
    console.error('❌ APPOINTMENT BOOKING ERROR');
    console.error('='.repeat(60));
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Request Body:', JSON.stringify(req.body, null, 2));
    console.error('='.repeat(60));

    res.status(500).json({
      success: false,
      message: error.message || 'Error booking appointment',
      error: error.message
    });
  }
});

/**
 * GET /api/appointments/patient/:patientId
 * Get appointments for a specific patient with queue information
 */
router.get('/patient/:patientId', verifyPatientToken, canAccessPatientData, async (req, res) => {
  try {
    const { patientId } = req.params;

    const patientAppointments = await query(`
      SELECT
        a.*,
        u.full_name as doctor_name,
        u.staff_id as doctor_staff_id,
        d.name as department_name
      FROM appointments a
      LEFT JOIN users u ON a.doctor_id = u.user_id
      LEFT JOIN doctor_departments dd ON u.user_id = dd.user_id
      LEFT JOIN departments d ON dd.department_id = d.department_id
      WHERE a.patient_id = ?
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `, [patientId]);

    res.status(200).json({
      success: true,
      data: patientAppointments
    });
  } catch (error) {
    console.error('Get patient appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments',
      error: error.message
    });
  }
});

/**
 * GET /api/appointments/all
 * Get all appointments (Staff only)
 */
router.get('/all', verifyStaffToken, requireStaff, async (req, res) => {
  try {
    const allAppointments = await query(`
      SELECT
        a.*,
        p.full_name as patient_name,
        p.email as patient_email,
        p.patient_id as patient_number,
        d.full_name as doctor_name,
        d.staff_id as doctor_staff_id,
        dept.name as department_name
      FROM appointments a
      LEFT JOIN users p ON a.patient_id = p.user_id
      LEFT JOIN users d ON a.doctor_id = d.user_id
      LEFT JOIN doctor_departments dd ON d.user_id = dd.user_id
      LEFT JOIN departments dept ON dd.department_id = dept.department_id
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `);

    res.status(200).json({
      success: true,
      data: allAppointments
    });
  } catch (error) {
    console.error('Get all appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments',
      error: error.message
    });
  }
});

/**
 * PATCH /api/appointments/:id/status
 * Update appointment status (Staff only)
 */
router.patch('/:id/status', verifyStaffToken, requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if appointment exists
    const appointment = await query(
      'SELECT * FROM appointments WHERE appointment_id = ?',
      [id]
    );

    if (appointment.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Update appointment status
    await run(
      `UPDATE appointments
       SET status = ?, updated_at = datetime('now')
       WHERE appointment_id = ?`,
      [status, id]
    );

    // Get updated appointment
    const updatedAppointment = await query(
      'SELECT * FROM appointments WHERE appointment_id = ?',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Appointment status updated',
      data: updatedAppointment[0]
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
 * GET /api/appointments/available-slots
 * Get available time slots for a doctor on a specific date
 * Query params: doctorId, date
 */
router.get('/available-slots', verifyPatientToken, async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID and date are required'
      });
    }

    const availableSlots = await getAvailableTimeSlots(parseInt(doctorId), date);

    res.status(200).json({
      success: true,
      data: {
        doctorId,
        date,
        availableSlots
      }
    });

  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available slots',
      error: error.message
    });
  }
});

/**
 * GET /api/appointments/departments
 * Get all departments
 */
router.get('/departments', async (req, res) => {
  try {
    const departments = await pool.query(`
      SELECT
        department_id,
        name,
        description
      FROM departments
      WHERE is_active = 1
      ORDER BY name ASC
    `);

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
 * GET /api/appointments/doctors/:departmentId
 * Get all doctors in a department
 */
router.get('/doctors/:departmentId', async (req, res) => {
  try {
    const { departmentId } = req.params;

    const doctors = await pool.query(`
      SELECT
        u.user_id,
        u.full_name,
        u.staff_id,
        COUNT(DISTINCT a.appointment_id) as total_patients
      FROM users u
      INNER JOIN doctor_departments dd ON u.user_id = dd.user_id
      LEFT JOIN appointments a ON u.user_id = a.doctor_id
        AND a.appointment_date = date('now')
        AND a.status NOT IN ('cancelled', 'no-show')
      WHERE dd.department_id = ?
        AND u.role = 'doctor'
        AND u.is_active = 1
      GROUP BY u.user_id, u.full_name, u.staff_id
      ORDER BY total_patients ASC, u.full_name ASC
    `, [departmentId]);

    res.status(200).json({
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
 * GET /api/appointments/doctor/queue
 * Get queue for the logged-in doctor (for doctor dashboard)
 */
router.get('/doctor/queue', verifyStaffToken, async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];

    // Get today's appointments for this doctor with patient info
    const queue = await query(`
      SELECT
        a.*,
        p.full_name as patient_name,
        p.email as patient_email,
        p.patient_id as patient_number,
        p.phone as patient_phone
      FROM appointments a
      LEFT JOIN users p ON a.patient_id = p.user_id
      WHERE a.doctor_id = ?
        AND a.appointment_date = ?
        AND a.status NOT IN ('cancelled', 'no-show')
      ORDER BY a.queue_number ASC, a.appointment_time ASC
    `, [doctorId, today]);

    res.status(200).json({
      success: true,
      data: {
        date: today,
        totalPatients: queue.length,
        queue: queue
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
 * GET /api/appointments/doctor/upcoming
 * Get upcoming appointments for the logged-in doctor
 */
router.get('/doctor/upcoming', verifyStaffToken, async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];

    // Get upcoming appointments (today and future)
    const appointments = await query(`
      SELECT
        a.*,
        p.full_name as patient_name,
        p.email as patient_email,
        p.patient_id as patient_number,
        p.phone as patient_phone
      FROM appointments a
      LEFT JOIN users p ON a.patient_id = p.user_id
      WHERE a.doctor_id = ?
        AND a.appointment_date >= ?
        AND a.status NOT IN ('cancelled', 'no-show', 'completed')
      ORDER BY a.appointment_date ASC, a.appointment_time ASC
      LIMIT 50
    `, [doctorId, today]);

    res.status(200).json({
      success: true,
      data: appointments
    });
  } catch (error) {
    console.error('Get doctor upcoming appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming appointments',
      error: error.message
    });
  }
});

/**
 * POST /api/appointments/emergency
 * Add emergency patient to front of queue (Queue #0)
 * Simpler endpoint that adds patient to position 0 without complex queue management
 */
router.post('/emergency', verifyStaffToken, async (req, res) => {
  try {
    console.log('='.repeat(60));
    console.log('🚨 EMERGENCY PATIENT REQUEST');
    console.log('='.repeat(60));
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    console.log('Request User:', JSON.stringify(req.user, null, 2));

    const { patientId, doctorId, symptoms, appointmentDate } = req.body;

    console.log('Parsed values:', {
      patientId,
      doctorId,
      symptoms: symptoms?.substring(0, 50),
      appointmentDate
    });

    // Validate required fields
    if (!patientId || !doctorId || !symptoms) {
      console.log('❌ Validation failed:', {
        hasPatientId: !!patientId,
        hasDoctorId: !!doctorId,
        hasSymptoms: !!symptoms
      });
      return res.status(400).json({
        success: false,
        message: 'Patient ID, doctor ID, and symptoms are required'
      });
    }

    const finalDate = appointmentDate || new Date().toISOString().split('T')[0];

    // Get patient info
    const patientInfo = await query(
      'SELECT full_name, patient_id, phone, email FROM users WHERE user_id = ?',
      [patientId]
    );

    if (patientInfo.length === 0) {
      console.log('❌ Patient not found:', patientId);
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    console.log('✓ Patient found:', patientInfo[0].full_name);

    // Get all appointments for this doctor on this date to push them back
    const existingAppointments = await query(`
      SELECT appointment_id, queue_number, appointment_time, patient_id
      FROM appointments
      WHERE doctor_id = ?
        AND appointment_date = ?
        AND status NOT IN ('cancelled', 'no-show', 'completed')
      ORDER BY queue_number ASC
    `, [doctorId, finalDate]);

    console.log(`📋 Found ${existingAppointments.length} existing appointments to push back`);

    // Push back all existing appointments by 1 position (25 minutes)
    for (const apt of existingAppointments) {
      const newQueueNumber = apt.queue_number + 1;
      const newTimeSlot = calculateEmergencyTimeSlot(newQueueNumber);

      console.log(`  → Pushing appointment ${apt.appointment_id}: queue ${apt.queue_number} → ${newQueueNumber}, time → ${newTimeSlot}`);

      await run(`
        UPDATE appointments
        SET queue_number = ?,
            appointment_time = ?,
            notes = COALESCE(notes, '') || ' [Pushed back due to emergency patient]',
            updated_at = datetime('now', '+2 hours')
        WHERE appointment_id = ?
      `, [newQueueNumber, newTimeSlot, apt.appointment_id]);
    }

    // Insert emergency appointment with queue_number = 1 (first position)
    // Status is 'scheduled' (database only allows: scheduled, completed, cancelled, no-show)
    console.log('✓ Inserting emergency patient at queue position 1, time 08:00, status: scheduled');

    const result = await run(`
      INSERT INTO appointments (
        patient_id,
        doctor_id,
        appointment_date,
        appointment_time,
        status,
        reason,
        notes,
        queue_number,
        created_at
      ) VALUES (?, ?, ?, ?, 'scheduled', ?, ?, 1, datetime('now', '+2 hours'))
    `, [
      patientId,
      doctorId,
      finalDate,
      '08:00', // Emergency patients get first slot at 08:00
      symptoms,
      '[EMERGENCY] Priority patient - immediate consultation required'
    ]);

    console.log('✅ Emergency patient added successfully!');
    console.log(`   - Appointment ID: ${result.lastID}`);
    console.log(`   - Queue Position: 1`);
    console.log(`   - Patients pushed back: ${existingAppointments.length}`);
    console.log('='.repeat(60));

    res.status(201).json({
      success: true,
      message: `Emergency patient ${patientInfo[0].full_name} added to front of queue. ${existingAppointments.length} patient(s) pushed back by 25 minutes.`,
      data: {
        appointmentId: result.lastID,
        queueNumber: 1,
        appointmentTime: '08:00',
        patientName: patientInfo[0].full_name,
        appointmentDate: finalDate,
        patientsPushedBack: existingAppointments.length
      }
    });

  } catch (error) {
    console.error('='.repeat(60));
    console.error('❌ ADD EMERGENCY PATIENT ERROR');
    console.error('='.repeat(60));
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Request Body:', JSON.stringify(req.body, null, 2));
    console.error('='.repeat(60));

    res.status(500).json({
      success: false,
      message: 'Error adding emergency patient',
      error: error.message,
      details: error.stack
    });
  }
});

/**
 * POST /api/appointments/doctor/emergency
 * Insert emergency patient (Doctor only)
 * Automatically pushes back all subsequent patients in queue
 */
router.post('/doctor/emergency', verifyStaffToken, async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const { patientId, appointmentDate, queuePosition, reason } = req.body;

    // Validate required fields
    if (!patientId || !appointmentDate || !queuePosition) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID, appointment date, and queue position are required'
      });
    }

    // Get all appointments for this doctor on this date that are at or after the insertion point
    const affectedAppointments = await query(`
      SELECT * FROM appointments
      WHERE doctor_id = ?
        AND appointment_date = ?
        AND queue_number >= ?
        AND status NOT IN ('cancelled', 'no-show', 'completed')
      ORDER BY queue_number ASC
    `, [doctorId, appointmentDate, queuePosition]);

    // Push back all affected appointments by incrementing their queue numbers
    for (const apt of affectedAppointments) {
      const newQueueNumber = apt.queue_number + 1;
      const newTimeSlot = calculateEmergencyTimeSlot(newQueueNumber);

      await run(`
        UPDATE appointments
        SET queue_number = ?,
            appointment_time = ?,
            notes = COALESCE(notes || ' ', '') || '[Queue adjusted due to emergency patient insertion]',
            updated_at = datetime('now')
        WHERE appointment_id = ?
      `, [newQueueNumber, newTimeSlot, apt.appointment_id]);
    }

    // Calculate time slot for emergency patient
    const emergencyTimeSlot = calculateEmergencyTimeSlot(queuePosition);

    // Insert emergency appointment
    const result = await run(`
      INSERT INTO appointments (
        patient_id,
        doctor_id,
        appointment_date,
        appointment_time,
        status,
        reason,
        notes,
        queue_number
      ) VALUES (?, ?, ?, ?, 'scheduled', ?, '[EMERGENCY] Inserted by doctor', ?)
    `, [
      patientId,
      doctorId,
      appointmentDate,
      emergencyTimeSlot,
      reason || 'Emergency consultation',
      queuePosition
    ]);

    res.status(201).json({
      success: true,
      message: `Emergency patient inserted at queue position ${queuePosition}. ${affectedAppointments.length} patients pushed back.`,
      data: {
        appointmentId: result.lastID,
        queueNumber: queuePosition,
        appointmentTime: emergencyTimeSlot,
        affectedPatients: affectedAppointments.length
      }
    });

  } catch (error) {
    console.error('Insert emergency patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Error inserting emergency patient',
      error: error.message
    });
  }
});

/**
 * Helper function to calculate time slot (same as scheduler.js)
 */
function calculateEmergencyTimeSlot(queueNumber) {
  const startHour = 8;
  const slotDuration = 25; // minutes

  const totalMinutes = (queueNumber - 1) * slotDuration;
  const hours = startHour + Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * DELETE /api/appointments/:id
 * Cancel appointment
 */
router.delete('/:id', verifyPatientToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get appointment
    const appointment = await query(
      'SELECT * FROM appointments WHERE appointment_id = ?',
      [id]
    );

    if (appointment.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Ensure patient can only cancel their own appointments
    if (appointment[0].patient_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own appointments'
      });
    }

    // Update status to cancelled instead of deleting
    await run(
      `UPDATE appointments
       SET status = 'cancelled', updated_at = datetime('now')
       WHERE appointment_id = ?`,
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling appointment',
      error: error.message
    });
  }
});

export default router;
