import { query, run } from './config/database.js';

async function updateDoctorEmails() {
  try {
    console.log('🔄 Updating doctor emails to @gmail.com format...\n');

    // Get all doctors with @hospital.com emails
    const doctors = await query(
      "SELECT user_id, email, full_name FROM users WHERE role = 'doctor' AND email LIKE '%@hospital.com'"
    );

    if (doctors.length === 0) {
      console.log('✅ No doctors with @hospital.com emails found. All good!');
      process.exit(0);
    }

    console.log(`Found ${doctors.length} doctors to update:\n`);

    for (const doctor of doctors) {
      // Convert email from @hospital.com to @gmail.com
      const oldEmail = doctor.email;
      const newEmail = oldEmail.replace('@hospital.com', '@gmail.com');

      await run(
        'UPDATE users SET email = ? WHERE user_id = ?',
        [newEmail, doctor.user_id]
      );

      console.log(`✓ ${doctor.full_name}`);
      console.log(`  ${oldEmail} → ${newEmail}\n`);
    }

    console.log('✅ All doctor emails updated successfully!\n');

    // Show updated list
    const updatedDoctors = await query(
      "SELECT email, full_name FROM users WHERE role = 'doctor' ORDER BY full_name"
    );

    console.log('📋 Updated Doctor Emails:');
    updatedDoctors.forEach(doc => {
      console.log(`  ${doc.full_name}: ${doc.email}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating emails:', error);
    process.exit(1);
  }
}

updateDoctorEmails();
