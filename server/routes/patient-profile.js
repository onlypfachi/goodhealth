import express from 'express';
import bcrypt from 'bcryptjs';
import { verifyPatientToken } from '../middleware/auth.js';
import { query, run } from '../config/database.js';

const router = express.Router();

/**
 * GET /api/patient/profile
 * Get patient profile details
 */
router.get('/profile', verifyPatientToken, async (req, res) => {
  try {
    const patientId = req.user.userId;

    const patients = await query(`
      SELECT
        user_id,
        email,
        full_name,
        patient_id,
        phone,
        address,
        date_of_birth,
        gender,
        created_at,
        last_login,
        profile_updated_at
      FROM users
      WHERE user_id = ? AND role = 'patient'
    `, [patientId]);

    if (patients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const patient = patients[0];

    res.status(200).json({
      success: true,
      data: {
        userId: patient.user_id,
        email: patient.email,
        fullName: patient.full_name,
        patientId: patient.patient_id,
        phone: patient.phone || '',
        address: patient.address || '',
        dateOfBirth: patient.date_of_birth || '',
        gender: patient.gender || '',
        createdAt: patient.created_at,
        lastLogin: patient.last_login,
        profileUpdatedAt: patient.profile_updated_at
      }
    });

  } catch (error) {
    console.error('Get patient profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
});

/**
 * PATCH /api/patient/profile
 * Update patient profile details
 */
router.patch('/profile', verifyPatientToken, async (req, res) => {
  try {
    const patientId = req.user.userId;
    const { fullName, phone, address, dateOfBirth, gender } = req.body;

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];

    if (fullName !== undefined) {
      updates.push('full_name = ?');
      values.push(fullName);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      values.push(address);
    }
    if (dateOfBirth !== undefined) {
      updates.push('date_of_birth = ?');
      values.push(dateOfBirth);
    }
    if (gender !== undefined) {
      updates.push('gender = ?');
      values.push(gender);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Add profile updated timestamp
    updates.push("profile_updated_at = datetime('now')");
    updates.push("updated_at = datetime('now')");
    values.push(patientId);

    await run(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = ? AND role = 'patient'`,
      values
    );

    // Log the activity
    await run(
      `INSERT INTO activity_logs (user_id, user_role, action_type, action_description)
       VALUES (?, 'patient', 'profile_update', 'Patient updated their profile information')`,
      [patientId]
    );

    // Get updated profile
    const updatedProfile = await query(
      `SELECT user_id, email, full_name, patient_id, phone, address, date_of_birth, gender, profile_updated_at
       FROM users WHERE user_id = ?`,
      [patientId]
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        userId: updatedProfile[0].user_id,
        email: updatedProfile[0].email,
        fullName: updatedProfile[0].full_name,
        patientId: updatedProfile[0].patient_id,
        phone: updatedProfile[0].phone || '',
        address: updatedProfile[0].address || '',
        dateOfBirth: updatedProfile[0].date_of_birth || '',
        gender: updatedProfile[0].gender || '',
        profileUpdatedAt: updatedProfile[0].profile_updated_at
      }
    });

  } catch (error) {
    console.error('Update patient profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
});

/**
 * POST /api/patient/change-password
 * Change patient password
 */
router.post('/change-password', verifyPatientToken, async (req, res) => {
  try {
    const patientId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get current password hash
    const patients = await query(
      'SELECT password_hash FROM users WHERE user_id = ? AND role = ?',
      [patientId, 'patient']
    );

    if (patients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, patients[0].password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await run(
      `UPDATE users
       SET password_hash = ?, last_password_change = datetime('now'), updated_at = datetime('now')
       WHERE user_id = ?`,
      [newPasswordHash, patientId]
    );

    // Log the activity
    await run(
      `INSERT INTO activity_logs (user_id, user_role, action_type, action_description)
       VALUES (?, 'patient', 'password_change', 'Patient changed their password')`,
      [patientId]
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
});

/**
 * POST /api/patient/change-email
 * Change patient email address
 */
router.post('/change-email', verifyPatientToken, async (req, res) => {
  try {
    const patientId = req.user.userId;
    const { newEmail, password } = req.body;

    // Validate input
    if (!newEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'New email and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Get current password hash
    const patients = await query(
      'SELECT password_hash, email FROM users WHERE user_id = ? AND role = ?',
      [patientId, 'patient']
    );

    if (patients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, patients[0].password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    // Check if new email is already in use
    const existingEmail = await query(
      'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
      [newEmail, patientId]
    );

    if (existingEmail.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email address is already in use by another account'
      });
    }

    // Update email
    await run(
      `UPDATE users
       SET email = ?, updated_at = datetime('now')
       WHERE user_id = ?`,
      [newEmail, patientId]
    );

    // Log the activity
    await run(
      `INSERT INTO activity_logs (user_id, user_role, action_type, action_description)
       VALUES (?, 'patient', 'email_change', 'Patient changed their email from ${patients[0].email} to ${newEmail}')`,
      [patientId]
    );

    res.status(200).json({
      success: true,
      message: 'Email changed successfully. Please use your new email to log in next time.',
      newEmail: newEmail
    });

  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing email',
      error: error.message
    });
  }
});

/**
 * POST /api/patient/update-phone
 * Update patient phone number (Zimbabwean format)
 */
router.post('/update-phone', verifyPatientToken, async (req, res) => {
  try {
    const patientId = req.user.userId;
    const { phoneNumber } = req.body;

    // Validate input
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Validate Zimbabwean phone format (+263 followed by 9 digits)
    // Accepts formats: +263771234567, 0771234567, 771234567
    const zimPhoneRegex = /^(\+263|0)?7[1-9]\d{7}$/;
    if (!zimPhoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Zimbabwean phone number format. Use format: +263771234567 or 0771234567'
      });
    }

    // Normalize phone number to international format
    let normalizedPhone = phoneNumber.replace(/\s/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+263' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+263' + normalizedPhone;
    }

    // Update phone number
    await run(
      `UPDATE users
       SET phone = ?, updated_at = datetime('now')
       WHERE user_id = ?`,
      [normalizedPhone, patientId]
    );

    // Log the activity
    await run(
      `INSERT INTO activity_logs (user_id, user_role, action_type, action_description)
       VALUES (?, 'patient', 'phone_update', 'Patient updated their phone number')`,
      [patientId]
    );

    res.status(200).json({
      success: true,
      message: 'Phone number updated successfully',
      phoneNumber: normalizedPhone
    });

  } catch (error) {
    console.error('Update phone error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating phone number',
      error: error.message
    });
  }
});

/**
 * DELETE /api/patient/account
 * Delete patient account (soft delete by setting is_active = 0)
 */
router.delete('/account', verifyPatientToken, async (req, res) => {
  try {
    const patientId = req.user.userId;
    // Accept password from either query params or body
    const password = req.query.password || req.body.password;
    const confirmDeletion = req.query.confirmDeletion === 'true' || req.body.confirmDeletion === true;

    // Require password confirmation for account deletion
    if (!password || !confirmDeletion) {
      return res.status(400).json({
        success: false,
        message: 'Password and deletion confirmation are required'
      });
    }

    // Get current password hash
    const patients = await query(
      'SELECT password_hash, patient_id FROM users WHERE user_id = ? AND role = ?',
      [patientId, 'patient']
    );

    if (patients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, patients[0].password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect. Account deletion cancelled.'
      });
    }

    // Soft delete: Set is_active to 0 instead of hard delete
    // This preserves appointment history and medical records
    await run(
      `UPDATE users
       SET is_active = 0, updated_at = datetime('now')
       WHERE user_id = ?`,
      [patientId]
    );

    // Cancel all future appointments
    await run(
      `UPDATE appointments
       SET status = 'cancelled', updated_at = datetime('now')
       WHERE patient_id = ? AND status = 'scheduled' AND appointment_date >= date('now')`,
      [patientId]
    );

    // Log the activity
    await run(
      `INSERT INTO activity_logs (user_id, user_role, action_type, action_description)
       VALUES (?, 'patient', 'account_deleted', 'Patient deleted their account')`,
      [patientId]
    );

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully. All future appointments have been cancelled.'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account',
      error: error.message
    });
  }
});

/**
 * POST /api/patient/reactivate
 * Reactivate a soft-deleted account (allows recovery)
 */
router.post('/reactivate', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find inactive patient account
    const patients = await query(
      `SELECT user_id, password_hash, full_name
       FROM users
       WHERE email = ? AND role = 'patient' AND is_active = 0`,
      [email]
    );

    if (patients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No inactive account found with this email'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, patients[0].password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Reactivate account
    await run(
      `UPDATE users
       SET is_active = 1, updated_at = datetime('now')
       WHERE user_id = ?`,
      [patients[0].user_id]
    );

    // Log the activity
    await run(
      `INSERT INTO activity_logs (user_id, user_role, action_type, action_description)
       VALUES (?, 'patient', 'account_reactivated', 'Patient reactivated their account')`,
      [patients[0].user_id]
    );

    res.status(200).json({
      success: true,
      message: 'Account reactivated successfully',
      data: {
        fullName: patients[0].full_name
      }
    });

  } catch (error) {
    console.error('Reactivate account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reactivating account',
      error: error.message
    });
  }
});

export default router;
