import express from 'express';
import { query } from '../config/database.js';
import { verifyStaffToken } from '../middleware/auth.js';

const router = express.Router();

// Apply staff authentication
router.use(verifyStaffToken);

/**
 * GET /api/notifications/count
 * Get unread notification count
 */
router.get('/count', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Count unread notifications for the user
    const [result] = await query(
      `SELECT COUNT(*) as count FROM Notifications
       WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        count: result[0].count
      }
    });
  } catch (error) {
    console.error('Get notification count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification count',
      error: error.message
    });
  }
});

/**
 * GET /api/notifications
 * Get all notifications for user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;

    const notifications = await query(
      `SELECT * FROM Notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
});

/**
 * PUT /api/notifications/mark-read
 * Mark all notifications as read
 */
router.put('/mark-read', async (req, res) => {
  try {
    const userId = req.user.userId;

    await query(
      `UPDATE Notifications
       SET is_read = TRUE
       WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notifications as read',
      error: error.message
    });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark specific notification as read
 */
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await query(
      `UPDATE Notifications
       SET is_read = TRUE
       WHERE notification_id = ? AND user_id = ?`,
      [id, userId]
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message
    });
  }
});

export default router;
