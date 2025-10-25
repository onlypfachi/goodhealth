import { query, run, close } from './config/database.js';

/**
 * Clear all messages, patient accounts, and doctor accounts from the database
 * This script removes:
 * - All messages (if messages table exists)
 * - All patient accounts (user_type = 'patient')
 * - All doctor accounts (role = 'doctor')
 * - All appointments (will be cleared since patients/doctors are deleted)
 */

async function clearData() {
  try {
    console.log('='.repeat(60));
    console.log('🗑️  DATABASE CLEANUP SCRIPT');
    console.log('='.repeat(60));
    console.log('⚠️  WARNING: This will delete:');
    console.log('   - All messages');
    console.log('   - All patient accounts');
    console.log('   - All doctor accounts');
    console.log('   - All appointments');
    console.log('   - Related data (queue entries, notifications, etc.)');
    console.log('='.repeat(60));

    // Check if messages table exists
    const tables = await query(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='messages'
    `);

    // Step 1: Delete all messages (if table exists)
    if (tables.length > 0) {
      console.log('\n📧 Deleting all messages...');
      const messagesResult = await run('DELETE FROM messages');
      console.log(`   ✅ Deleted ${messagesResult.changes} messages`);
    } else {
      console.log('\n📧 No messages table found (skipping)');
    }

    // Step 2: Get counts before deletion
    console.log('\n📊 Checking current data...');
    const patientCount = await query(`
      SELECT COUNT(*) as count FROM users
      WHERE role = 'patient'
    `);
    const doctorCount = await query(`
      SELECT COUNT(*) as count FROM users
      WHERE role = 'doctor'
    `);
    const appointmentCount = await query(`
      SELECT COUNT(*) as count FROM appointments
    `);

    console.log(`   - Patients: ${patientCount[0].count}`);
    console.log(`   - Doctors: ${doctorCount[0].count}`);
    console.log(`   - Appointments: ${appointmentCount[0].count}`);

    // Step 3: Delete all appointments first (due to foreign keys)
    console.log('\n📅 Deleting all appointments...');
    const appointmentsResult = await run('DELETE FROM appointments');
    console.log(`   ✅ Deleted ${appointmentsResult.changes} appointments`);

    // Step 4: Delete doctor schedules
    console.log('\n🗓️  Deleting doctor schedules...');
    const schedulesResult = await run('DELETE FROM doctor_schedules');
    console.log(`   ✅ Deleted ${schedulesResult.changes} schedule entries`);

    // Step 5: Delete doctor-department associations
    console.log('\n🏥 Deleting doctor-department associations...');
    const deptAssocResult = await run('DELETE FROM doctor_departments');
    console.log(`   ✅ Deleted ${deptAssocResult.changes} associations`);

    // Step 6: Delete all patient accounts
    console.log('\n👥 Deleting all patient accounts...');
    const patientsResult = await run(`
      DELETE FROM users WHERE role = 'patient'
    `);
    console.log(`   ✅ Deleted ${patientsResult.changes} patient accounts`);

    // Step 7: Delete all doctor accounts
    console.log('\n👨‍⚕️ Deleting all doctor accounts...');
    const doctorsResult = await run(`
      DELETE FROM users WHERE role = 'doctor'
    `);
    console.log(`   ✅ Deleted ${doctorsResult.changes} doctor accounts`);

    // Step 8: Check for any queue-related tables
    const queueTables = await query(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND (name LIKE '%queue%' OR name LIKE '%notification%')
    `);

    if (queueTables.length > 0) {
      console.log('\n🔔 Clearing queue and notification data...');
      for (const table of queueTables) {
        try {
          const result = await run(`DELETE FROM ${table.name}`);
          console.log(`   ✅ Cleared ${result.changes} entries from ${table.name}`);
        } catch (err) {
          console.log(`   ⚠️  Could not clear ${table.name}: ${err.message}`);
        }
      }
    }

    // Step 9: Verify cleanup
    console.log('\n📊 Verifying cleanup...');
    const finalPatientCount = await query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'patient'
    `);
    const finalDoctorCount = await query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'doctor'
    `);
    const finalAppointmentCount = await query(`
      SELECT COUNT(*) as count FROM appointments
    `);

    console.log(`   - Remaining Patients: ${finalPatientCount[0].count}`);
    console.log(`   - Remaining Doctors: ${finalDoctorCount[0].count}`);
    console.log(`   - Remaining Appointments: ${finalAppointmentCount[0].count}`);

    // Step 10: Check what's left in users table
    console.log('\n👤 Remaining users:');
    const remainingUsers = await query(`
      SELECT user_id, email, role, full_name
      FROM users
      ORDER BY role
    `);

    if (remainingUsers.length === 0) {
      console.log('   ℹ️  No users remaining in database');
    } else {
      for (const user of remainingUsers) {
        console.log(`   - ${user.full_name || user.email} (${user.role})`);
      }
    }

    console.log('\n='.repeat(60));
    console.log('✅ DATABASE CLEANUP COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ ERROR during cleanup:');
    console.error(error.message);
    console.error(error.stack);
  } finally {
    // Close database connection
    await close();
  }
}

// Run the cleanup
clearData();
