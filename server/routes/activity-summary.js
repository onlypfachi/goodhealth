import express from 'express';
import { query } from '../config/database.js';
import { verifyStaffToken } from '../middleware/auth.js';

const router = express.Router();

// ================================================================
// GET /api/activity-summary/current - Get current month summary
// ================================================================
router.get('/current', verifyStaffToken, async (req, res) => {
  try {
    // Get current month in format 'YYYY-MM'
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [summary] = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN user_role = 'patient' AND action_type = 'account_created' THEN 1 ELSE 0 END), 0) AS new_patients,
        COALESCE(SUM(CASE WHEN user_role = 'doctor' AND action_type = 'account_created' THEN 1 ELSE 0 END), 0) AS new_doctors,
        COALESCE(SUM(CASE WHEN user_role IN ('admin', 'superadmin') AND action_type = 'account_created' THEN 1 ELSE 0 END), 0) AS new_admins,
        COALESCE(SUM(CASE WHEN action_type = 'appointment_booked' THEN 1 ELSE 0 END), 0) AS appointments_booked,
        COALESCE(SUM(CASE WHEN action_type = 'message_sent' THEN 1 ELSE 0 END), 0) AS messages_sent,
        COALESCE(SUM(CASE WHEN action_type = 'login' THEN 1 ELSE 0 END), 0) AS total_logins,
        COALESCE(SUM(CASE WHEN action_type = 'profile_update' THEN 1 ELSE 0 END), 0) AS profile_updates,
        COALESCE(SUM(CASE WHEN action_type = 'password_change' THEN 1 ELSE 0 END), 0) AS password_changes,
        COALESCE(SUM(CASE WHEN action_type = '2fa_enable' THEN 1 ELSE 0 END), 0) AS two_factor_enabled_count,
        COALESCE(SUM(CASE WHEN action_type = '2fa_disable' THEN 1 ELSE 0 END), 0) AS two_factor_disabled_count
      FROM ActivityLogs
      WHERE DATE_FORMAT(created_at, '%Y-%m') = ?`,
      [currentMonth]
    );

    res.json({
      success: true,
      month: currentMonth,
      data: summary || {
        new_patients: 0,
        new_doctors: 0,
        new_admins: 0,
        appointments_booked: 0,
        messages_sent: 0,
        total_logins: 0,
        profile_updates: 0,
        password_changes: 0,
        two_factor_enabled_count: 0,
        two_factor_disabled_count: 0
      }
    });

  } catch (error) {
    console.error('Error fetching current month summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity summary',
      error: error.message
    });
  }
});

// ================================================================
// GET /api/activity-summary/month/:month - Get specific month summary
// ================================================================
router.get('/month/:month', verifyStaffToken, async (req, res) => {
  try {
    const { month } = req.params; // Format: YYYY-MM

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month format. Use YYYY-MM format (e.g., 2025-10)'
      });
    }

    const [summary] = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN user_role = 'patient' AND action_type = 'account_created' THEN 1 ELSE 0 END), 0) AS new_patients,
        COALESCE(SUM(CASE WHEN user_role = 'doctor' AND action_type = 'account_created' THEN 1 ELSE 0 END), 0) AS new_doctors,
        COALESCE(SUM(CASE WHEN user_role IN ('admin', 'superadmin') AND action_type = 'account_created' THEN 1 ELSE 0 END), 0) AS new_admins,
        COALESCE(SUM(CASE WHEN action_type = 'appointment_booked' THEN 1 ELSE 0 END), 0) AS appointments_booked,
        COALESCE(SUM(CASE WHEN action_type = 'message_sent' THEN 1 ELSE 0 END), 0) AS messages_sent,
        COALESCE(SUM(CASE WHEN action_type = 'login' THEN 1 ELSE 0 END), 0) AS total_logins,
        COALESCE(SUM(CASE WHEN action_type = 'profile_update' THEN 1 ELSE 0 END), 0) AS profile_updates,
        COALESCE(SUM(CASE WHEN action_type = 'password_change' THEN 1 ELSE 0 END), 0) AS password_changes,
        COALESCE(SUM(CASE WHEN action_type = '2fa_enable' THEN 1 ELSE 0 END), 0) AS two_factor_enabled_count,
        COALESCE(SUM(CASE WHEN action_type = '2fa_disable' THEN 1 ELSE 0 END), 0) AS two_factor_disabled_count
      FROM ActivityLogs
      WHERE DATE_FORMAT(created_at, '%Y-%m') = ?`,
      [month]
    );

    res.json({
      success: true,
      month,
      data: summary || {
        new_patients: 0,
        new_doctors: 0,
        new_admins: 0,
        appointments_booked: 0,
        messages_sent: 0,
        total_logins: 0,
        profile_updates: 0,
        password_changes: 0,
        two_factor_enabled_count: 0,
        two_factor_disabled_count: 0
      }
    });

  } catch (error) {
    console.error('Error fetching month summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity summary',
      error: error.message
    });
  }
});

// ================================================================
// GET /api/activity-summary/history - Get last 6 months summary
// ================================================================
router.get('/history', verifyStaffToken, async (req, res) => {
  try {
    const results = await query(
      `SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        COUNT(CASE WHEN user_role = 'patient' AND action_type = 'account_created' THEN 1 END) AS new_patients,
        COUNT(CASE WHEN user_role = 'doctor' AND action_type = 'account_created' THEN 1 END) AS new_doctors,
        COUNT(CASE WHEN user_role IN ('admin', 'superadmin') AND action_type = 'account_created' THEN 1 END) AS new_admins,
        COUNT(CASE WHEN action_type = 'appointment_booked' THEN 1 END) AS appointments_booked,
        COUNT(CASE WHEN action_type = 'message_sent' THEN 1 END) AS messages_sent,
        COUNT(CASE WHEN action_type = 'login' THEN 1 END) AS total_logins,
        COUNT(CASE WHEN action_type = 'profile_update' THEN 1 END) AS profile_updates,
        COUNT(CASE WHEN action_type = 'password_change' THEN 1 END) AS password_changes
      FROM ActivityLogs
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6`
    );

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity history',
      error: error.message
    });
  }
});

// ================================================================
// GET /api/activity-summary/stats - Get overall statistics
// ================================================================
router.get('/stats', verifyStaffToken, async (req, res) => {
  try {
    // Get total counts from users table
    const [totals] = await query(`
      SELECT
        COUNT(CASE WHEN role = 'patient' THEN 1 END) AS total_patients,
        COUNT(CASE WHEN role = 'doctor' THEN 1 END) AS total_doctors,
        COUNT(CASE WHEN role IN ('admin', 'superadmin') THEN 1 END) AS total_admins,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) AS active_users,
        COUNT(CASE WHEN two_factor_enabled = 1 THEN 1 END) AS users_with_2fa
      FROM users
    `);

    // Get recent activity count (last 24 hours)
    const [recentActivity] = await query(`
      SELECT COUNT(*) AS recent_activities
      FROM ActivityLogs
      WHERE created_at >= DATE_SUB(datetime('now'), INTERVAL 24 HOUR)
    `);

    // Get most active users this month
    const activeUsers = await query(`
      SELECT
        AL.user_id,
        u.full_name,
        u.role,
        COUNT(*) AS activity_count
      FROM ActivityLogs AL
      JOIN users u ON AL.user_id = u.user_id
      WHERE DATE_FORMAT(AL.created_at, '%Y-%m') = DATE_FORMAT(datetime('now'), '%Y-%m')
      GROUP BY AL.user_id, u.full_name, u.role
      ORDER BY activity_count DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        totals: totals || {},
        recent_activity: recentActivity?.recent_activities || 0,
        most_active_users: activeUsers || []
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

export default router;
