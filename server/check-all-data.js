import { query, close } from './config/database.js';

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   🔍 COMPLETE SYSTEM DATA CHECK                         ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

async function checkAllData() {
  try {
    // 1. Check appointments
    console.log('📅 ALL APPOINTMENTS IN DATABASE:');
    console.log('─'.repeat(70));
    const appointments = await query(`
      SELECT
        a.appointment_id,
        a.patient_id,
        p.full_name as patient_name,
        p.email as patient_email,
        a.doctor_id,
        d.full_name as doctor_name,
        d.email as doctor_email,
        a.appointment_date,
        a.appointment_time,
        a.queue_number,
        a.status,
        a.reason,
        a.created_at
      FROM appointments a
      LEFT JOIN users p ON a.patient_id = p.user_id
      LEFT JOIN users d ON a.doctor_id = d.user_id
      ORDER BY a.created_at DESC
    `);

    if (appointments.length === 0) {
      console.log('  ⚠️  NO APPOINTMENTS FOUND IN DATABASE!');
      console.log('  This means appointments are NOT being saved!');
    } else {
      console.log(`  Found ${appointments.length} appointment(s):\n`);
      appointments.forEach((apt, idx) => {
        console.log(`  ${idx + 1}. Appointment #${apt.appointment_id}:`);
        console.log(`     Patient: ${apt.patient_name} (${apt.patient_email}) [ID: ${apt.patient_id}]`);
        console.log(`     Doctor: ${apt.doctor_name || 'NULL'} (${apt.doctor_email || 'N/A'}) [ID: ${apt.doctor_id}]`);
        console.log(`     Date: ${apt.appointment_date} ${apt.appointment_time}`);
        console.log(`     Queue: #${apt.queue_number}`);
        console.log(`     Status: ${apt.status}`);
        console.log(`     Reason: ${apt.reason || 'N/A'}`);
        console.log(`     Created: ${apt.created_at}`);
        console.log('');
      });
    }

    // 2. Check patients
    console.log('👥 ALL PATIENTS:');
    console.log('─'.repeat(70));
    const patients = await query(`
      SELECT user_id, full_name, email, patient_id, is_active, created_at
      FROM users
      WHERE role = 'patient'
      ORDER BY created_at DESC
    `);

    patients.forEach(p => {
      console.log(`  - ${p.full_name || p.email} (ID: ${p.user_id}, Patient ID: ${p.patient_id}) ${p.is_active ? '✓' : '✗ Inactive'}`);
    });
    console.log('');

    // 3. Check doctors
    console.log('👨‍⚕️ ALL DOCTORS:');
    console.log('─'.repeat(70));
    const doctors = await query(`
      SELECT user_id, full_name, email, staff_id, is_active
      FROM users
      WHERE role = 'doctor'
      ORDER BY user_id
    `);

    doctors.forEach(d => {
      console.log(`  - ${d.full_name} (${d.email}) [User ID: ${d.user_id}, Staff ID: ${d.staff_id}] ${d.is_active ? '✓' : '✗ Inactive'}`);
    });
    console.log('');

    // 4. Check today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`📆 TODAY'S DATE: ${today}`);
    console.log('─'.repeat(70));

    // 5. Check appointments for today
    const todayAppointments = appointments.filter(a => a.appointment_date === today);
    console.log(`  Appointments for today (${today}): ${todayAppointments.length}`);
    if (todayAppointments.length > 0) {
      todayAppointments.forEach(a => {
        console.log(`    - ${a.patient_name} → ${a.doctor_name} at ${a.appointment_time} (Queue #${a.queue_number})`);
      });
    }
    console.log('');

    // 6. Check what doctor ID 28 should see
    console.log(`🔍 WHAT DOCTOR ID 28 (Dr. Zendera) SHOULD SEE:`);
    console.log('─'.repeat(70));
    const doctorAppointments = await query(`
      SELECT
        a.appointment_id,
        a.patient_id,
        p.full_name as patient_name,
        a.appointment_date,
        a.appointment_time,
        a.queue_number,
        a.status
      FROM appointments a
      LEFT JOIN users p ON a.patient_id = p.user_id
      WHERE a.doctor_id = 28
      AND DATE(a.appointment_date) = ?
      AND a.status != 'cancelled'
      ORDER BY a.queue_number ASC
    `, [today]);

    if (doctorAppointments.length === 0) {
      console.log(`  ❌ No appointments for doctor 28 on ${today}`);
      console.log(`  Reason: Either no appointments exist, or they're for a different date/doctor`);
    } else {
      console.log(`  ✅ Found ${doctorAppointments.length} appointment(s):`);
      doctorAppointments.forEach(a => {
        console.log(`    - ${a.patient_name} at ${a.appointment_time} (Queue #${a.queue_number}) [Status: ${a.status}]`);
      });
    }
    console.log('');

    // 7. Summary
    console.log('📊 SUMMARY:');
    console.log('─'.repeat(70));
    console.log(`  Total appointments in DB: ${appointments.length}`);
    console.log(`  Appointments for today: ${todayAppointments.length}`);
    console.log(`  Appointments for doctor 28 today: ${doctorAppointments.length}`);
    console.log(`  Total patients: ${patients.length}`);
    console.log(`  Total doctors: ${doctors.length}`);
    console.log('');

    // 8. Issues detection
    console.log('🚨 ISSUES DETECTED:');
    console.log('─'.repeat(70));
    let issuesFound = false;

    if (appointments.length === 0) {
      console.log('  ❌ CRITICAL: No appointments in database!');
      console.log('     → Booking endpoint is NOT saving to database');
      console.log('     → Check server logs when booking');
      issuesFound = true;
    }

    if (appointments.length > 0 && doctorAppointments.length === 0) {
      console.log('  ❌ CRITICAL: Appointments exist but not for doctor 28 today!');
      console.log('     → Check appointment dates');
      console.log('     → Check doctor_id in appointments');
      issuesFound = true;
    }

    const invalidDoctorRefs = appointments.filter(a => !a.doctor_name && a.doctor_id);
    if (invalidDoctorRefs.length > 0) {
      console.log(`  ❌ ERROR: ${invalidDoctorRefs.length} appointment(s) have invalid doctor_id`);
      invalidDoctorRefs.forEach(a => {
        console.log(`     - Appointment #${a.appointment_id} has doctor_id ${a.doctor_id} (doesn't exist)`);
      });
      issuesFound = true;
    }

    if (!issuesFound) {
      console.log('  ✅ No issues detected in database!');
      console.log('  If doctor dashboard is empty, check:');
      console.log('     1. Server is running');
      console.log('     2. Frontend is calling correct API');
      console.log('     3. Token has correct doctor ID');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await close();
  }
}

checkAllData();
