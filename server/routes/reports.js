import express from 'express';
import { verifyPatientToken, verifyStaffToken } from '../middleware/auth.js';
import { query, run } from '../config/database.js';

const router = express.Router();

/**
 * POST /api/reports
 * Create a new medical report (Doctor only)
 */
router.post('/', verifyStaffToken, async (req, res) => {
  try {
    const {
      appointmentId,
      patientId,
      title,
      content,
      isPatientVisible = true,
      reportType = 'consultation'
    } = req.body;

    const doctorId = req.user.userId;

    // Validate required fields
    if (!appointmentId || !patientId || !title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: appointmentId, patientId, title, content'
      });
    }

    // Verify the appointment belongs to this doctor
    const appointment = await query(
      'SELECT * FROM appointments WHERE appointment_id = ? AND doctor_id = ?',
      [appointmentId, doctorId]
    );

    if (appointment.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Appointment does not belong to this doctor'
      });
    }

    // Create report
    const result = await run(`
      INSERT INTO medical_reports (
        appointment_id,
        patient_id,
        doctor_id,
        title,
        content,
        is_patient_visible,
        report_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      appointmentId,
      patientId,
      doctorId,
      title,
      content,
      isPatientVisible ? 1 : 0,
      reportType
    ]);

    res.status(201).json({
      success: true,
      message: 'Medical report created successfully',
      data: {
        reportId: result.lastID
      }
    });

  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating report',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/patient
 * Get all reports for the logged-in patient
 */
router.get('/patient', verifyPatientToken, async (req, res) => {
  try {
    const patientId = req.user.userId;

    const reports = await query(`
      SELECT
        mr.report_id,
        mr.title,
        mr.content,
        mr.report_type,
        mr.created_at,
        mr.updated_at,
        u.full_name as doctor_name,
        a.appointment_date,
        a.appointment_time
      FROM medical_reports mr
      INNER JOIN users u ON mr.doctor_id = u.user_id
      INNER JOIN appointments a ON mr.appointment_id = a.appointment_id
      WHERE mr.patient_id = ?
        AND mr.is_patient_visible = 1
      ORDER BY mr.created_at DESC
    `, [patientId]);

    res.status(200).json({
      success: true,
      data: reports.map(report => ({
        id: report.report_id,
        title: report.title,
        content: report.content,
        doctor: report.doctor_name,
        date: report.created_at.split(' ')[0], // Extract date part
        type: report.report_type || 'Consultation',
        appointmentDate: report.appointment_date,
        appointmentTime: report.appointment_time
      }))
    });

  } catch (error) {
    console.error('Get patient reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/doctor
 * Get all reports created by the logged-in doctor
 */
router.get('/doctor', verifyStaffToken, async (req, res) => {
  try {
    const doctorId = req.user.userId;

    const reports = await query(`
      SELECT
        mr.report_id,
        mr.title,
        mr.content,
        mr.report_type,
        mr.is_patient_visible,
        mr.created_at,
        mr.updated_at,
        u.full_name as patient_name,
        u.patient_id,
        a.appointment_date,
        a.appointment_time
      FROM medical_reports mr
      INNER JOIN users u ON mr.patient_id = u.user_id
      INNER JOIN appointments a ON mr.appointment_id = a.appointment_id
      WHERE mr.doctor_id = ?
      ORDER BY mr.created_at DESC
    `, [doctorId]);

    res.status(200).json({
      success: true,
      data: reports
    });

  } catch (error) {
    console.error('Get doctor reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/:id
 * Get a specific report
 */
router.get('/:id', verifyPatientToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userType = req.user.userType; // 'patient' or 'staff'

    const reports = await query(`
      SELECT
        mr.*,
        doc.full_name as doctor_name,
        pat.full_name as patient_name,
        a.appointment_date,
        a.appointment_time
      FROM medical_reports mr
      INNER JOIN users doc ON mr.doctor_id = doc.user_id
      INNER JOIN users pat ON mr.patient_id = pat.user_id
      INNER JOIN appointments a ON mr.appointment_id = a.appointment_id
      WHERE mr.report_id = ?
    `, [id]);

    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reports[0];

    // Authorization check
    if (userType === 'patient' && (report.patient_id !== userId || !report.is_patient_visible)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this report'
      });
    }

    res.status(200).json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching report',
      error: error.message
    });
  }
});

/**
 * PATCH /api/reports/:id
 * Update a report (Doctor only)
 */
router.patch('/:id', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user.userId;
    const { title, content, isPatientVisible } = req.body;

    // Verify the report belongs to this doctor
    const report = await query(
      'SELECT * FROM medical_reports WHERE report_id = ? AND doctor_id = ?',
      [id, doctorId]
    );

    if (report.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found or unauthorized'
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }
    if (isPatientVisible !== undefined) {
      updates.push('is_patient_visible = ?');
      values.push(isPatientVisible ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await run(
      `UPDATE medical_reports SET ${updates.join(', ')} WHERE report_id = ?`,
      values
    );

    res.status(200).json({
      success: true,
      message: 'Report updated successfully'
    });

  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating report',
      error: error.message
    });
  }
});

export default router;
