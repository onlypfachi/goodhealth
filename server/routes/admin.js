import express from 'express';
import { verifyStaffToken } from '../middleware/auth.js';
import { requireAdmin, checkPermission } from '../middleware/rbac.js';

const router = express.Router();

// Apply staff token verification and admin role to all routes
router.use(verifyStaffToken);
router.use(requireAdmin);

/**
 * GET /api/admin/dashboard
 * Get admin dashboard statistics
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Mock dashboard data
    const dashboardData = {
      totalPatients: 150,
      totalDoctors: 25,
      totalAppointments: 320,
      pendingAppointments: 45,
      todayAppointments: 12,
      stats: {
        thisMonth: {
          newPatients: 23,
          completedAppointments: 89,
          revenue: 45000
        },
        lastMonth: {
          newPatients: 19,
          completedAppointments: 76,
          revenue: 38000
        }
      }
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/users
 * Get all users (patients, doctors, admins)
 */
router.get('/users', checkPermission('view_all_users'), async (req, res) => {
  try {
    const { type } = req.query; // Filter by user type

    // Mock data - replace with database query
    const users = {
      patients: [],
      doctors: [],
      admins: []
    };

    if (type && users[type]) {
      return res.status(200).json({
        success: true,
        data: users[type]
      });
    }

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/users
 * Create new user (patient, doctor, or admin)
 */
router.post('/users', checkPermission('create_user'), async (req, res) => {
  try {
    const { userType, email, name, ...otherData } = req.body;

    // Validation
    if (!['patient', 'doctor', 'admin'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type'
      });
    }

    // Create user logic here (integrate with auth routes)

    res.status(201).json({
      success: true,
      message: `${userType} created successfully`
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update user details
 */
router.put('/users/:id', checkPermission('edit_user'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Update user logic here

    res.status(200).json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete user
 */
router.delete('/users/:id', checkPermission('delete_user'), async (req, res) => {
  try {
    const { id } = req.params;

    // Delete user logic here

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/analytics
 * Get system analytics
 */
router.get('/analytics', checkPermission('view_analytics'), async (req, res) => {
  try {
    const analytics = {
      appointments: {
        total: 320,
        pending: 45,
        completed: 250,
        cancelled: 25
      },
      patients: {
        total: 150,
        active: 120,
        inactive: 30
      },
      revenue: {
        today: 5000,
        thisWeek: 25000,
        thisMonth: 45000,
        thisYear: 540000
      }
    };

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/settings
 * Update system settings
 */
router.put('/settings', checkPermission('system_settings'), async (req, res) => {
  try {
    const settings = req.body;

    // Update settings logic here

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
      error: error.message
    });
  }
});

export default router;
