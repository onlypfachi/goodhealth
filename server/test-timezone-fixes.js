import { query, testConnection, close } from './config/database.js';
import { getTodayZimbabwe, getZimbabweTime, formatTimeAgo } from './utils/timezone.js';

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║                                                          ║');
console.log('║   🧪  TIMEZONE & SQL FIXES - VERIFICATION TEST          ║');
console.log('║                                                          ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

async function testFixes() {
  try {
    console.log('🔗 Testing database connection...');
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connected successfully');
    console.log('');

    // Test 1: Timezone utility
    console.log('📅 TEST 1: Zimbabwe Timezone Utility');
    console.log('─────────────────────────────────────');
    const zimTime = getZimbabweTime();
    const today = getTodayZimbabwe();
    console.log(`   Current UTC time:      ${new Date().toISOString()}`);
    console.log(`   Zimbabwe time (CAT):   ${zimTime.toISOString()}`);
    console.log(`   Today (Zimbabwe):      ${today}`);
    console.log(`   Expected offset:       UTC+2 hours`);
    console.log('');

    // Test 2: SQLite age calculation (from patients.js line 181)
    console.log('🧮 TEST 2: Age Calculation (SQLite syntax)');
    console.log('─────────────────────────────────────');
    try {
      const ageTest = await query(
        `SELECT
          full_name,
          date_of_birth,
          CAST((julianday('now') - julianday(date_of_birth)) / 365.25 AS INTEGER) as age
         FROM users
         WHERE role = 'patient' AND date_of_birth IS NOT NULL
         LIMIT 3`
      );

      if (ageTest.length > 0) {
        console.log('   ✅ Age calculation working (SQLite syntax)');
        ageTest.forEach(p => {
          console.log(`   - ${p.full_name}: ${p.age} years old (DOB: ${p.date_of_birth})`);
        });
      } else {
        console.log('   ⚠️  No patients with date of birth found');
      }
    } catch (error) {
      console.log(`   ❌ Age calculation failed: ${error.message}`);
    }
    console.log('');

    // Test 3: Minutes ago calculation (from dashboard.js line 176)
    console.log('⏱️  TEST 3: Minutes Ago Calculation (Zimbabwe time)');
    console.log('─────────────────────────────────────');
    try {
      const loginTest = await query(
        `SELECT
          full_name,
          role,
          last_login,
          CAST((julianday(datetime('now', '+2 hours')) - julianday(last_login)) * 24 * 60 AS INTEGER) as minutes_ago
         FROM users
         WHERE role IN ('admin', 'superadmin') AND last_login IS NOT NULL
         ORDER BY last_login DESC
         LIMIT 3`
      );

      if (loginTest.length > 0) {
        console.log('   ✅ Minutes ago calculation working (Zimbabwe timezone)');
        loginTest.forEach(u => {
          const timeAgo = formatTimeAgo(u.minutes_ago);
          console.log(`   - ${u.full_name} (${u.role}): ${timeAgo}`);
          console.log(`     Last login: ${u.last_login}`);
        });
      } else {
        console.log('   ⚠️  No admin logins found');
      }
    } catch (error) {
      console.log(`   ❌ Minutes ago calculation failed: ${error.message}`);
    }
    console.log('');

    // Test 4: Appointments for doctor dashboard
    console.log('🏥 TEST 4: Doctor Dashboard Query');
    console.log('─────────────────────────────────────');
    try {
      const doctorAppointments = await query(
        `SELECT
          a.appointment_id,
          a.appointment_date,
          a.appointment_time,
          a.queue_number,
          a.status,
          p.full_name as patient_name,
          d.full_name as doctor_name,
          dept.name as department_name
         FROM appointments a
         JOIN users p ON a.patient_id = p.user_id
         JOIN users d ON a.doctor_id = d.user_id
         LEFT JOIN doctor_departments dd ON d.user_id = dd.user_id
         LEFT JOIN departments dept ON dd.department_id = dept.department_id
         WHERE DATE(a.appointment_date) >= ?
         AND a.status != 'cancelled'
         ORDER BY a.appointment_date ASC, a.queue_number ASC
         LIMIT 10`,
        [today]
      );

      console.log(`   Today (Zimbabwe): ${today}`);
      console.log(`   Appointments found: ${doctorAppointments.length}`);
      console.log('');

      if (doctorAppointments.length > 0) {
        console.log('   ✅ Appointments exist:');
        doctorAppointments.forEach(apt => {
          console.log(`   - Queue #${apt.queue_number} | ${apt.patient_name} → Dr. ${apt.doctor_name}`);
          console.log(`     Date: ${apt.appointment_date} ${apt.appointment_time || ''} | Status: ${apt.status}`);
        });
      } else {
        console.log('   ⚠️  No upcoming appointments found');
        console.log('   This could be normal if:');
        console.log('   - All appointments are for past dates');
        console.log('   - All appointments are cancelled');
        console.log('   - No appointments have been booked yet');
      }
    } catch (error) {
      console.log(`   ❌ Doctor dashboard query failed: ${error.message}`);
    }
    console.log('');

    // Test 5: Check for any weekend appointments
    console.log('📆 TEST 5: Weekend Appointments Check');
    console.log('─────────────────────────────────────');
    try {
      const weekendCheck = await query(
        `SELECT
          a.appointment_id,
          a.appointment_date,
          CAST(strftime('%w', a.appointment_date) AS INTEGER) as day_of_week,
          p.full_name as patient_name,
          a.status
         FROM appointments a
         JOIN users p ON a.patient_id = p.user_id
         WHERE CAST(strftime('%w', a.appointment_date) AS INTEGER) IN (0, 6)
         AND a.status != 'cancelled'
         LIMIT 5`
      );

      if (weekendCheck.length > 0) {
        console.log(`   ⚠️  Found ${weekendCheck.length} weekend appointments:`);
        weekendCheck.forEach(apt => {
          const dayName = apt.day_of_week === 0 ? 'Sunday' : 'Saturday';
          console.log(`   - ${apt.patient_name} on ${apt.appointment_date} (${dayName})`);
        });
        console.log('   Note: These may be old appointments from before weekend validation');
      } else {
        console.log('   ✅ No weekend appointments found');
      }
    } catch (error) {
      console.log(`   ❌ Weekend check failed: ${error.message}`);
    }
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('✅ Fixes Applied:');
    console.log('   1. SQLite syntax (julianday) instead of MySQL (TIMESTAMPDIFF)');
    console.log('   2. Zimbabwe timezone (CAT/UTC+2) everywhere');
    console.log('   3. Doctor dashboard query fixed (doctor_id, >= today)');
    console.log('   4. Weekend validation in booking form');
    console.log('   5. Duplicate booking prevention');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Restart your server: npm start');
    console.log('   2. Check console for NO SQL errors');
    console.log('   3. Test doctor dashboard - should show appointments');
    console.log('   4. Test patient dashboard - appointments should persist');
    console.log('   5. Verify times are in Zimbabwe timezone (CAT)');
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await close();
  }
}

testFixes();
