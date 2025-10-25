import bcrypt from 'bcryptjs';
import { query, run } from './config/database.js';

/**
 * Seed Test Data Script
 * Creates realistic test data for testing the admin dashboard
 */

async function seedTestData() {
  console.log('🌱 Seeding test data...\n');

  try {
    // 1. Create test patients
    console.log('📝 Creating test patients...');
    const patients = [
      { email: 'john.doe@gmail.com', name: 'John Doe', phone: '555-0101', gender: 'male' },
      { email: 'jane.smith@gmail.com', name: 'Jane Smith', phone: '555-0102', gender: 'female' },
      { email: 'bob.wilson@gmail.com', name: 'Bob Wilson', phone: '555-0103', gender: 'male' },
      { email: 'alice.brown@gmail.com', name: 'Alice Brown', phone: '555-0104', gender: 'female' },
      { email: 'charlie.davis@gmail.com', name: 'Charlie Davis', phone: '555-0105', gender: 'male' },
      { email: 'emma.johnson@gmail.com', name: 'Emma Johnson', phone: '555-0106', gender: 'female' },
      { email: 'david.lee@gmail.com', name: 'David Lee', phone: '555-0107', gender: 'male' },
      { email: 'sarah.white@gmail.com', name: 'Sarah White', phone: '555-0108', gender: 'female' }
    ];

    const hashedPassword = await bcrypt.hash('password123', 10);
    const patientIds = [];

    for (const patient of patients) {
      const result = await run(
        `INSERT INTO users (email, password_hash, role, full_name, phone, gender, is_active)
         VALUES (?, ?, 'patient', ?, ?, ?, TRUE)`,
        [patient.email, hashedPassword, patient.name, patient.phone, patient.gender]
      );

      const userId = result.lastID;

      // Generate and assign patient ID
      const patientId = `P${String(userId).padStart(6, '0')}`;
      await run(
        'UPDATE users SET patient_id = ? WHERE user_id = ?',
        [patientId, userId]
      );

      patientIds.push({ userId, patientId, name: patient.name });
      console.log(`  ✓ Created patient: ${patient.name} (${patientId})`);
    }

    // 2. Create test doctors
    console.log('\n👨‍⚕️ Creating test doctors...');
    const doctors = [
      { email: 'dr.anderson@gmail.com', name: 'Dr. Michael Anderson', deptId: 1 }, // Cardiology
      { email: 'dr.martinez@gmail.com', name: 'Dr. Sarah Martinez', deptId: 2 }, // Neurology
      { email: 'dr.taylor@gmail.com', name: 'Dr. James Taylor', deptId: 3 }, // Orthopedics
      { email: 'dr.nguyen@gmail.com', name: 'Dr. Lisa Nguyen', deptId: 4 }, // Pediatrics
      { email: 'dr.patel@gmail.com', name: 'Dr. Raj Patel', deptId: 5 }  // Dermatology
    ];

    const doctorIds = [];

    for (const doctor of doctors) {
      const result = await run(
        `INSERT INTO users (email, password_hash, role, full_name, phone, is_active)
         VALUES (?, ?, 'doctor', ?, '555-0200', TRUE)`,
        [doctor.email, hashedPassword, doctor.name]
      );

      const userId = result.lastID;

      // Get staff_id from trigger
      const [user] = await query('SELECT staff_id FROM users WHERE user_id = ?', [userId]);

      // Note: Doctor_Departments and Doctor_Schedules tables not in simplified schema
      // Department assignment would be handled differently in production

      doctorIds.push({ userId, staffId: user.staff_id, name: doctor.name, deptId: doctor.deptId });
      console.log(`  ✓ Created doctor: ${doctor.name} (${user.staff_id})`);
    }

    // 3. Create test appointments
    console.log('\n📅 Creating test appointments...');
    const appointmentStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    const appointmentTypes = ['Consultation', 'Follow-up', 'Check-up', 'Emergency'];

    for (let i = 0; i < 15; i++) {
      const patient = patientIds[i % patientIds.length];
      const doctor = doctorIds[i % doctorIds.length];
      const status = appointmentStatuses[i % appointmentStatuses.length];
      const type = appointmentTypes[i % appointmentTypes.length];

      // Create appointments for today, yesterday, and last week
      const daysAgo = i < 5 ? 0 : (i < 10 ? 1 : 7);
      const appointmentDate = `datetime('now', '-${daysAgo} days')`;

      const result = await run(
        `INSERT INTO appointments (
          patient_id, doctor_id, appointment_date,
          appointment_time, status, reason, created_at
        ) VALUES (?, ?, date(${appointmentDate}), '${10 + (i % 8)}:00', ?, 'Regular checkup - ${type}', ${appointmentDate})`,
        [patient.userId, doctor.userId, status]
      );

      console.log(`  ✓ Appointment ${i + 1}: ${patient.name} with ${doctor.name} - ${status}`);
    }

    // 4. Create test messages
    console.log('\n💬 Creating test messages...');
    const messages = [
      {
        from: patientIds[0].userId,
        to: doctorIds[0].userId,
        subject: 'Question about medication',
        body: 'Hi Dr. Anderson, I have a question about my blood pressure medication dosage.',
        priority: 'medium'
      },
      {
        from: patientIds[1].userId,
        to: doctorIds[1].userId,
        subject: 'Appointment rescheduling',
        body: 'Dear Dr. Martinez, I need to reschedule my appointment next week.',
        priority: 'low'
      },
      {
        from: patientIds[2].userId,
        to: doctorIds[2].userId,
        subject: 'Lab results inquiry',
        body: 'Dr. Taylor, could you please check on my recent lab results?',
        priority: 'high'
      },
      {
        from: doctorIds[3].userId,
        to: patientIds[3].userId,
        subject: 'Follow-up required',
        body: 'Hi Alice, please schedule a follow-up appointment for next week.',
        priority: 'medium'
      },
      {
        from: patientIds[4].userId,
        to: doctorIds[4].userId,
        subject: 'Prescription refill',
        body: 'Dr. Patel, I need a prescription refill for my skin medication.',
        priority: 'medium'
      }
    ];

    for (const msg of messages) {
      // Get sender info
      const [sender] = await query('SELECT full_name, role FROM users WHERE user_id = ?', [msg.from]);

      await run(
        `INSERT INTO messages (
          sender_id, sender_name, sender_role, recipient_id,
          subject, content, priority, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'unread', datetime('now'))`,
        [msg.from, sender.full_name, sender.role, msg.to, msg.subject, msg.body, msg.priority]
      );
      console.log(`  ✓ Message created: ${msg.subject}`);
    }

    // 5. Create activity logs
    console.log('\n📊 Creating activity logs...');
    const activities = [
      'User login',
      'Appointment created',
      'Patient profile updated',
      'Message sent',
      'Appointment cancelled',
      'Doctor schedule updated'
    ];

    // Note: Activity_Logs table may not exist in simplified schema
    // Skipping activity logs for now
    console.log(`  ℹ  Skipped activity logs (table not in current schema)`);

    // Summary
    console.log('\n✅ Test data seeding completed!\n');
    console.log('📊 Summary:');
    console.log(`  - Patients: ${patientIds.length}`);
    console.log(`  - Doctors: ${doctorIds.length}`);
    console.log(`  - Appointments: 15`);
    console.log(`  - Messages: ${messages.length}\n`);

    console.log('🔐 Test Login Credentials:');
    console.log('  Admin:');
    console.log('    Email: admin@gmail.com');
    console.log('    Password: admin123');
    console.log('    Staff ID: EMP0001\n');
    console.log('  Patient (example):');
    console.log('    Email: john.doe@gmail.com');
    console.log('    Password: password123');
    console.log(`    Patient ID: ${patientIds[0].patientId}\n`);
    console.log('  Doctor (example):');
    console.log('    Email: dr.anderson@gmail.com');
    console.log('    Password: password123');
    console.log(`    Staff ID: ${doctorIds[0].staffId}\n`);

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  }
}

// Run the seed script
seedTestData()
  .then(() => {
    console.log('✨ Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
