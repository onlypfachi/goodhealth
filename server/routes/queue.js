import express from 'express';
import { query, run } from '../config/database.js';
import { verifyStaffToken } from '../middleware/auth.js';
import { requireStaff } from '../middleware/rbac.js';

const router = express.Router();

/**
 * GET /api/queue/doctor/:doctorId
 * Get today's queue for a specific doctor
 */
router.get('/doctor/:doctorId', verifyStaffToken, async (req, res) => {
  try {
    const { doctorId } = req.params;

    const queueData = await query(
      `SELECT
        q.queue_id,
        q.queue_number,
        q.status as queue_status,
        q.called_at,
        a.appointment_id,
        a.symptoms_description,
        a.appointment_time,
        a.status as appointment_status,
        a.prescription,
        a.notes,
        p.user_id as patient_user_id,
        p.full_name as patient_name,
        p.patient_id,
        p.phone,
        p.email,
        p.date_of_birth,
        p.gender,
        d.name as department_name
      FROM queue_management q
      JOIN appointments a ON q.appointment_id = a.appointment_id
      JOIN users p ON a.patient_id = p.user_id
      JOIN departments d ON q.department_id = d.department_id
      WHERE a.doctor_id = ?
        AND q.queue_date = date('now')
        AND q.status != 'completed'
      ORDER BY
        CASE q.status
          WHEN 'in_consultation' THEN 1
          WHEN 'called' THEN 2
          WHEN 'waiting' THEN 3
          ELSE 4
        END,
        q.queue_number ASC`,
      [doctorId]
    );

    res.json({
      success: true,
      data: queueData
    });

  } catch (error) {
    console.error('Error fetching doctor queue:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching queue',
      error: error.message
    });
  }
});

/**
 * POST /api/queue/call-next
 * Call the next patient in queue
 */
router.post('/call-next', verifyStaffToken, async (req, res) => {
  try {
    const { queueId, doctorId } = req.body;

    if (!queueId) {
      return res.status(400).json({
        success: false,
        message: 'Queue ID is required'
      });
    }

    // Update queue status to 'called'
    await run(
      `UPDATE queue_management
       SET status = 'called',
           called_at = datetime('now'),
           updated_at = datetime('now')
       WHERE queue_id = ?`,
      [queueId]
    );

    // Update appointment status
    await run(
      `UPDATE appointments
       SET status = 'confirmed',
           updated_at = datetime('now')
       WHERE appointment_id = (
         SELECT appointment_id FROM queue_management WHERE queue_id = ?
       )`,
      [queueId]
    );

    res.json({
      success: true,
      message: 'Patient called successfully'
    });

  } catch (error) {
    console.error('Error calling patient:', error);
    res.status(500).json({
      success: false,
      message: 'Error calling patient',
      error: error.message
    });
  }
});

/**
 * POST /api/queue/start-consultation
 * Start consultation with a patient
 */
router.post('/start-consultation', verifyStaffToken, async (req, res) => {
  try {
    const { queueId } = req.body;

    if (!queueId) {
      return res.status(400).json({
        success: false,
        message: 'Queue ID is required'
      });
    }

    // Update queue status to 'in_consultation'
    await run(
      `UPDATE queue_management
       SET status = 'in_consultation',
           updated_at = datetime('now')
       WHERE queue_id = ?`,
      [queueId]
    );

    // Update appointment status and start time
    await run(
      `UPDATE appointments
       SET status = 'in_progress',
           actual_start_time = datetime('now'),
           updated_at = datetime('now')
       WHERE appointment_id = (
         SELECT appointment_id FROM queue_management WHERE queue_id = ?
       )`,
      [queueId]
    );

    res.json({
      success: true,
      message: 'Consultation started successfully'
    });

  } catch (error) {
    console.error('Error starting consultation:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting consultation',
      error: error.message
    });
  }
});

/**
 * POST /api/queue/complete-consultation
 * Complete consultation and update patient records
 */
router.post('/complete-consultation', verifyStaffToken, async (req, res) => {
  try {
    const { queueId, diagnosis, treatment, prescription, notes } = req.body;
    const doctorId = req.user.id;

    if (!queueId) {
      return res.status(400).json({
        success: false,
        message: 'Queue ID is required'
      });
    }

    // Get appointment and patient info
    const [queueItem] = await query(
      `SELECT q.appointment_id, a.patient_id
       FROM queue_management q
       JOIN appointments a ON q.appointment_id = a.appointment_id
       WHERE q.queue_id = ?`,
      [queueId]
    );

    if (!queueItem) {
      return res.status(404).json({
        success: false,
        message: 'Queue item not found'
      });
    }

    // Update queue status to 'completed'
    await run(
      `UPDATE queue_management
       SET status = 'completed',
           completed_at = datetime('now'),
           updated_at = datetime('now')
       WHERE queue_id = ?`,
      [queueId]
    );

    // Update appointment
    await run(
      `UPDATE appointments
       SET status = 'completed',
           actual_end_time = datetime('now'),
           prescription = ?,
           notes = ?,
           updated_at = datetime('now')
       WHERE appointment_id = ?`,
      [prescription, notes, queueItem.appointment_id]
    );

    // Create medical record if diagnosis/treatment provided
    if (diagnosis || treatment) {
      await run(
        `INSERT INTO medical_records (
          patient_id, appointment_id, diagnosis, treatment,
          prescription, notes, recorded_by, record_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, date('now'))`,
        [
          queueItem.patient_id,
          queueItem.appointment_id,
          diagnosis,
          treatment,
          prescription,
          notes,
          doctorId
        ]
      );
    }

    res.json({
      success: true,
      message: 'Consultation completed successfully'
    });

  } catch (error) {
    console.error('Error completing consultation:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing consultation',
      error: error.message
    });
  }
});

/**
 * POST /api/queue/skip
 * Skip a patient (move to end of queue)
 */
router.post('/skip', verifyStaffToken, async (req, res) => {
  try {
    const { queueId } = req.body;

    if (!queueId) {
      return res.status(400).json({
        success: false,
        message: 'Queue ID is required'
      });
    }

    await run(
      `UPDATE queue_management
       SET status = 'skipped',
           updated_at = datetime('now')
       WHERE queue_id = ?`,
      [queueId]
    );

    res.json({
      success: true,
      message: 'Patient skipped'
    });

  } catch (error) {
    console.error('Error skipping patient:', error);
    res.status(500).json({
      success: false,
      message: 'Error skipping patient',
      error: error.message
    });
  }
});

/**
 * POST /api/queue/no-show
 * Mark patient as no-show
 */
router.post('/no-show', verifyStaffToken, async (req, res) => {
  try {
    const { queueId } = req.body;

    if (!queueId) {
      return res.status(400).json({
        success: false,
        message: 'Queue ID is required'
      });
    }

    await run(
      `UPDATE queue_management
       SET status = 'no_show',
           updated_at = datetime('now')
       WHERE queue_id = ?`,
      [queueId]
    );

    await run(
      `UPDATE appointments
       SET status = 'no_show',
           updated_at = datetime('now')
       WHERE appointment_id = (
         SELECT appointment_id FROM queue_management WHERE queue_id = ?
       )`,
      [queueId]
    );

    res.json({
      success: true,
      message: 'Patient marked as no-show'
    });

  } catch (error) {
    console.error('Error marking no-show:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking no-show',
      error: error.message
    });
  }
});

/**
 * POST /api/queue/insert-emergency
 * Insert an emergency patient at the front of the queue
 */
router.post('/insert-emergency', verifyStaffToken, async (req, res) => {
  try {
    const { patientId, symptoms, departmentId } = req.body;
    const doctorId = req.user.id;

    if (!patientId || !symptoms || !departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID, symptoms, and department are required'
      });
    }

    // Create appointment
    const appointmentResult = await run(
      `INSERT INTO appointments (
        patient_id, doctor_id, department_id,
        symptoms_description, status, appointment_date, appointment_time
      ) VALUES (?, ?, ?, ?, 'confirmed', date('now'), 'EMERGENCY')`,
      [patientId, doctorId, departmentId, symptoms]
    );

    const appointmentId = appointmentResult.lastID;

    // Insert at front of queue (queue_number = 0)
    await run(
      `INSERT INTO queue_management (
        appointment_id, queue_number, queue_date,
        department_id, status
      ) VALUES (?, 0, date('now'), ?, 'waiting')`,
      [appointmentId, departmentId]
    );

    // Update other queue numbers
    await run(
      `UPDATE queue_management
       SET queue_number = queue_number + 1
       WHERE queue_date = date('now')
         AND department_id = ?
         AND appointment_id != ?`,
      [departmentId, appointmentId]
    );

    res.json({
      success: true,
      message: 'Emergency patient added to queue',
      data: { appointmentId }
    });

  } catch (error) {
    console.error('Error inserting emergency patient:', error);
    res.status(500).json({
      success: false,
      message: 'Error inserting emergency patient',
      error: error.message
    });
  }
});

/**
 * POST /api/queue/mark-all-seen
 * Mark all remaining patients as seen/notified
 */
router.post('/mark-all-seen', verifyStaffToken, async (req, res) => {
  try {
    const { doctorId } = req.body;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID is required'
      });
    }

    // Get all waiting appointments for this doctor today
    const result = await run(
      `UPDATE queue_management
       SET status = 'called',
           called_at = datetime('now'),
           updated_at = datetime('now')
       WHERE queue_id IN (
         SELECT q.queue_id
         FROM queue_management q
         JOIN appointments a ON q.appointment_id = a.appointment_id
         WHERE a.doctor_id = ?
           AND q.queue_date = date('now')
           AND q.status = 'waiting'
       )`,
      [doctorId]
    );

    res.json({
      success: true,
      message: `${result.changes} patients marked as called`,
      data: { count: result.changes }
    });

  } catch (error) {
    console.error('Error marking all seen:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking patients as seen',
      error: error.message
    });
  }
});

export default router;
