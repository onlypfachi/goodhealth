import { query, run } from './config/database.js';

async function resetPatientsAndDoctors() {
  try {
    console.log('🔄 Starting reset of patients and doctors...\n');

    // 1. Get counts before reset
    console.log('📊 Current state:');
    const [patientCount] = await query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['patient']);
    const [doctorCount] = await query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['doctor']);
    const [adminCount] = await query('SELECT COUNT(*) as count FROM users WHERE role IN (?, ?)', ['admin', 'superadmin']);

    console.log(`   Patients: ${patientCount.count}`);
    console.log(`   Doctors: ${doctorCount.count}`);
    console.log(`   Admins: ${adminCount.count}`);
    console.log('');

    // 2. Get patient and doctor IDs
    const patients = await query('SELECT user_id FROM users WHERE role = ?', ['patient']);
    const doctors = await query('SELECT user_id FROM users WHERE role = ?', ['doctor']);

    const patientIds = patients.map(p => p.user_id);
    const doctorIds = doctors.map(d => d.user_id);

    // 3. Delete related records for patients
    if (patientIds.length > 0) {
      console.log('🗑️  Deleting patient-related records...');

      // Delete appointments
      const appointmentsDeleted = await run(
        `DELETE FROM appointments WHERE patient_id IN (${patientIds.join(',')})`,
        []
      );
      console.log(`   ✓ Appointments deleted: ${appointmentsDeleted?.changes || 0}`);

      // Delete queue entries
      try {
        const queueDeleted = await run(
          `DELETE FROM queue WHERE patient_id IN (${patientIds.join(',')})`,
          []
        );
        console.log(`   ✓ Queue entries deleted: ${queueDeleted?.changes || 0}`);
      } catch (e) {
        console.log('   ⊘ Queue table not found (skipped)');
      }

      // Delete medical reports/consultations (if table exists)
      try {
        const reportsDeleted = await run(
          `DELETE FROM medical_reports WHERE patient_id IN (${patientIds.join(',')})`,
          []
        );
        console.log(`   ✓ Medical reports deleted: ${reportsDeleted?.changes || 0}`);
      } catch (e) {
        console.log('   ⊘ Medical reports table not found (skipped)');
      }

      // Delete messages from patients
      const messagesDeleted = await run(
        `DELETE FROM messages WHERE sender_id IN (${patientIds.join(',')}) AND sender_role = ?`,
        ['patient']
      );
      console.log(`   ✓ Messages deleted: ${messagesDeleted?.changes || 0}`);
    }

    // 4. Delete related records for doctors
    if (doctorIds.length > 0) {
      console.log('\n🗑️  Deleting doctor-related records...');

      // Delete doctor schedules
      try {
        const schedulesDeleted = await run(
          `DELETE FROM doctor_schedules WHERE doctor_id IN (${doctorIds.join(',')})`,
          []
        );
        console.log(`   ✓ Doctor schedules deleted: ${schedulesDeleted?.changes || 0}`);
      } catch (e) {
        console.log('   ⊘ Doctor schedules table not found (skipped)');
      }

      // Delete doctor-department associations
      try {
        const deptsDeleted = await run(
          `DELETE FROM doctor_departments WHERE user_id IN (${doctorIds.join(',')})`,
          []
        );
        console.log(`   ✓ Doctor departments deleted: ${deptsDeleted?.changes || 0}`);
      } catch (e) {
        console.log('   ⊘ Doctor departments table not found (skipped)');
      }

      // Update appointments (set doctor_id to NULL instead of deleting)
      try {
        const appointmentsUpdated = await run(
          `UPDATE appointments SET doctor_id = NULL WHERE doctor_id IN (${doctorIds.join(',')})`,
          []
        );
        console.log(`   ✓ Appointments updated: ${appointmentsUpdated?.changes || 0}`);
      } catch (e) {
        console.log('   ⊘ Appointments table not found (skipped)');
      }

      // Update queue entries
      try {
        const queueUpdated = await run(
          `UPDATE queue SET doctor_id = NULL WHERE doctor_id IN (${doctorIds.join(',')})`,
          []
        );
        console.log(`   ✓ Queue entries updated: ${queueUpdated?.changes || 0}`);
      } catch (e) {
        console.log('   ⊘ Queue table not found (skipped)');
      }

      // Delete messages from doctors
      const messagesDeleted = await run(
        `DELETE FROM messages WHERE sender_id IN (${doctorIds.join(',')}) AND sender_role = ?`,
        ['doctor']
      );
      console.log(`   ✓ Messages deleted: ${messagesDeleted?.changes || 0}`);
    }

    // 5. Delete patient users
    if (patientIds.length > 0) {
      console.log('\n🗑️  Deleting patient accounts...');
      const patientsDeleted = await run(
        'DELETE FROM users WHERE role = ?',
        ['patient']
      );
      console.log(`   ✓ Patient accounts deleted: ${patientsDeleted?.changes || 0}`);
    }

    // 6. Delete doctor users
    if (doctorIds.length > 0) {
      console.log('\n🗑️  Deleting doctor accounts...');
      const doctorsDeleted = await run(
        'DELETE FROM users WHERE role = ?',
        ['doctor']
      );
      console.log(`   ✓ Doctor accounts deleted: ${doctorsDeleted?.changes || 0}`);
    }

    // 7. Reset patient IDs table
    console.log('\n🔄 Resetting patient IDs table...');
    const patientIdsDeleted = await run('DELETE FROM patient_ids', []);
    console.log(`   ✓ Patient IDs deleted: ${patientIdsDeleted?.changes || 0}`);

    // 8. Verify admin accounts are intact
    console.log('\n✅ Verifying admin accounts...');
    const admins = await query('SELECT user_id, email, role FROM users WHERE role IN (?, ?)', ['admin', 'superadmin']);
    console.log(`   ✓ Admin accounts preserved: ${admins.length}`);
    admins.forEach(admin => {
      console.log(`      - ${admin.email} (${admin.role})`);
    });

    // 9. Final count
    console.log('\n📊 Final state:');
    const [newPatientCount] = await query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['patient']);
    const [newDoctorCount] = await query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['doctor']);
    const [newAdminCount] = await query('SELECT COUNT(*) as count FROM users WHERE role IN (?, ?)', ['admin', 'superadmin']);

    console.log(`   Patients: ${newPatientCount.count}`);
    console.log(`   Doctors: ${newDoctorCount.count}`);
    console.log(`   Admins: ${newAdminCount.count}`);

    console.log('\n✅ Reset completed successfully!');
    console.log('   - All patients removed ✓');
    console.log('   - All doctors removed ✓');
    console.log('   - Patient IDs reset ✓');
    console.log('   - Admin accounts preserved ✓');

  } catch (error) {
    console.error('\n❌ Reset failed:', error);
    console.error('Error details:', error.message);
  }

  process.exit(0);
}

resetPatientsAndDoctors();
