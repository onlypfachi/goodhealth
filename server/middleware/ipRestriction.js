import { config } from '../config/config.js';

/**
 * Middleware to restrict access based on IP address
 * Used for staff/admin portal to ensure only on-site access
 */
export const restrictToAllowedIPs = (req, res, next) => {
  // Get client IP address
  const clientIP = req.ip ||
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   req.headers['x-forwarded-for']?.split(',')[0].trim();

  // Normalize IP (handle IPv6 localhost)
  const normalizedIP = clientIP.replace('::ffff:', '');

  // In development, allow all IPs
  if (config.nodeEnv === 'development') {
    console.log(`[DEV MODE] IP Restriction bypassed for: ${normalizedIP}`);
    return next();
  }

  // Check if IP is in allowed list
  const isAllowed = config.allowedStaffIPs.some(allowedIP => {
    // Support for IP ranges or exact match
    return normalizedIP === allowedIP ||
           normalizedIP.startsWith(allowedIP.replace('*', ''));
  });

  if (!isAllowed) {
    console.warn(`[SECURITY] Blocked access from unauthorized IP: ${normalizedIP}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. Staff portal is only accessible from authorized hospital network.'
    });
  }

  console.log(`[SECURITY] Allowed access from IP: ${normalizedIP}`);
  next();
};

/**
 * Logging middleware for IP tracking
 */
export const logIPAccess = (req, res, next) => {
  const clientIP = req.ip ||
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   req.headers['x-forwarded-for']?.split(',')[0].trim();

  console.log(`[ACCESS LOG] ${new Date().toISOString()} - IP: ${clientIP} - Path: ${req.path} - Method: ${req.method}`);
  next();
};
