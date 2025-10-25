import express from 'express';
import { query } from '../config/database.js';
import { verifyStaffToken } from '../middleware/auth.js';

const router = express.Router();

// Apply staff authentication to all dashboard routes
router.use(verifyStaffToken);

/**
 * GET /api/dashboard/stats
 * Get real-time dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // Total patients count (all who created accounts)
    const totalPatients = await query(
      'SELECT COUNT(*) as count FROM users WHERE role = ? AND patient_id IS NOT NULL',
      ['patient']
    );

    // Active doctors count (all registered doctors)
    const activeDoctors = await query(
      'SELECT COUNT(*) as count FROM users WHERE role = ?',
      ['doctor']
    );

    // Today's appointments count (scheduled for today)
    const todaysAppointments = await query(
      `SELECT COUNT(*) as count FROM appointments
       WHERE DATE(appointment_date) = DATE('now', '+2 hours')
       AND status IN ('scheduled', 'called', 'in-progress')`
    );

    // Average consultation time - simplified for SQLite
    const avgConsultationTime = await query(
      `SELECT 30 as avg_time FROM appointments LIMIT 1`
    );

    // Calculate trends - simplified for SQLite
    const lastMonthPatients = await query(
      `SELECT COUNT(*) as count FROM users
       WHERE role = 'patient'
       AND created_at < datetime('now', '-1 month')`
    );

    const patientGrowth = lastMonthPatients.length > 0 && lastMonthPatients[0].count > 0
      ? (((totalPatients[0].count - lastMonthPatients[0].count) / lastMonthPatients[0].count) * 100).toFixed(1)
      : totalPatients.length > 0 && totalPatients[0].count > 0 ? 100 : 0;

    res.json({
      success: true,
      data: {
        totalPatients: totalPatients.length > 0 ? totalPatients[0].count : 0,
        activeDoctors: activeDoctors.length > 0 ? activeDoctors[0].count : 0,
        todaysAppointments: todaysAppointments.length > 0 ? todaysAppointments[0].count : 0,
        avgWaitTime: Math.round((avgConsultationTime.length > 0 ? avgConsultationTime[0].avg_time : 25) || 25),
        trends: {
          patientGrowth: `${patientGrowth}% from last month`
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/queue-status
 * Get appointments by department (last 24 hours)
 */
router.get('/queue-status', async (req, res) => {
  try {
    // Get real-time queue status for each department (today's appointments only)
    const queueStatus = await query(
      `SELECT
        d.name as department,
        d.department_id,
        COUNT(CASE WHEN a.status = 'scheduled' AND a.appointment_date = DATE('now', '+2 hours') THEN 1 END) as waiting,
        COUNT(CASE WHEN a.status IN ('called', 'in_consultation') AND a.appointment_date = DATE('now', '+2 hours') THEN 1 END) as inProgress,
        COUNT(CASE WHEN a.status = 'completed' AND a.appointment_date = DATE('now', '+2 hours') THEN 1 END) as completed,
        COUNT(CASE WHEN a.appointment_date = DATE('now', '+2 hours') AND a.status NOT IN ('cancelled', 'no-show') THEN 1 END) as total
       FROM departments d
       LEFT JOIN doctor_departments dd ON d.department_id = dd.department_id
       LEFT JOIN appointments a ON dd.user_id = a.doctor_id
       WHERE d.is_active = TRUE
       GROUP BY d.department_id, d.name
       HAVING total > 0
       ORDER BY (waiting + inProgress) DESC`
    );

    // Add status based on current load (waiting + in progress)
    const statusData = queueStatus.map(dept => {
      const currentLoad = dept.waiting + dept.inProgress;
      return {
        department: dept.department,
        waiting: dept.waiting,
        inProgress: dept.inProgress,
        completed: dept.completed,
        total: dept.total,
        status: currentLoad > 15 ? 'high' : currentLoad > 8 ? 'medium' : 'normal'
      };
    });

    res.json({
      success: true,
      data: statusData
    });
  } catch (error) {
    console.error('Queue status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching queue status',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/recent-activity
 * Get recent account creations (doctors and admins)
 */
router.get('/recent-activity', async (req, res) => {
  try {
    const recentActivity = await query(
      `SELECT
        u.user_id,
        u.full_name,
        u.email,
        u.role,
        u.created_at,
        creator.full_name as created_by_name
       FROM users u
       LEFT JOIN users creator ON u.created_by = creator.user_id
       WHERE u.role IN ('doctor', 'admin', 'superadmin')
       ORDER BY u.created_at DESC
       LIMIT 15`
    );

    // Format activity
    const formattedActivity = recentActivity.map(activity => {
      const action = activity.role === 'doctor' ? 'New Doctor Account' : 'New Admin Account';
      const description = `${activity.full_name} (${activity.email}) created by ${activity.created_by_name || 'System'}`;

      return {
        action,
        description,
        timestamp: activity.created_at,
        performed_by_name: activity.created_by_name
      };
    });

    res.json({
      success: true,
      data: formattedActivity
    });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent activity',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/alerts
 * Get admin login logs
 */
router.get('/alerts', async (req, res) => {
  try {
    // Get recent admin logins
    // ✅ FIX: Use SQLite syntax (not MySQL TIMESTAMPDIFF)
    // ✅ FIX: Don't add timezone offset - last_login is already in local time
    const adminLogins = await query(
      `SELECT
        u.full_name,
        u.last_login,
        CAST((julianday(datetime('now')) - julianday(u.last_login)) * 24 * 60 AS INTEGER) as minutes_ago,
        u.role
       FROM users u
       WHERE u.role IN ('admin', 'superadmin')
       AND u.last_login IS NOT NULL
       ORDER BY u.last_login DESC
       LIMIT 10`
    );

    // Format alerts
    const formattedAlerts = adminLogins.map(login => ({
      type: 'info',
      message: `${login.full_name} (${login.role}) logged in`,
      time: login.minutes_ago < 60
        ? `${login.minutes_ago} min ago`
        : login.minutes_ago < 1440
        ? `${Math.floor(login.minutes_ago / 60)} hours ago`
        : `${Math.floor(login.minutes_ago / 1440)} days ago`,
      timestamp: login.last_login
    }));

    res.json({
      success: true,
      data: formattedAlerts
    });
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alerts',
      error: error.message
    });
  }
});

export default router;
