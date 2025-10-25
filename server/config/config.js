import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT Secrets - Different secrets for different user types
  jwt: {
    patientSecret: process.env.JWT_PATIENT_SECRET || 'patient-secret-key-change-in-production',
    staffSecret: process.env.JWT_STAFF_SECRET || 'staff-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [
      'http://localhost:3000',  // Patient app
      'http://localhost:3001',  // Admin portal
      'http://localhost:5173',  // Vite dev server
      'http://localhost:5174',  // Vite dev server (alternate)
      'http://localhost:8080',  // Admin/Doctor dashboard
      'http://localhost:8081',  // Admin/Doctor dashboard (alternate)
      'http://localhost:8082'   // Patient dashboard (alternate)
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },

  // IP Whitelist for Admin/Staff Portal
  // In production, only allow hospital network IPs
  allowedStaffIPs: process.env.ALLOWED_STAFF_IPS
    ? process.env.ALLOWED_STAFF_IPS.split(',')
    : ['127.0.0.1', '::1', '::ffff:127.0.0.1'], // localhost for development

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: process.env.RATE_LIMIT_MAX || 1000 // Increased for development
  },

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'good_health_hospital'
  }
};
