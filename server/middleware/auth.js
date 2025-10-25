import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

/**
 * Middleware to verify patient JWT tokens
 */
export const verifyPatientToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, config.jwt.patientSecret);

    // Ensure the token is for a patient
    if (decoded.userType !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token type. Patient access required.'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
      error: error.message
    });
  }
};

/**
 * Middleware to verify staff JWT tokens (doctors and admins)
 */
export const verifyStaffToken = (req, res, next) => {
  try {
    // Log for debugging
    console.log('🔐 Verifying staff token...');
    console.log('Authorization header:', req.headers.authorization ? 'Present' : 'Missing');

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.log('❌ No authorization header');
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        error: 'No authorization header'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.log('❌ Invalid authorization format');
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid authorization format.',
        error: 'Authorization must start with "Bearer "'
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      console.log('❌ Token is empty');
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        error: 'Token is empty'
      });
    }

    console.log('🔑 Token found, verifying...');
    const decoded = jwt.verify(token, config.jwt.staffSecret);
    console.log('✅ Token verified. User type:', decoded.userType, '| Role:', decoded.role);

    // Ensure the token is for staff (doctor, admin, or superadmin)
    if (!['doctor', 'admin', 'superadmin'].includes(decoded.userType) &&
        !['doctor', 'admin', 'superadmin'].includes(decoded.role)) {
      console.log('❌ Invalid user type/role:', decoded.userType, decoded.role);
      return res.status(403).json({
        success: false,
        message: 'Invalid token type. Staff access required.',
        error: `User type: ${decoded.userType}, Role: ${decoded.role}`
      });
    }

    req.user = decoded;
    console.log('✅ Staff authentication successful for user:', decoded.userId);
    next();
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
        error: 'Token expired'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.',
        error: error.message
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
      error: error.message
    });
  }
};

/**
 * Generate JWT token for patients
 */
export const generatePatientToken = (userId, email, patientId) => {
  return jwt.sign(
    {
      userId,
      email,
      patientId,
      userType: 'patient'
    },
    config.jwt.patientSecret,
    { expiresIn: config.jwt.expiresIn }
  );
};

/**
 * Generate JWT token for staff (doctors/admins)
 */
export const generateStaffToken = (userId, email, staffId, role) => {
  return jwt.sign(
    {
      userId,
      email,
      staffId,
      userType: role, // 'doctor' or 'admin'
      role
    },
    config.jwt.staffSecret,
    { expiresIn: config.jwt.expiresIn }
  );
};
