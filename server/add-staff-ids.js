import { query, run } from './config/database.js';

async function addStaffIds() {
  try {
    console.log('🔄 Adding Staff IDs to doctors...\n');

    // Get all doctors without staff_id
    const doctors = await query(
      "SELECT user_id, email, full_name FROM users WHERE role = 'doctor' ORDER BY user_id"
    );

    if (doctors.length === 0) {
      console.log('No doctors found.');
      process.exit(0);
    }

    console.log(`Found ${doctors.length} doctors:\n`);

    // Start staff IDs from EMP0002 (since EMP0001 is admin)
    let staffIdCounter = 2;

    for (const doctor of doctors) {
      const staffId = `EMP${String(staffIdCounter).padStart(4, '0')}`;

      await run(
        'UPDATE users SET staff_id = ? WHERE user_id = ?',
        [staffId, doctor.user_id]
      );

      console.log(`✓ ${doctor.full_name}`);
      console.log(`  Email: ${doctor.email}`);
      console.log(`  Staff ID: ${staffId}\n`);

      staffIdCounter++;
    }

    console.log('✅ All Staff IDs assigned successfully!\n');

    // Show final list
    const updatedDoctors = await query(
      "SELECT email, staff_id, full_name FROM users WHERE role = 'doctor' ORDER BY user_id"
    );

    console.log('📋 Final Doctor Credentials:\n');
    updatedDoctors.forEach(doc => {
      console.log(`👨‍⚕️ ${doc.full_name}`);
      console.log(`   Email: ${doc.email}`);
      console.log(`   Staff ID: ${doc.staff_id}`);
      console.log(`   Password: password123\n`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding staff IDs:', error);
    process.exit(1);
  }
}

addStaffIds();
