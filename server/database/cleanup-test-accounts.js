import { query, run } from '../config/database.js';

console.log('🧹 Starting COMPLETE database cleanup...');
console.log('='.repeat(60));

(async () => {
  try {
    // Get counts before cleanup
    const patientsBefore = await query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['patient']);
    const doctorsBefore = await query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['doctor']);
    const appointmentsBefore = await query('SELECT COUNT(*) as count FROM appointments');
    const reportsBefore = await query('SELECT COUNT(*) as count FROM medical_reports');
    const messagesBefore = await query('SELECT COUNT(*) as count FROM messages');

    console.log('\n📊 Current Database State:');
    console.log(`   - Patients: ${patientsBefore[0].count}`);
    console.log(`   - Doctors: ${doctorsBefore[0].count}`);
    console.log(`   - Appointments: ${appointmentsBefore[0].count}`);
    console.log(`   - Medical Reports: ${reportsBefore[0].count}`);
    console.log(`   - Messages: ${messagesBefore[0].count}`);

    console.log('\n❌ This will DELETE EVERYTHING EXCEPT:');
    console.log('   ❌ ALL Patient accounts');
    console.log('   ❌ ALL Doctor accounts');
    console.log('   ❌ ALL Appointments');
    console.log('   ❌ ALL Medical reports');
    console.log('   ❌ ALL Messages/Chat');
    console.log('   ❌ ALL Notifications');
    console.log('   ✅ ONLY Admin login will remain');
    console.log('   ✅ Departments structure preserved');

    console.log('\n⚠️  WARNING: This will wipe ALL user data except admin!');
    console.log('='.repeat(60));

    // Delete in correct order to avoid foreign key constraints
    console.log('\n🗑️  Deleting ALL data...');

    // 1. Delete messages (chat history)
    const messagesDeleted = await run('DELETE FROM messages');
    console.log(`   ✓ Deleted ${messagesDeleted.changes} messages`);

    // 2. Delete notifications
    const notificationsDeleted = await run('DELETE FROM notifications');
    console.log(`   ✓ Deleted ${notificationsDeleted.changes || 0} notifications`);

    // 3. Delete medical reports (references appointments)
    const reportsDeleted = await run('DELETE FROM medical_reports');
    console.log(`   ✓ Deleted ${reportsDeleted.changes} medical reports`);

    // 4. Delete appointments (references patients and doctors)
    const appointmentsDeleted = await run('DELETE FROM appointments');
    console.log(`   ✓ Deleted ${appointmentsDeleted.changes} appointments`);

    // 5. Delete doctor-department associations
    const doctorDeptDeleted = await run('DELETE FROM doctor_departments WHERE user_id IN (SELECT user_id FROM users WHERE role = "doctor")');
    console.log(`   ✓ Deleted ${doctorDeptDeleted.changes} doctor-department associations`);

    // 6. Delete patient accounts
    const patientsDeleted = await run('DELETE FROM users WHERE role = ?', ['patient']);
    console.log(`   ✓ Deleted ${patientsDeleted.changes} patient accounts`);

    // 7. Delete doctor accounts
    const doctorsDeleted = await run('DELETE FROM users WHERE role = ?', ['doctor']);
    console.log(`   ✓ Deleted ${doctorsDeleted.changes} doctor accounts`);

    // Get counts after cleanup
    const patientsAfter = await query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['patient']);
    const doctorsAfter = await query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['doctor']);
    const appointmentsAfter = await query('SELECT COUNT(*) as count FROM appointments');
    const reportsAfter = await query('SELECT COUNT(*) as count FROM medical_reports');
    const messagesAfter = await query('SELECT COUNT(*) as count FROM messages');
    const adminsRemaining = await query('SELECT COUNT(*) as count FROM users WHERE role IN ("admin", "superadmin")');
    const departmentsRemaining = await query('SELECT COUNT(*) as count FROM departments');

    console.log('\n✅ COMPLETE Cleanup Done!');
    console.log('='.repeat(60));
    console.log('\n📊 Database State After Cleanup:');
    console.log(`   - Patients: ${patientsAfter[0].count} (deleted ${patientsDeleted.changes})`);
    console.log(`   - Doctors: ${doctorsAfter[0].count} (deleted ${doctorsDeleted.changes})`);
    console.log(`   - Appointments: ${appointmentsAfter[0].count} (deleted ${appointmentsDeleted.changes})`);
    console.log(`   - Medical Reports: ${reportsAfter[0].count} (deleted ${reportsDeleted.changes})`);
    console.log(`   - Messages: ${messagesAfter[0].count} (deleted ${messagesDeleted.changes})`);
    console.log(`   - Admins: ${adminsRemaining[0].count} (preserved ✅)`);
    console.log(`   - Departments: ${departmentsRemaining[0].count} (preserved ✅)`);

    console.log('\n🎉 Database is completely clean! Only admin login remains.');
    console.log('='.repeat(60));

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
})();
