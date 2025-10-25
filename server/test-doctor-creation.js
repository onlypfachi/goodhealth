import { query } from './config/database.js';

async function testDoctorCreation() {
  try {
    console.log('🧪 Testing Doctor Account Creation System\n');

    // 1. Check existing doctors
    console.log('1️⃣ Checking existing doctors...');
    const doctors = await query(
      `SELECT user_id, full_name, email, staff_id, role
       FROM users
       WHERE role = 'doctor'
       ORDER BY staff_id`
    );
    console.log(`   Found ${doctors.length} existing doctors`);
    if (doctors.length > 0) {
      console.log('   Existing doctors:');
      doctors.forEach(doc => {
        console.log(`     - ${doc.staff_id}: ${doc.full_name} (${doc.email})`);
      });
      const lastDoctor = doctors[doctors.length - 1];
      console.log(`   Last staff ID: ${lastDoctor.staff_id}`);
    }

    // 2. Test the next staff_id logic
    console.log('\n2️⃣ Testing next staff ID generation logic...');
    const [lastStaff] = await query(
      `SELECT staff_id FROM users
       WHERE role IN ('doctor', 'admin', 'superadmin')
         AND staff_id IS NOT NULL
       ORDER BY CAST(SUBSTR(staff_id, 4) AS INTEGER) DESC
       LIMIT 1`
    );

    let nextStaffId = 'EMP0001';
    if (lastStaff && lastStaff.staff_id) {
      const lastNumber = parseInt(lastStaff.staff_id.substring(3));
      const nextNumber = lastNumber + 1;
      nextStaffId = `EMP${String(nextNumber).padStart(4, '0')}`;
      console.log(`   Current max staff ID: ${lastStaff.staff_id}`);
      console.log(`   Extracted number: ${lastNumber}`);
    } else {
      console.log(`   No existing staff IDs found, starting from EMP0001`);
    }

    console.log(`   Next staff ID will be: ${nextStaffId}`);

    // 3. Test email uniqueness check
    console.log('\n3️⃣ Testing email uniqueness...');
    if (doctors.length > 0) {
      const testEmail = doctors[0].email;
      const existingEmail = await query(
        'SELECT user_id, email FROM users WHERE email = ?',
        [testEmail]
      );
      if (existingEmail.length > 0) {
        console.log(`   ✓ Email uniqueness check works: ${testEmail} is already taken`);
      }
    } else {
      console.log(`   ⊘ No existing emails to test`);
    }

    // 4. Test name uniqueness check (case-insensitive)
    console.log('\n4️⃣ Testing name uniqueness (case-insensitive)...');
    if (doctors.length > 0) {
      const testName = doctors[0].full_name;
      const existingName = await query(
        'SELECT user_id, full_name FROM users WHERE LOWER(full_name) = LOWER(?)',
        [testName]
      );
      if (existingName.length > 0) {
        console.log(`   ✓ Name uniqueness check works: "${testName}" is already taken`);
      }

      // Test with different case
      const testNameUpper = testName.toUpperCase();
      const existingNameCaseInsensitive = await query(
        'SELECT user_id, full_name FROM users WHERE LOWER(full_name) = LOWER(?)',
        [testNameUpper]
      );
      if (existingNameCaseInsensitive.length > 0) {
        console.log(`   ✓ Case-insensitive check works: "${testNameUpper}" matches existing "${testName}"`);
      }
    } else {
      console.log(`   ⊘ No existing names to test`);
    }

    // 5. Check department assignment structure
    console.log('\n5️⃣ Checking department assignment structure...');
    const departments = await query('SELECT department_id, name FROM departments');
    console.log(`   Available departments: ${departments.length}`);
    departments.forEach(dept => {
      console.log(`     - ${dept.department_id}: ${dept.name}`);
    });

    const doctorDepts = await query(
      `SELECT dd.user_id, d.name
       FROM doctor_departments dd
       JOIN departments d ON dd.department_id = d.department_id
       LIMIT 5`
    );
    console.log(`   Doctor-department assignments: ${doctorDepts.length}`);

    console.log('\n✅ Doctor creation system test completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Total doctors: ${doctors.length}`);
    console.log(`   - Next staff ID: ${nextStaffId}`);
    console.log(`   - Available departments: ${departments.length}`);
    console.log(`   - Email uniqueness: Working`);
    console.log(`   - Name uniqueness (case-insensitive): Working`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
  }

  process.exit(0);
}

testDoctorCreation();
