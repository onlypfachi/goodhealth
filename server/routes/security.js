import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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
// Helper: Generate 2FA backup codes
// ================================================================
function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code.match(/.{1,4}/g).join('-')); // Format: XXXX-XXXX
  }
  return codes;
}

// ================================================================
// Helper: Generate 2FA secret (simple implementation)
// ================================================================
function generate2FASecret() {
  return crypto.randomBytes(20).toString('base64');
}

// ================================================================
// POST /api/security/change-password - Change password
// ================================================================
router.post(
  '/change-password',
  verifyStaffToken,
  [
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('confirm_password').custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
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

      const userId = req.user.id;
      const { current_password, new_password } = req.body;

      // Get current password hash
      const [user] = await query(
        'SELECT password_hash FROM users WHERE user_id = ?',
        [userId]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
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

      // Update password
      await query(
        `UPDATE users
         SET password_hash = ?,
             last_password_change = datetime('now')
         WHERE user_id = ?`,
        [hashedPassword, userId]
      );

      // Log activity
      await logActivity(
        userId,
        req.user.role,
        'password_change',
        'Password changed successfully',
        req.ip
      );

      res.json({
        success: true,
        message: 'Password changed successfully. Please use your new password at next login.'
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

// ================================================================
// GET /api/security/2fa/status - Get 2FA status
// ================================================================
router.get('/2fa/status', verifyStaffToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [user] = await query(
      'SELECT two_factor_enabled, two_factor_secret FROM users WHERE user_id = ?',
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
      data: {
        enabled: Boolean(user.two_factor_enabled),
        has_secret: Boolean(user.two_factor_secret)
      }
    });

  } catch (error) {
    console.error('Error fetching 2FA status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch 2FA status',
      error: error.message
    });
  }
});

// ================================================================
// POST /api/security/2fa/enable - Enable 2FA
// ================================================================
router.post(
  '/2fa/enable',
  verifyStaffToken,
  [
    body('password').notEmpty().withMessage('Password is required for 2FA setup')
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

      const userId = req.user.id;
      const { password } = req.body;

      // Verify password
      const [user] = await query(
        'SELECT password_hash, two_factor_enabled FROM users WHERE user_id = ?',
        [userId]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is already enabled'
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      // Generate 2FA secret and backup codes
      const secret = generate2FASecret();
      const backupCodes = generateBackupCodes(8);

      // Update user
      await query(
        `UPDATE users
         SET two_factor_enabled = TRUE,
             two_factor_secret = ?,
             backup_codes = ?
         WHERE user_id = ?`,
        [secret, JSON.stringify(backupCodes), userId]
      );

      // Log activity
      await logActivity(
        userId,
        req.user.role,
        '2fa_enable',
        'Two-factor authentication enabled',
        req.ip
      );

      res.json({
        success: true,
        message: '2FA enabled successfully',
        data: {
          secret,
          backup_codes: backupCodes
        }
      });

    } catch (error) {
      console.error('Error enabling 2FA:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to enable 2FA',
        error: error.message
      });
    }
  }
);

// ================================================================
// POST /api/security/2fa/disable - Disable 2FA
// ================================================================
router.post(
  '/2fa/disable',
  verifyStaffToken,
  [
    body('password').notEmpty().withMessage('Password is required to disable 2FA')
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

      const userId = req.user.id;
      const { password } = req.body;

      // Verify password
      const [user] = await query(
        'SELECT password_hash, two_factor_enabled FROM users WHERE user_id = ?',
        [userId]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.two_factor_enabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is not enabled'
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      // Disable 2FA
      await query(
        `UPDATE users
         SET two_factor_enabled = FALSE,
             two_factor_secret = NULL,
             backup_codes = NULL
         WHERE user_id = ?`,
        [userId]
      );

      // Log activity
      await logActivity(
        userId,
        req.user.role,
        '2fa_disable',
        'Two-factor authentication disabled',
        req.ip
      );

      res.json({
        success: true,
        message: '2FA disabled successfully'
      });

    } catch (error) {
      console.error('Error disabling 2FA:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disable 2FA',
        error: error.message
      });
    }
  }
);

// ================================================================
// GET /api/security/2fa/backup-codes - Get new backup codes
// ================================================================
router.get('/2fa/backup-codes', verifyStaffToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [user] = await query(
      'SELECT two_factor_enabled, backup_codes FROM users WHERE user_id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.two_factor_enabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled'
      });
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes(8);

    // Update backup codes
    await query(
      'UPDATE users SET backup_codes = ? WHERE user_id = ?',
      [JSON.stringify(backupCodes), userId]
    );

    res.json({
      success: true,
      data: {
        backup_codes: backupCodes
      }
    });

  } catch (error) {
    console.error('Error generating backup codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate backup codes',
      error: error.message
    });
  }
});

export default router;
