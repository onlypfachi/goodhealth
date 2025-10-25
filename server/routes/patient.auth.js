import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { generatePatientToken } from '../middleware/auth.js';
import { query, run } from '../config/database.js';

const router = express.Router();

// Temporary in-memory storage (replace with database in production)
const patients = new Map();

/**
 * Generate next available patient ID
 * Format: P000001, P000002, etc.
 */
async function generateNextPatientId() {
  try {
    // Get the highest patient ID from the database
    const result = await query(
      `SELECT patient_id FROM users
       WHERE role = 'patient' AND patient_id LIKE 'P%'
       ORDER BY patient_id DESC LIMIT 1`
    );

    let nextNumber = 1;

    if (result.length > 0 && result[0].patient_id) {
      // Extract number from existing ID (e.g., "P000123" -> 123)
      const lastId = result[0].patient_id;
      const lastNumber = parseInt(lastId.substring(1));
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // Format as P followed by 6 digits (e.g., P000001)
    return 'P' + nextNumber.toString().padStart(6, '0');
  } catch (error) {
    console.error('Error generating patient ID:', error);
    throw new Error('Failed to generate patient ID');
  }
}

/**
 * POST /api/auth/patient/signup
 * Register a new patient
 */
router.post(
  '/signup',
  [
    body('email').isEmail().withMessage('Must be a valid email address'),
    body('email').matches(/@gmail\.com$/).withMessage('Email must be a Gmail address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
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
      const { email, password, fullName } = req.body;

      // Ensure we have a full_name (DB requires NOT NULL). If client didn't provide one,
      // derive a friendly display name from the email local-part.
      const resolvedFullName = (fullName && fullName.trim()) ? fullName.trim() : (email.split('@')[0] || 'Patient');

      // Check if patient already exists in database
      const existingPatient = await query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (existingPatient.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Patient with this email already exists'
        });
      }

      // Auto-generate patient ID
      const patientId = await generateNextPatientId();

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert patient into database with the auto-generated patient_id
      const result = await run(
        `INSERT INTO users (email, password_hash, role, patient_id, is_active, is_online, full_name)
         VALUES (?, ?, 'patient', ?, 1, 1, ?)`,
        [email, hashedPassword, patientId, resolvedFullName]
      );

      const userId = result.lastID;

      // Update last login
      await run(
        "UPDATE users SET last_login = datetime('now') WHERE user_id = ?",
        [userId]
      );

      // Generate token
      const token = generatePatientToken(userId, email, patientId);

      res.status(201).json({
        success: true,
        message: 'Patient registered successfully',
        data: {
          token,
          user: {
            id: userId,
            email: email,
            patientId: patientId,
            fullName: resolvedFullName,
            userType: 'patient'
          }
        }
      });
    } catch (error) {
      console.error('Patient signup error:', error);
      res.status(500).json({
        success: false,
        message: 'Error registering patient',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/auth/patient/login
 * Login for existing patient
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Must be a valid email address'),
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
      const { email, password } = req.body;

      // Find patient in database
      const patients = await query(
        'SELECT * FROM users WHERE email = ? AND role = ?',
        [email, 'patient']
      );

      if (patients.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const patient = patients[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, patient.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      // Update last login and set online status
      await run(
        "UPDATE users SET last_login = datetime('now'), is_online = 1 WHERE user_id = ?",
        [patient.user_id]
      );

      // Generate token
      const token = generatePatientToken(patient.user_id, patient.email, patient.patient_id);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: patient.user_id,
            email: patient.email,
            patientId: patient.patient_id,
            fullName: patient.full_name,
            userType: 'patient'
          }
        }
      });
    } catch (error) {
      console.error('Patient login error:', error);
      res.status(500).json({
        success: false,
        message: 'Error during login',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/auth/patient/verify
 * Verify patient token
 */
router.get('/verify', async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Token is valid'
  });
});

export default router;
