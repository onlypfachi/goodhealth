import { query, close } from './config/database.js';

async function getUsers() {
  try {
    console.log('\n========================================');
    console.log('🔐 PATIENT ACCOUNTS');
    console.log('========================================\n');

    const patients = await query(
      `SELECT email, full_name, patient_id, created_at
       FROM users
       WHERE role = 'patient'
       ORDER BY created_at DESC
       LIMIT 10`
    );

    if (patients.length === 0) {
      console.log('❌ No patient accounts found.\n');
    } else {
      patients.forEach((patient, index) => {
        console.log(`${index + 1}. Name: ${patient.full_name}`);
        console.log(`   Email: ${patient.email}`);
        console.log(`   Patient ID: ${patient.patient_id}`);
        console.log(`   Password: (check registration or use "patient123" if default)`);
        console.log('');
      });
    }

    console.log('\n========================================');
    console.log('👨‍⚕️ DOCTOR ACCOUNTS');
    console.log('========================================\n');

    const doctors = await query(
      `SELECT u.email, u.full_name, u.staff_id,
              GROUP_CONCAT(d.name) as departments
       FROM users u
       LEFT JOIN doctor_departments dd ON u.user_id = dd.user_id
       LEFT JOIN departments d ON dd.department_id = d.department_id
       WHERE u.role = 'doctor'
       GROUP BY u.user_id
       ORDER BY u.created_at DESC
       LIMIT 10`
    );

    if (doctors.length === 0) {
      console.log('❌ No doctor accounts found.\n');
    } else {
      doctors.forEach((doctor, index) => {
        console.log(`${index + 1}. Name: ${doctor.full_name}`);
        console.log(`   Email: ${doctor.email}`);
        console.log(`   Staff ID: ${doctor.staff_id}`);
        console.log(`   Department(s): ${doctor.departments || 'Not assigned'}`);
        console.log(`   Password: (check registration or use "doctor123" if default)`);
        console.log('');
      });
    }

    console.log('\n========================================');
    console.log('👔 ADMIN ACCOUNTS');
    console.log('========================================\n');

    const admins = await query(
      `SELECT email, full_name, staff_id, role
       FROM users
       WHERE role IN ('admin', 'superadmin')
       ORDER BY created_at
       LIMIT 10`
    );

    if (admins.length > 0) {
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. Name: ${admin.full_name}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Staff ID: ${admin.staff_id}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Password: admin123 (default)`);
        console.log('');
      });
    }

    console.log('========================================\n');
    console.log('💡 NOTE: Passwords are hashed in database.');
    console.log('   Use the passwords from registration or defaults shown above.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await close();
  }
}

getUsers();
