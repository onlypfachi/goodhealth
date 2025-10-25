import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/config.js';
import { logIPAccess } from './middleware/ipRestriction.js';
import { testConnection } from './config/database.js';

// Import routes
import patientAuthRoutes from './routes/patient.auth.js';
import staffAuthRoutes from './routes/staff.auth.js';
import appointmentRoutes from './routes/appointments.js';
import adminRoutes from './routes/admin.js';
import emailRoutes from './routes/email.js';
import patientIdsRoutes from './routes/patientIds.js';
import dashboardRoutes from './routes/dashboard.js';
import patientsRoutes from './routes/patients.js';
import doctorsRoutes from './routes/doctors.js';
import adminsRoutes from './routes/admins.js';
import notificationsRoutes from './routes/notifications.js';
import searchRoutes from './routes/search.js';
import messagesRoutes from './routes/messages.js';
import profileRoutes from './routes/profile.js';
import securityRoutes from './routes/security.js';
import activitySummaryRoutes from './routes/activity-summary.js';
import queueRoutes from './routes/queue.js';
import doctorAppointmentsRoutes from './routes/doctor-appointments.js';
import reportsRoutes from './routes/reports.js';
import queueTrackingRoutes from './routes/queue-tracking.js';
import patientProfileRoutes from './routes/patient-profile.js';
import queueManagementRoutes from './routes/queue-management.js';
import departmentsRoutes from './routes/departments.js';
import rescheduleRoutes from './routes/reschedule.js';

const app = express();

// ===== Security Middleware =====
app.use(helmet()); // Security headers
app.use(cors(config.cors)); // CORS configuration

// Rate limiting for public endpoints
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter); // Apply rate limiting to all API routes

// ===== Logging =====
app.use(morgan('dev')); // HTTP request logging
app.use(logIPAccess); // Custom IP access logging

// ===== Body Parsing =====
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// ===== Health Check =====
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Hospital Booking System API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// ===== API Routes =====

// Patient Authentication (Public - with rate limiting)
app.use('/api/auth/patient', patientAuthRoutes);

// Staff Authentication (IP Restricted - only hospital network)
app.use('/api/auth/staff', staffAuthRoutes);

// Appointments
app.use('/api/appointments', appointmentRoutes);
app.use('/api/appointments', rescheduleRoutes); // Reschedule endpoint

// Admin routes (requires admin authentication)
app.use('/api/admin', adminRoutes);

// Email routes (for consultation calls and rescheduling)
app.use('/api/email', emailRoutes);

// Patient ID generation and management routes
app.use('/api/patient-ids', patientIdsRoutes);

// Dashboard routes (requires staff authentication)
app.use('/api/dashboard', dashboardRoutes);

// Patient management routes (requires staff authentication)
app.use('/api/patients', patientsRoutes);

// Doctor management routes (requires staff authentication)
app.use('/api/doctors', doctorsRoutes);

// Admin management routes (requires staff authentication)
app.use('/api/admins', adminsRoutes);

// Notifications routes (requires staff authentication)
app.use('/api/notifications', notificationsRoutes);

// Global search routes (requires staff authentication)
app.use('/api/search', searchRoutes);

// Messages routes (requires staff authentication)
app.use('/api/messages', messagesRoutes);

// Profile management routes (requires staff authentication)
app.use('/api/profile', profileRoutes);

// Security routes - password change & 2FA (requires staff authentication)
app.use('/api/security', securityRoutes);

// Activity summary routes (requires staff authentication)
app.use('/api/activity-summary', activitySummaryRoutes);

// Queue management routes (requires staff authentication)
app.use('/api/queue', queueRoutes);

// Queue tracking routes (requires authentication)
app.use('/api/queue-tracking', queueTrackingRoutes);

// Doctor appointments routes (requires staff authentication)
app.use('/api/doctor', doctorAppointmentsRoutes);

// Medical reports routes
app.use('/api/reports', reportsRoutes);

// Patient profile routes (requires patient authentication)
app.use('/api/patient', patientProfileRoutes);

// Queue management routes (for doctor actions and patient queue status)
app.use('/api/queue-mgmt', queueManagementRoutes);

// Departments routes (public endpoints for patient booking)
app.use('/api/departments', departmentsRoutes);

// ===== 404 Handler =====
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// ===== Error Handler =====
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  });
});

// ===== Start Server =====
// Port can be configured via .env file (default: 5000)
let PORT = config.port;

/**
 * Try to start the server on the specified port.
 * If port is busy, automatically try alternative ports.
 */
async function startServer(port = PORT, retries = 5) {
  // Test database connection first
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('❌ Failed to connect to database. Server starting without database.');
    console.log('⚠️  To fix: Install MySQL and configure .env file');
  }

  // Create server instance
  const server = app.listen(port)
    .on('listening', () => {
      // Server successfully started
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                                                            ║');
      console.log('║   🏥  GOOD HEALTH HOSPITAL - BACKEND SERVER               ║');
      console.log('║                                                            ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log(`🚀 Server running on: http://localhost:${port}`);

      // Show warning if using alternative port
      if (port !== PORT) {
        console.log(`⚠️  Note: Port ${PORT} was busy, using port ${port} instead`);
      }

      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`📊 Database: ${dbConnected ? 'Connected' : 'Not Connected'}`);
      console.log('');
      console.log('📍 Available Endpoints:');
      console.log('   - GET  /health                          (Health check)');
      console.log('   - POST /api/auth/patient/signup         (Patient registration)');
      console.log('   - POST /api/auth/patient/login          (Patient login)');
      console.log('   - POST /api/auth/staff/signup           (Staff registration - IP restricted)');
      console.log('   - POST /api/auth/staff/login            (Staff login - IP restricted)');
      console.log('   - POST /api/appointments/book           (Book appointment)');
      console.log('   - GET  /api/appointments/all            (Get all appointments - Staff only)');
      console.log('   - GET  /api/admin/dashboard             (Admin dashboard - Admin only)');
      console.log('');
      console.log('🔒 Security Features:');
      console.log('   ✓ Separate JWT tokens for patients and staff');
      console.log('   ✓ IP restriction for staff portal (hospital network only)');
      console.log('   ✓ Role-based access control (RBAC)');
      console.log('   ✓ Rate limiting on public endpoints');
      console.log('   ✓ Helmet security headers');
      console.log('');
      console.log('💡 Press Ctrl+C to stop the server');
      console.log('');
    })
    .on('error', (err) => {
      // Handle port already in use error
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use`);

        // If we have retries left, try the next port
        if (retries > 0) {
          const nextPort = parseInt(port) + 1;
          console.log(`🔄 Trying alternative port ${nextPort}...`);
          console.log('');

          // Close the failed server and try next port
          server.close();
          startServer(nextPort, retries - 1);
        } else {
          // No more retries, show helpful error message
          console.error('');
          console.error('╔════════════════════════════════════════════════════════════╗');
          console.error('║   ❌ ERROR: Unable to start server                        ║');
          console.error('╚════════════════════════════════════════════════════════════╝');
          console.error('');
          console.error(`All ports from ${PORT} to ${port} are busy.`);
          console.error('');
          console.error('💡 Solutions:');
          console.error('   1. Stop other server instances:');
          console.error('      - Close other Command Prompt/PowerShell windows');
          console.error('      - Or run: taskkill /F /IM node.exe');
          console.error('');
          console.error('   2. Change the port in .env file:');
          console.error('      - Open: .env');
          console.error('      - Change: PORT=5000 to PORT=3000');
          console.error('');
          console.error('   3. Find and kill the process using the port:');
          console.error(`      - Run: netstat -ano | findstr :${PORT}`);
          console.error('      - Then: taskkill /F /PID <process_id>');
          console.error('');
          process.exit(1);
        }
      } else {
        // Handle other errors
        console.error('❌ Server error:', err.message);
        process.exit(1);
      }
    });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('');
    console.log('⚠️  SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('');
    console.log('⚠️  SIGINT received. Shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
}

// Start the server
startServer();

export default app;
