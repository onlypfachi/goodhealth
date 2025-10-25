import { query, close } from './config/database.js';

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   🔍 APPOINTMENT BOOKING DATA VERIFICATION              ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

async function verifyData() {
  try {
    // 1. Check Departments
    console.log('📋 DEPARTMENTS:');
    console.log('─'.repeat(60));
    const departments = await query('SELECT * FROM departments ORDER BY department_id');
    if (departments.length === 0) {
      console.log('  ⚠️  WARNING: No departments found!');
    } else {
      departments.forEach(dept => {
        console.log(`  ID: ${dept.department_id} | Name: ${dept.name} | Active: ${dept.is_active ? 'Yes' : 'No'}`);
      });
    }
    console.log('');

    // 2. Check Doctors
    console.log('👨‍⚕️ DOCTORS:');
    console.log('─'.repeat(60));
    const doctors = await query(`
      SELECT
        u.user_id,
        u.full_name,
        u.email,
        u.staff_id,
        u.role,
        u.is_active
      FROM users u
      WHERE u.role = 'doctor'
      ORDER BY u.user_id
    `);

    if (doctors.length === 0) {
      console.log('  ⚠️  WARNING: No doctors found!');
    } else {
      doctors.forEach(doc => {
        console.log(`  ID: ${doc.user_id} | Name: ${doc.full_name} | Staff ID: ${doc.staff_id} | Active: ${doc.is_active ? 'Yes' : 'No'}`);
      });
    }
    console.log('');

    // 3. Check Doctor-Department Assignments
    console.log('🔗 DOCTOR-DEPARTMENT ASSIGNMENTS:');
    console.log('─'.repeat(60));
    const assignments = await query(`
      SELECT
        dd.id,
        dd.user_id,
        u.full_name as doctor_name,
        dd.department_id,
        d.name as department_name
      FROM doctor_departments dd
      LEFT JOIN users u ON dd.user_id = u.user_id
      LEFT JOIN departments d ON dd.department_id = d.department_id
      ORDER BY dd.department_id, dd.user_id
    `);

    if (assignments.length === 0) {
      console.log('  ⚠️  WARNING: No doctor-department assignments found!');
      console.log('  This is the ROOT CAUSE of "No doctors in that department" error!');
    } else {
      assignments.forEach(assign => {
        console.log(`  Doctor: ${assign.doctor_name} (ID: ${assign.user_id}) → Department: ${assign.department_name} (ID: ${assign.department_id})`);
      });
    }
    console.log('');

    // 4. Check Patients
    console.log('👥 PATIENTS:');
    console.log('─'.repeat(60));
    const patients = await query(`
      SELECT
        u.user_id,
        u.full_name,
        u.email,
        u.patient_id,
        u.is_active
      FROM users u
      WHERE u.role = 'patient'
      ORDER BY u.user_id
    `);

    if (patients.length === 0) {
      console.log('  ⚠️  WARNING: No patients found!');
    } else {
      patients.forEach(pat => {
        console.log(`  ID: ${pat.user_id} | Name: ${pat.full_name || 'N/A'} | Patient ID: ${pat.patient_id} | Active: ${pat.is_active ? 'Yes' : 'No'}`);
      });
    }
    console.log('');

    // 5. Check Appointments
    console.log('📅 APPOINTMENTS:');
    console.log('─'.repeat(60));
    const appointments = await query(`
      SELECT
        a.appointment_id,
        a.patient_id,
        p.full_name as patient_name,
        a.doctor_id,
        d.full_name as doctor_name,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.queue_number
      FROM appointments a
      LEFT JOIN users p ON a.patient_id = p.user_id
      LEFT JOIN users d ON a.doctor_id = d.user_id
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
      LIMIT 10
    `);

    if (appointments.length === 0) {
      console.log('  ℹ️  No appointments found (expected if this is a fresh test)');
    } else {
      appointments.forEach(apt => {
        console.log(`  Apt ID: ${apt.appointment_id} | Patient: ${apt.patient_name} → Doctor: ${apt.doctor_name}`);
        console.log(`    Date: ${apt.appointment_date} ${apt.appointment_time} | Status: ${apt.status} | Queue: ${apt.queue_number}`);
      });
    }
    console.log('');

    // 6. Summary
    console.log('📊 SUMMARY:');
    console.log('─'.repeat(60));
    console.log(`  ✓ Departments: ${departments.length}`);
    console.log(`  ✓ Doctors: ${doctors.length}`);
    console.log(`  ✓ Doctor-Department Assignments: ${assignments.length}`);
    console.log(`  ✓ Patients: ${patients.length}`);
    console.log(`  ✓ Appointments: ${appointments.length}`);
    console.log('');

    // 7. Issue Detection
    console.log('🔍 ISSUE DETECTION:');
    console.log('─'.repeat(60));

    let issuesFound = false;

    if (departments.length === 0) {
      console.log('  ❌ CRITICAL: No departments in database');
      issuesFound = true;
    }

    if (doctors.length === 0) {
      console.log('  ❌ CRITICAL: No doctors in database');
      issuesFound = true;
    }

    if (assignments.length === 0) {
      console.log('  ❌ CRITICAL: No doctor-department assignments');
      console.log('     This will cause "No doctors in that department" error!');
      console.log('     FIX: Assign doctors to departments via admin dashboard');
      issuesFound = true;
    }

    if (patients.length === 0) {
      console.log('  ⚠️  WARNING: No patients in database');
      console.log('     Patients can sign up through the patient portal');
    }

    if (!issuesFound) {
      console.log('  ✅ All critical data is present!');
      console.log('  System should be ready for appointment booking.');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    console.error(error.stack);
  } finally {
    await close();
  }
}

verifyData();
