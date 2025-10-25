import express from 'express';
import { query, run } from '../config/database.js';
import { verifyStaffToken } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Apply staff authentication to all message routes
router.use(verifyStaffToken);

/**
 * GET /api/messages
 * Get all messages for admin (with optional filters)
 */
router.get('/', async (req, res) => {
  try {
    const { priority, status, search } = req.query;

    let sql = `
      SELECT
        m.message_id,
        m.sender_id,
        m.sender_name,
        m.sender_role,
        m.subject,
        m.content,
        m.priority,
        m.status,
        m.created_at,
        m.read_at,
        u.staff_id as sender_staff_id,
        u.patient_id as sender_patient_id,
        GROUP_CONCAT(DISTINCT d.name) as sender_departments
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.user_id
      LEFT JOIN doctor_departments dd ON u.user_id = dd.user_id
      LEFT JOIN departments d ON dd.department_id = d.department_id
      WHERE 1=1
    `;

    const params = [];

    // Filter by priority
    if (priority && priority !== 'all') {
      sql += ' AND m.priority = ?';
      params.push(priority);
    }

    // Filter by status
    if (status && status !== 'all') {
      sql += ' AND m.status = ?';
      params.push(status);
    }

    // Search by sender name or subject
    if (search) {
      sql += ' AND (m.sender_name LIKE ? OR m.subject LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' GROUP BY m.message_id ORDER BY m.created_at DESC';

    const messages = await query(sql, params);

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message
    });
  }
});

/**
 * GET /api/messages/unread-count
 * Get count of unread messages
 */
router.get('/unread-count', async (req, res) => {
  try {
    const [result] = await query(
      `SELECT COUNT(*) as count
       FROM messages
       WHERE status = 'unread'`
    );

    res.json({
      success: true,
      count: result.count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
      error: error.message
    });
  }
});

/**
 * PUT /api/messages/mark-all-read
 * Mark all unread messages as read
 */
router.put('/mark-all-read', async (req, res) => {
  try {
    console.log('📬 Marking all messages as read...');

    const result = await run(
      `UPDATE messages
       SET status = 'read', read_at = datetime('now')
       WHERE status = 'unread'`
    );

    console.log(`✅ Marked ${result.affectedRows} message(s) as read`);

    res.json({
      success: true,
      message: `Marked ${result.affectedRows} message(s) as read`,
      count: result.affectedRows
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking messages as read',
      error: error.message
    });
  }
});

/**
 * PUT /api/messages/:id/mark-read
 * Mark a specific message as read
 */
router.put('/:id/mark-read', async (req, res) => {
  try {
    const { id } = req.params;

    await run(
      `UPDATE messages
       SET status = 'read', read_at = datetime('now')
       WHERE message_id = ? AND status = 'unread'`,
      [id]
    );

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking message as read',
      error: error.message
    });
  }
});

/**
 * GET /api/messages/:id
 * Get a specific message by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [message] = await query(
      `SELECT
        m.*,
        u.staff_id as sender_staff_id,
        u.email as sender_email,
        GROUP_CONCAT(DISTINCT d.name) as sender_departments
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.user_id
       LEFT JOIN doctor_departments dd ON u.user_id = dd.user_id
       LEFT JOIN departments d ON dd.department_id = d.department_id
       WHERE m.message_id = ?
       GROUP BY m.message_id`,
      [id]
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching message',
      error: error.message
    });
  }
});

/**
 * POST /api/messages
 * Create a new message (for doctors to send to admin)
 */
router.post(
  '/',
  [
    body('subject').notEmpty().withMessage('Subject is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('priority').isIn(['normal', 'urgent']).withMessage('Priority must be normal or urgent')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    try {
      const { subject, content, priority = 'normal' } = req.body;
      const senderId = req.user.id || req.user.userId;

      // Get sender info
      const [sender] = await query(
        'SELECT full_name, role FROM users WHERE user_id = ?',
        [senderId]
      );

      if (!sender) {
        return res.status(404).json({
          success: false,
          message: 'Sender not found'
        });
      }

      // Insert message
      const result = await run(
        `INSERT INTO messages (sender_id, sender_name, sender_role, subject, content, priority, status)
         VALUES (?, ?, ?, ?, ?, ?, 'unread')`,
        [senderId, sender.full_name, sender.role, subject, content, priority]
      );

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: {
          messageId: result.lastID
        }
      });
    } catch (error) {
      console.error('Create message error:', error);
      res.status(500).json({
        success: false,
        message: 'Error sending message',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/messages/:id
 * Delete a message
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await run('DELETE FROM messages WHERE message_id = ?', [id]);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: error.message
    });
  }
});

export default router;
