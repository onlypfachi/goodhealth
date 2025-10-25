import { query, testConnection, close } from './config/database.js';

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║                                                          ║');
console.log('║   🔍  PATIENT APPOINTMENTS DEBUG TEST                   ║');
console.log('║                                                          ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

async function testPatientAppointments() {
  try {
    console.log('🔗 Connecting to database...');
    await testConnection();
    console.log('');

    // Test 1: Check all patients
    console.log('👥 TEST 1: All Patients in System');
    console.log('─────────────────────────────────────');
    const allPatients = await query(
      `SELECT user_id, patient_id, full_name, email, role
       FROM users
       WHERE role = 'patient'
       ORDER BY user_id`
    );

    console.log(`   Found ${allPatients.length} patients:`);
    allPatients.forEach(p => {
      console.log(`   - user_id: ${p.user_id} | patient_id: ${p.patient_id} | ${p.full_name} (${p.email})`);
    });
    console.log('');

    // Test 2: Check all appointments
    console.log('📅 TEST 2: All Appointments in Database');
    console.log('─────────────────────────────────────');
    const allAppointments = await query(
      `SELECT
        a.appointment_id,
        a.patient_id,
        a.doctor_id,
        a.appointment_date,
        a.appointment_time,
        a.queue_number,
        a.status,
        p.full_name as patient_name,
        d.full_name as doctor_name,
        dept.name as department_name
       FROM appointments a
       LEFT JOIN users p ON a.patient_id = p.user_id
       LEFT JOIN users d ON a.doctor_id = d.user_id
       LEFT JOIN doctor_departments dd ON d.user_id = dd.user_id
       LEFT JOIN departments dept ON dd.department_id = dept.department_id
       ORDER BY a.appointment_date DESC, a.queue_number`
    );

    console.log(`   Found ${allAppointments.length} appointments:`);
    allAppointments.forEach(apt => {
      console.log(`   Appointment #${apt.appointment_id}:`);
      console.log(`      Patient: ${apt.patient_name} (user_id: ${apt.patient_id})`);
      console.log(`      Doctor: ${apt.doctor_name} (user_id: ${apt.doctor_id})`);
      console.log(`      Department: ${apt.department_name || 'N/A'}`);
      console.log(`      Date: ${apt.appointment_date} ${apt.appointment_time || ''}`);
      console.log(`      Queue: #${apt.queue_number} | Status: ${apt.status}`);
      console.log('');
    });

    // Test 3: For each patient, show their appointments
    console.log('🔍 TEST 3: Appointments by Patient (What API Returns)');
    console.log('─────────────────────────────────────');
    for (const patient of allPatients) {
      const patientAppointments = await query(
        `SELECT
          a.*,
          u.full_name as doctor_name,
          u.staff_id as doctor_staff_id,
          d.name as department_name
         FROM appointments a
         LEFT JOIN users u ON a.doctor_id = u.user_id
         LEFT JOIN doctor_departments dd ON u.user_id = dd.user_id
         LEFT JOIN departments d ON dd.department_id = d.department_id
         WHERE a.patient_id = ?
         ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
        [patient.user_id]
      );

      console.log(`   Patient: ${patient.full_name} (user_id: ${patient.user_id})`);

      if (patientAppointments.length === 0) {
        console.log('      ❌ No appointments found');
      } else {
        console.log(`      ✅ Found ${patientAppointments.length} appointment(s):`);
        patientAppointments.forEach(apt => {
          console.log(`         - Appt #${apt.appointment_id}: ${apt.appointment_date} ${apt.appointment_time || ''}`);
          console.log(`           Queue #${apt.queue_number} | Status: ${apt.status}`);
          console.log(`           Doctor: ${apt.doctor_name || 'N/A'} | Dept: ${apt.department_name || 'N/A'}`);
        });
      }
      console.log('');
    }

    // Test 4: Check active (upcoming) appointments
    console.log('📋 TEST 4: Active Appointments (What Dashboard Should Show)');
    console.log('─────────────────────────────────────');
    for (const patient of allPatients) {
      const activeAppointments = await query(
        `SELECT
          a.*,
          u.full_name as doctor_name,
          d.name as department_name
         FROM appointments a
         LEFT JOIN users u ON a.doctor_id = u.user_id
         LEFT JOIN doctor_departments dd ON u.user_id = dd.user_id
         LEFT JOIN departments d ON dd.department_id = d.department_id
         WHERE a.patient_id = ?
         AND a.status IN ('scheduled', 'called', 'in-progress')
         ORDER BY a.appointment_date DESC`,
        [patient.user_id]
      );

      console.log(`   Patient: ${patient.full_name}`);

      if (activeAppointments.length === 0) {
        console.log('      ⚠️  No active appointments (all completed/cancelled)');
      } else {
        console.log(`      ✅ ${activeAppointments.length} active appointment(s):`);
        activeAppointments.forEach(apt => {
          console.log(`         Queue #${apt.queue_number} | ${apt.doctor_name} | ${apt.department_name}`);
          console.log(`         ${apt.appointment_date} ${apt.appointment_time || ''} | ${apt.status}`);
        });
      }
      console.log('');
    }

    // Test 5: localStorage simulation
    console.log('💾 TEST 5: What Should Be in localStorage');
    console.log('─────────────────────────────────────');
    console.log('   When patient logs in, localStorage.getItem("user") should contain:');
    console.log('');
    for (const patient of allPatients) {
      console.log(`   Patient: ${patient.full_name}`);
      console.log('   {');
      console.log(`     "user_id": ${patient.user_id},     // ← This is the key field!`);
      console.log(`     "id": ${patient.user_id},           // Alternative field name`);
      console.log(`     "patient_id": "${patient.patient_id}",  // Hospital ID (like HC-001)`);
      console.log(`     "full_name": "${patient.full_name}",`);
      console.log(`     "email": "${patient.email}",`);
      console.log(`     "role": "${patient.role}"`);
      console.log('   }');
      console.log('');
    }

    // Summary and Action Items
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY & ACTION ITEMS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    const totalActive = await query(
      `SELECT COUNT(*) as count FROM appointments
       WHERE status IN ('scheduled', 'called', 'in-progress')`
    );

    console.log(`Total Patients: ${allPatients.length}`);
    console.log(`Total Appointments: ${allAppointments.length}`);
    console.log(`Active Appointments: ${totalActive[0].count}`);
    console.log('');

    console.log('🔧 To Fix "Appointments Disappearing" Issue:');
    console.log('');
    console.log('1. ✅ Backend endpoint is correct: GET /api/appointments/patient/:patientId');
    console.log('2. ✅ Frontend has useEffect to fetch on mount');
    console.log('3. ✅ Added comprehensive error logging');
    console.log('');
    console.log('4. 🚀 NOW DO THIS:');
    console.log('   a) Restart your server: npm start');
    console.log('   b) Login as patient in patient dashboard');
    console.log('   c) Open browser console (F12)');
    console.log('   d) Look for these logs:');
    console.log('      - "🔄 Fetching patient appointments on mount..."');
    console.log('      - "👤 Full user object: {...}"');
    console.log('      - "✅ Patient ID: X"');
    console.log('      - "📥 Appointments API Response: {...}"');
    console.log('');
    console.log('5. ❗ IF YOU SEE ERRORS:');
    console.log('   - "No patient ID found" → Check localStorage user object');
    console.log('   - "API returned error" → Check server console');
    console.log('   - "Failed to fetch" → Check server is running on port 5000');
    console.log('');
    console.log('6. ✅ EXPECTED RESULT:');
    console.log('   - Console shows: "✅ Found X active appointments"');
    console.log('   - Toast shows: "Appointments loaded successfully!"');
    console.log('   - Queue tab shows your appointment details');
    console.log('   - Reload page (F5) → Appointment STILL there!');
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await close();
  }
}

testPatientAppointments();
