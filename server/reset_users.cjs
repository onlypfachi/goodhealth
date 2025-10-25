const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'hospital.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Starting database user cleanup...\n');

// Helper functions
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
}

function getQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function resetDatabase() {
  try {
    // Begin transaction
    await runQuery('BEGIN TRANSACTION');

    // Get counts before deletion
    const beforePatients = await getQuery('SELECT COUNT(*) as count FROM users WHERE role = ?', ['patient']);
    const beforeDoctors = await getQuery('SELECT COUNT(*) as count FROM users WHERE role = ?', ['doctor']);
    const beforeAppointments = await getQuery('SELECT COUNT(*) as count FROM appointments');
    const beforeReports = await getQuery('SELECT COUNT(*) as count FROM medical_reports');
    const beforeNotifications = await getQuery('SELECT COUNT(*) as count FROM notifications');

    console.log('📊 Current database status:');
    console.log(`   - Patients: ${beforePatients.count}`);
    console.log(`   - Doctors: ${beforeDoctors.count}`);
    console.log(`   - Appointments: ${beforeAppointments.count}`);
    console.log(`   - Medical Reports: ${beforeReports.count}`);
    console.log(`   - Notifications: ${beforeNotifications.count}\n`);

    // Delete notifications
    console.log('🗑️  Deleting notifications...');
    const deletedNotifications = await runQuery('DELETE FROM notifications');
    console.log(`   ✓ Deleted ${deletedNotifications.changes} notifications\n`);

    // Delete medical reports
    console.log('🗑️  Deleting medical reports...');
    const deletedReports = await runQuery('DELETE FROM medical_reports');
    console.log(`   ✓ Deleted ${deletedReports.changes} medical reports\n`);

    // Delete appointments
    console.log('🗑️  Deleting appointments...');
    const deletedAppointments = await runQuery('DELETE FROM appointments');
    console.log(`   ✓ Deleted ${deletedAppointments.changes} appointments\n`);

    // Delete doctor_departments relationships
    console.log('🗑️  Deleting doctor-department relationships...');
    const deletedDoctorDepts = await runQuery('DELETE FROM doctor_departments');
    console.log(`   ✓ Deleted ${deletedDoctorDepts.changes} doctor-department relationships\n`);

    // Delete patient accounts
    console.log('🗑️  Deleting patient accounts...');
    const deletedPatients = await runQuery('DELETE FROM users WHERE role = ?', ['patient']);
    console.log(`   ✓ Deleted ${deletedPatients.changes} patient accounts\n`);

    // Delete doctor accounts
    console.log('🗑️  Deleting doctor accounts...');
    const deletedDoctors = await runQuery('DELETE FROM users WHERE role = ?', ['doctor']);
    console.log(`   ✓ Deleted ${deletedDoctors.changes} doctor accounts\n`);

    // Commit transaction
    await runQuery('COMMIT');

    // Verify deletion
    const afterPatients = await getQuery('SELECT COUNT(*) as count FROM users WHERE role = ?', ['patient']);
    const afterDoctors = await getQuery('SELECT COUNT(*) as count FROM users WHERE role = ?', ['doctor']);
    const afterAppointments = await getQuery('SELECT COUNT(*) as count FROM appointments');
    const afterAdmins = await getQuery("SELECT COUNT(*) as count FROM users WHERE role IN ('admin', 'superadmin')");

    console.log('✅ Database cleanup completed!\n');
    console.log('📊 Final database status:');
    console.log(`   - Patients: ${afterPatients.count}`);
    console.log(`   - Doctors: ${afterDoctors.count}`);
    console.log(`   - Appointments: ${afterAppointments.count}`);
    console.log(`   - Admins preserved: ${afterAdmins.count}`);

    console.log('\n✨ Database is ready for fresh testing!');
    console.log('💡 Admin accounts have been preserved for dashboard access.');

  } catch (error) {
    // Rollback on error
    await runQuery('ROLLBACK');
    console.error('❌ Error during cleanup:', error.message);
    console.error('Database has been rolled back to previous state.');
    throw error;
  } finally {
    db.close();
  }
}

// Run the reset
resetDatabase()
  .then(() => {
    console.log('\n🎯 Database reset complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Database reset failed:', error);
    process.exit(1);
  });
