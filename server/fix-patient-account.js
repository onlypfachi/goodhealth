import { query, run, close } from './config/database.js';

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   🔧 FIX PATIENT ACCOUNT STATUS                         ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

async function fixPatientAccounts() {
  try {
    // Get all inactive patients
    const inactivePatients = await query(`
      SELECT user_id, email, full_name, patient_id, is_active
      FROM users
      WHERE role = 'patient' AND is_active = 0
    `);

    if (inactivePatients.length === 0) {
      console.log('✅ All patient accounts are already active!');
      console.log('');
      return;
    }

    console.log(`Found ${inactivePatients.length} inactive patient(s):`);
    console.log('─'.repeat(60));

    for (const patient of inactivePatients) {
      console.log(`  - ${patient.email} (${patient.full_name || 'No name'}) - Patient ID: ${patient.patient_id}`);
    }
    console.log('');

    // Activate all patient accounts
    console.log('Activating all patient accounts...');
    const result = await run(`
      UPDATE users
      SET is_active = 1
      WHERE role = 'patient' AND is_active = 0
    `);

    console.log(`✅ Activated ${result.changes} patient account(s)!`);
    console.log('');

    // Verify
    const activePatients = await query(`
      SELECT user_id, email, full_name, patient_id, is_active
      FROM users
      WHERE role = 'patient'
    `);

    console.log('📊 Current Patient Status:');
    console.log('─'.repeat(60));
    activePatients.forEach(patient => {
      const status = patient.is_active ? '✅ Active' : '❌ Inactive';
      console.log(`  ${status} - ${patient.email} (Patient ID: ${patient.patient_id})`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await close();
  }
}

fixPatientAccounts();
