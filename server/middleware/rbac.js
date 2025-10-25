/**
 * Role-Based Access Control (RBAC) Middleware
 * Ensures users can only access resources they're authorized for
 */

/**
 * Check if user has required role
 * @param {Array|String} allowedRoles - Single role or array of allowed roles
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const userRole = req.user.userType || req.user.role;

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${userRole}`
      });
    }

    next();
  };
};

/**
 * Admin only access (includes superadmin)
 */
export const requireAdmin = requireRole(['admin', 'superadmin']);

/**
 * Doctor only access
 */
export const requireDoctor = requireRole('doctor');

/**
 * Patient only access
 */
export const requirePatient = requireRole('patient');

/**
 * Staff access (admin, superadmin, or doctor)
 */
export const requireStaff = requireRole(['admin', 'superadmin', 'doctor']);

/**
 * Check if user can access specific patient data
 * Patients can only access their own data
 * Staff can access any patient data
 */
export const canAccessPatientData = (req, res, next) => {
  const requestedPatientId = parseInt(req.params.patientId || req.body.patientId);
  const userRole = req.user.userType || req.user.role;

  // Staff can access any patient data
  if (['admin', 'superadmin', 'doctor'].includes(userRole)) {
    return next();
  }

  // Patients can only access their own data
  if (userRole === 'patient') {
    // The logged-in user's ID (from JWT token)
    // Try multiple field names since different auth systems use different names
    const loggedInUserId = req.user.userId || req.user.user_id || req.user.id;

    console.log('🔐 Patient Data Access Check:');
    console.log('   Logged-in user ID:', loggedInUserId, `(type: ${typeof loggedInUserId})`);
    console.log('   Requested patient ID:', requestedPatientId, `(type: ${typeof requestedPatientId})`);
    console.log('   Match:', loggedInUserId == requestedPatientId);

    // Compare user IDs (use == for type coercion since one might be string, other number)
    if (loggedInUserId == requestedPatientId) {
      console.log('   ✅ Access granted - user is accessing their own data');
      return next();
    }

    console.log('   ❌ Access denied - user trying to access someone else\'s data');
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own data.'
    });
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied.'
  });
};

/**
 * Permission checker for specific actions
 */
export const checkPermission = (permission) => {
  const permissions = {
    // Superadmin permissions (all admin permissions plus more)
    superadmin: [
      'view_all_users',
      'create_user',
      'edit_user',
      'delete_user',
      'view_all_appointments',
      'manage_doctors',
      'manage_patients',
      'view_analytics',
      'system_settings',
      'manage_admins'
    ],

    // Admin permissions
    admin: [
      'view_all_users',
      'create_user',
      'edit_user',
      'delete_user',
      'view_all_appointments',
      'manage_doctors',
      'manage_patients',
      'view_analytics',
      'system_settings'
    ],

    // Doctor permissions
    doctor: [
      'view_assigned_patients',
      'update_patient_records',
      'view_appointments',
      'create_prescription',
      'update_appointment_status'
    ],

    // Patient permissions
    patient: [
      'view_own_data',
      'book_appointment',
      'cancel_appointment',
      'view_own_appointments',
      'update_own_profile'
    ]
  };

  return (req, res, next) => {
    const userRole = req.user.userType || req.user.role;
    const userPermissions = permissions[userRole] || [];

    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Permission required: ${permission}`
      });
    }

    next();
  };
};
