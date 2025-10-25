import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { generateStaffToken } from '../middleware/auth.js';
import { restrictToAllowedIPs } from '../middleware/ipRestriction.js';
import { query, run } from '../config/database.js';

const router = express.Router();

// Apply IP restriction to ALL staff auth routes
router.use(restrictToAllowedIPs);

/**
 * POST /api/auth/staff/signup
 * Register new staff member (Admin only - typically done by system admin)
 */
router.post(
  '/signup',
  [
    body('email').isEmail().withMessage('Must be a valid email address'),
    body('staffId').notEmpty().withMessage('Staff ID is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').isIn(['doctor', 'admin']).withMessage('Role must be either doctor or admin'),
    body('name').notEmpty().withMessage('Name is required')
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    try {
      const { email, staffId, password, role, name, specialization } = req.body;

      // Check if staff already exists
      const existingUser = await query(
        'SELECT * FROM users WHERE email = ? OR staff_id = ?',
        [email, staffId]
      );

      if (existingUser.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Staff member with this email or staff ID already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert into database
      const result = await query(
        `INSERT INTO users (email, password_hash, role, full_name, staff_id, phone, is_active)
         VALUES (?, ?, ?, ?, ?, NULL, TRUE)`,
        [email, hashedPassword, role, name, staffId]
      );

      // Generate token
      const token = generateStaffToken(result.insertId, email, staffId, role);

      res.status(201).json({
        success: true,
        message: 'Staff member registered successfully',
        data: {
          token,
          user: {
            id: result.insertId,
            email,
            staffId,
            role,
            name
          }
        }
      });
    } catch (error) {
      console.error('Staff signup error:', error);
      res.status(500).json({
        success: false,
        message: 'Error registering staff member',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/auth/staff/login
 * Login for staff members (doctors and admins)
 * Only accessible from hospital network
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Must be a valid email address'),
    body('staffId').notEmpty().withMessage('Staff ID is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    try {
      const { email, staffId, password } = req.body;

      // Find staff member in database
      const users = await query(
        'SELECT * FROM users WHERE email = ? AND staff_id = ? AND role IN (?, ?, ?)',
        [email, staffId, 'doctor', 'admin', 'superadmin']
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Invalid email or staff ID'
        });
      }

      const staffMember = users[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, staffMember.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      // Update last login and set online status
      await run(
        'UPDATE users SET last_login = datetime(\'now\'), is_online = 1 WHERE user_id = ?',
        [staffMember.user_id]
      );

      // Generate token
      const token = generateStaffToken(
        staffMember.user_id,
        staffMember.email,
        staffMember.staff_id,
        staffMember.role
      );

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: staffMember.user_id,
            email: staffMember.email,
            staffId: staffMember.staff_id,
            role: staffMember.role,
            name: staffMember.full_name
          }
        }
      });
    } catch (error) {
      console.error('Staff login error:', error);
      res.status(500).json({
        success: false,
        message: 'Error during login',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/auth/staff/verify
 * Verify staff token
 */
router.get('/verify', async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Token is valid'
  });
});

export default router;
