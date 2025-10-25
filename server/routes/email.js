import express from 'express';
import nodemailer from 'nodemailer';
import pool from '../config/database.js';

const router = express.Router();

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can change this to your email service
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASSWORD // Your email password or app password
  }
});

/**
 * POST /api/email/call-patient
 * Send consultation call email to patient
 * Body: { doctorId, patientId, appointmentId }
 */
router.post('/call-patient', async (req, res) => {
  try {
    const { doctorId, patientId, appointmentId } = req.body;

    if (!doctorId || !patientId) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID and Patient ID are required'
      });
    }

    // Get doctor information
    const [doctorRows] = await pool.query(
      'SELECT full_name, email FROM users WHERE user_id = ? AND role = "doctor"',
      [doctorId]
    );

    if (doctorRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const doctor = doctorRows[0];

    // Get patient information
    const [patientRows] = await pool.query(
      'SELECT full_name, email FROM users WHERE user_id = ? AND role = "patient"',
      [patientId]
    );

    if (patientRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const patient = patientRows[0];

    // Email subject and body
    const subject = `📞 Consultation Call from Dr. ${doctor.full_name}`;
    const body = `Dear ${patient.full_name},

It is now time to begin your scheduled consultation with Dr. ${doctor.full_name}. If you are unable to attend at this time, please log in to your dashboard and select the option to reschedule your appointment at your convenience.

Thank you for your cooperation.

Best regards,
GoodHealth Hospital`;

    // Send email
    const mailOptions = {
      from: doctor.email,
      to: patient.email,
      subject: subject,
      text: body,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <h2 style="color: #0d5acd; margin-bottom: 20px;">📞 Consultation Call from Dr. ${doctor.full_name}</h2>
            <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">Dear ${patient.full_name},</p>
            <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
              It is now time to begin your scheduled consultation with <strong>Dr. ${doctor.full_name}</strong>.
              If you are unable to attend at this time, please log in to your dashboard and select the option to
              reschedule your appointment at your convenience.
            </p>
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Thank you for your cooperation.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 14px; margin-bottom: 5px;">Best regards,</p>
            <p style="color: #0d5acd; font-weight: bold; font-size: 16px;">GoodHealth Hospital</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    // Update appointment status to 'called' if appointmentId is provided
    if (appointmentId) {
      await pool.query(
        'UPDATE Queue_Management SET status = "called", called_at = datetime(\'now\') WHERE appointment_id = ?',
        [appointmentId]
      );
    }

    res.json({
      success: true,
      message: 'Consultation email sent successfully',
      data: {
        patientEmail: patient.email,
        doctorName: doctor.full_name
      }
    });

  } catch (error) {
    console.error('Error sending consultation email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send consultation email',
      error: error.message
    });
  }
});

/**
 * POST /api/email/reschedule
 * Automatically reassign patient to available doctor and notify
 * Body: { patientId, appointmentId, departmentId }
 */
router.post('/reschedule', async (req, res) => {
  try {
    const { patientId, appointmentId, departmentId } = req.body;

    if (!patientId || !appointmentId || !departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID, Appointment ID, and Department ID are required'
      });
    }

    // Get patient information
    const [patientRows] = await pool.query(
      'SELECT full_name, email FROM users WHERE user_id = ? AND role = "patient"',
      [patientId]
    );

    if (patientRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const patient = patientRows[0];

    // Find next available doctor in the department based on their schedule
    const [availableDoctors] = await pool.query(`
      SELECT DISTINCT u.user_id, u.full_name, u.email,
             COUNT(a.appointment_id) as patient_count
      FROM users u
      INNER JOIN Doctor_Departments dd ON u.user_id = dd.doctor_id
      LEFT JOIN Appointments a ON u.user_id = a.doctor_id
                              AND a.appointment_date = CURDATE()
                              AND a.status NOT IN ('cancelled', 'completed')
      WHERE dd.department_id = ?
        AND u.role = 'doctor'
        AND u.is_active = TRUE
      GROUP BY u.user_id, u.full_name, u.email
      ORDER BY patient_count ASC, u.user_id ASC
      LIMIT 1
    `, [departmentId]);

    if (availableDoctors.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No available doctors found in this department'
      });
    }

    const newDoctor = availableDoctors[0];

    // Update appointment with new doctor
    await pool.query(
      'UPDATE Appointments SET doctor_id = ?, status = "confirmed" WHERE appointment_id = ?',
      [newDoctor.user_id, appointmentId]
    );

    // Reset queue status
    await pool.query(
      'UPDATE Queue_Management SET status = "waiting" WHERE appointment_id = ?',
      [appointmentId]
    );

    // Send notification email to patient
    const subject = `🔄 Appointment Rescheduled - Dr. ${newDoctor.full_name}`;
    const body = `Dear ${patient.full_name},

Your appointment has been successfully rescheduled. You have been assigned to Dr. ${newDoctor.full_name}.

Your new appointment details will be available in your patient dashboard. Please log in to view your updated appointment information.

If you have any questions, please contact us at the hospital.

Best regards,
GoodHealth Hospital`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: patient.email,
      subject: subject,
      text: body,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <h2 style="color: #0d5acd; margin-bottom: 20px;">🔄 Appointment Rescheduled</h2>
            <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">Dear ${patient.full_name},</p>
            <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
              Your appointment has been successfully rescheduled. You have been assigned to <strong>Dr. ${newDoctor.full_name}</strong>.
            </p>
            <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
              Your new appointment details will be available in your patient dashboard. Please log in to view your updated appointment information.
            </p>
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              If you have any questions, please contact us at the hospital.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 14px; margin-bottom: 5px;">Best regards,</p>
            <p style="color: #0d5acd; font-weight: bold; font-size: 16px;">GoodHealth Hospital</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: {
        newDoctor: {
          id: newDoctor.user_id,
          name: newDoctor.full_name,
          email: newDoctor.email
        },
        patientEmail: patient.email
      }
    });

  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reschedule appointment',
      error: error.message
    });
  }
});

export default router;
