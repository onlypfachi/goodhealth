import express from 'express';
import { query, run } from '../config/database.js';
import { verifyStaffToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/patient-ids/generate
 * Generate new patient IDs (Admin only)
 * Body: { count: number } - number of IDs to generate (default: 1, max: 100)
 */
router.post('/generate', verifyStaffToken, async (req, res) => {
  try {
    console.log('📝 Patient ID generation request received');
    console.log('User from token:', req.user);

    const { count = 1 } = req.body;
    const adminId = req.user.id || req.user.userId;

    console.log('Requested count:', count);
    console.log('Admin ID:', adminId);

    // Validate count
    if (count < 1 || count > 100) {
      console.log('❌ Invalid count:', count);
      return res.status(400).json({
        success: false,
        message: 'Count must be between 1 and 100'
      });
    }

    // Check if user is admin
    console.log('🔍 Checking user role in database...');
    const [user] = await query(
      'SELECT user_id, role, full_name FROM users WHERE user_id = ?',
      [adminId]
    );

    console.log('User found in database:', user);

    if (!user) {
      console.log('❌ User not found in database');
      return res.status(404).json({
        success: false,
        message: 'User not found in database'
      });
    }

    if (user.role !== 'admin' && user.role !== 'superadmin') {
      console.log('❌ User is not an admin. Role:', user.role);
      return res.status(403).json({
        success: false,
        message: `Only admins can generate patient IDs. Your role: ${user.role}`
      });
    }

    console.log('✅ User verified as admin:', user.full_name);
    console.log('🔄 Starting patient ID generation...');

    const generatedIds = [];

    for (let i = 0; i < count; i++) {
      // Get the highest patient ID number from patient_ids table
      const [maxId] = await query(
        `SELECT patient_id FROM patient_ids
         ORDER BY CAST(SUBSTR(patient_id, 2) AS INTEGER) DESC
         LIMIT 1`
      );

      let nextNumber = 1;
      if (maxId && maxId.patient_id) {
        // Extract number from P000001 format
        const currentNumber = parseInt(maxId.patient_id.substring(1));
        nextNumber = currentNumber + 1;
      }

      // Format as P###### (6 digits)
      const patientId = 'P' + nextNumber.toString().padStart(6, '0');
      console.log(`Generated ID ${i + 1}/${count}:`, patientId);

      // Insert into patient_ids table
      await run(
        `INSERT INTO patient_ids (patient_id, generated_by, is_used)
         VALUES (?, ?, 0)`,
        [patientId, adminId]
      );

      generatedIds.push(patientId);
    }

    console.log('✅ Successfully generated', generatedIds.length, 'patient IDs');

    res.status(201).json({
      success: true,
      message: `Successfully generated ${count} patient ID(s)`,
      data: {
        count: generatedIds.length,
        patientIds: generatedIds
      }
    });

  } catch (error) {
    console.error('❌ Error generating patient IDs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate patient IDs',
      error: error.message
    });
  }
});

/**
 * GET /api/patient-ids/available
 * Get all available (unused) patient IDs
 */
router.get('/available', verifyStaffToken, async (req, res) => {
  try {
    const ids = await query(
      `SELECT
        p.patient_id,
        p.generated_at,
        u.full_name as generated_by_name
       FROM patient_ids p
       JOIN users u ON p.generated_by = u.user_id
       WHERE p.is_used = 0
       ORDER BY p.generated_at DESC`
    );

    res.status(200).json({
      success: true,
      data: {
        count: ids.length,
        availableIds: ids
      }
    });

  } catch (error) {
    console.error('Error fetching available IDs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available patient IDs',
      error: error.message
    });
  }
});

/**
 * GET /api/patient-ids/used
 * Get all used patient IDs
 */
router.get('/used', verifyStaffToken, async (req, res) => {
  try {
    const ids = await query(
      `SELECT
        p.patient_id,
        p.generated_at,
        p.used_at,
        u1.full_name as generated_by_name,
        u2.full_name as used_by_name,
        u2.email as user_email
       FROM patient_ids p
       JOIN users u1 ON p.generated_by = u1.user_id
       LEFT JOIN users u2 ON p.used_by = u2.user_id
       WHERE p.is_used = 1
       ORDER BY p.used_at DESC`
    );

    res.status(200).json({
      success: true,
      data: {
        count: ids.length,
        usedIds: ids
      }
    });

  } catch (error) {
    console.error('Error fetching used IDs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch used patient IDs',
      error: error.message
    });
  }
});

/**
 * POST /api/patient-ids/validate
 * Validate if a patient ID is available for use
 * Body: { patientId: string }
 */
router.post('/validate', async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }

    // Check if ID exists and is not used
    const [result] = await query(
      'SELECT is_used FROM patient_ids WHERE patient_id = ?',
      [patientId]
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Invalid patient ID. This ID was not generated by the system.',
        valid: false
      });
    }

    if (result.is_used === 1) {
      return res.status(400).json({
        success: false,
        message: 'This patient ID has already been used',
        valid: false
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patient ID is valid and available',
      valid: true
    });

  } catch (error) {
    console.error('Error validating patient ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate patient ID',
      error: error.message
    });
  }
});

/**
 * PUT /api/patient-ids/mark-used
 * Mark a patient ID as used (called after successful signup)
 * Body: { patientId: string, userId: number }
 */
router.put('/mark-used', async (req, res) => {
  try {
    const { patientId, userId } = req.body;

    if (!patientId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID and User ID are required'
      });
    }

    // Update the patient_ids table
    const result = await run(
      `UPDATE patient_ids
       SET is_used = 1, used_by = ?, used_at = datetime('now')
       WHERE patient_id = ? AND is_used = 0`,
      [userId, patientId]
    );

    if (result.changes === 0) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID not found or already used'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patient ID marked as used successfully'
    });

  } catch (error) {
    console.error('Error marking patient ID as used:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark patient ID as used',
      error: error.message
    });
  }
});

/**
 * DELETE /api/patient-ids/:patientId
 * Delete an unused patient ID (Admin only)
 */
router.delete('/:patientId', verifyStaffToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const adminId = req.user.id || req.user.userId;

    // Check if user is admin
    const [user] = await query(
      'SELECT role FROM users WHERE user_id = ?',
      [adminId]
    );

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete patient IDs'
      });
    }

    // Delete only if not used
    const result = await run(
      'DELETE FROM patient_ids WHERE patient_id = ? AND is_used = 0',
      [patientId]
    );

    if (result.changes === 0) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID not found or already used (cannot delete used IDs)'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patient ID deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting patient ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete patient ID',
      error: error.message
    });
  }
});

export default router;
