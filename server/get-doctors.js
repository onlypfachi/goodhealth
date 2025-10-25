import { query } from './config/database.js';

async function getDoctors() {
  try {
    const doctors = await query(
      `SELECT user_id, email, staff_id, full_name, role
       FROM users
       WHERE role = 'doctor'
       ORDER BY user_id
       LIMIT 5`
    );

    console.log('\n📋 Doctor Login Credentials:\n');
    doctors.forEach(doc => {
      console.log(`👨‍⚕️ ${doc.full_name}`);
      console.log(`   Email: ${doc.email}`);
      console.log(`   Staff ID: ${doc.staff_id || 'Not set'}`);
      console.log(`   Password: password123`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getDoctors();
