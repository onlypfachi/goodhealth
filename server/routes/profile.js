import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { verifyStaffToken } from '../middleware/auth.js';

const router = express.Router();

// ================================================================
// Helper function to log activity
// ================================================================
async function logActivity(userId, userRole, actionType, description, ipAddress) {
  try {
    await query(
      `INSERT INTO ActivityLogs (user_id, user_role, action_type, action_description, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, userRole, actionType, description, ipAddress]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// ================================================================
// GET /api/profile - Get current user's profile
// ================================================================
router.get('/', verifyStaffToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [user] = await query(
      `SELECT
        user_id,
        email,
        role,
        full_name,
        patient_id,
        staff_id,
        phone,
        address,
        date_of_birth,
        gender,
        is_active,
        two_factor_enabled,
        last_login,
        last_password_change,
        profile_updated_at,
        created_at,
        updated_at
       FROM users
       WHERE user_id = ?`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
});

// ================================================================
// PUT /api/profile - Update current user's profile
// ================================================================
router.put(
  '/',
  verifyStaffToken,
  [
    body('full_name').optional().trim().isLength({ min: 2, max: 255 }).withMessage('Full name must be between 2 and 255 characters'),
    body('phone').optional().trim().matches(/^\+?[\d\s\-()]+$/).withMessage('Invalid phone number format'),
    body('address').optional().trim(),
    body('date_of_birth').optional().isISO8601().withMessage('Invalid date format'),
    body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other')
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.userId;
      const { full_name, phone, address, date_of_birth, gender } = req.body;

      // Build update query dynamically
      const updates = [];
      const values = [];

      if (full_name !== undefined) {
        updates.push('full_name = ?');
        values.push(full_name);
      }
      if (phone !== undefined) {
        updates.push('phone = ?');
        values.push(phone);
      }
      if (address !== undefined) {
        updates.push('address = ?');
        values.push(address);
      }
      if (date_of_birth !== undefined) {
        updates.push('date_of_birth = ?');
        values.push(date_of_birth);
      }
      if (gender !== undefined) {
        updates.push('gender = ?');
        values.push(gender);
      }

      // Add profile_updated_at
      updates.push("profile_updated_at = datetime('now')");

      if (updates.length === 1) { // Only profile_updated_at
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      values.push(userId);

      // Update profile
      await query(
        `UPDATE users
         SET ${updates.join(', ')}
         WHERE user_id = ?`,
        values
      );

      // Log activity
      await logActivity(
        userId,
        req.user.role,
        'profile_update',
        `Profile updated: ${Object.keys(req.body).join(', ')}`,
        req.ip
      );

      // Fetch updated profile
      const [updatedUser] = await query(
        `SELECT
          user_id,
          email,
          role,
          full_name,
          patient_id,
          staff_id,
          phone,
          address,
          date_of_birth,
          gender,
          is_active,
          two_factor_enabled,
          last_login,
          last_password_change,
          profile_updated_at,
          created_at,
          updated_at
         FROM users
         WHERE user_id = ?`,
        [userId]
      );

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
      });

    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }
);

// ================================================================
// PUT /api/profile/email - Update email (requires password confirmation)
// ================================================================
router.put(
  '/email',
  verifyStaffToken,
  [
    body('new_email').trim().isEmail().withMessage('Invalid email format'),
    body('current_password').notEmpty().withMessage('Current password is required')
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.userId;
      const { new_email, current_password } = req.body;

      // Verify current password
      const [user] = await query(
        'SELECT password_hash FROM users WHERE user_id = ?',
        [userId]
      );

      const bcrypt = await import('bcryptjs');
      const isPasswordValid = await bcrypt.compare(current_password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      // Check if email already exists
      const [existingUser] = await query(
        'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
        [new_email, userId]
      );

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }

      // Update email
      await query(
        "UPDATE users SET email = ?, profile_updated_at = datetime('now') WHERE user_id = ?",
        [new_email, userId]
      );

      // Log activity
      await logActivity(
        userId,
        req.user.role,
        'profile_update',
        `Email changed to ${new_email}`,
        req.ip
      );

      res.json({
        success: true,
        message: 'Email updated successfully'
      });

    } catch (error) {
      console.error('Error updating email:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update email',
        error: error.message
      });
    }
  }
);

// ================================================================
// PUT /api/profile/password - Change password
// ================================================================
router.put(
  '/password',
  verifyStaffToken,
  [
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password')
      .notEmpty()
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.userId;
      const { current_password, new_password } = req.body;

      // Get current user data
      const users = await query(
        'SELECT password_hash, email FROM users WHERE user_id = ?',
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = users[0];

      // Verify current password
      const bcrypt = await import('bcryptjs');
      const isPasswordValid = await bcrypt.compare(current_password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Check if new password is same as current
      const isSamePassword = await bcrypt.compare(new_password, user.password_hash);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: 'New password must be different from current password'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(new_password, 10);

      // Update password in database
      await query(
        `UPDATE users
         SET password_hash = ?,
             last_password_change = datetime('now'),
             updated_at = datetime('now')
         WHERE user_id = ?`,
        [hashedPassword, userId]
      );

      // Also update in staff table if exists
      await query(
        `UPDATE staff
         SET password_hash = ?,
             updated_at = datetime('now')
         WHERE staff_id = ?`,
        [hashedPassword, userId]
      );

      // Log activity
      await logActivity(
        userId,
        req.user.role,
        'security_update',
        'Password changed successfully',
        req.ip
      );

      res.json({
        success: true,
        message: 'Password changed successfully. Please use your new password for future logins.'
      });

    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error.message
      });
    }
  }
);

export default router;
