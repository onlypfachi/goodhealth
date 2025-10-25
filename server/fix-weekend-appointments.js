import { query, testConnection, close } from './config/database.js';

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║                                                          ║');
console.log('║   📆  FIX WEEKEND APPOINTMENTS                          ║');
console.log('║                                                          ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

async function fixWeekendAppointments() {
  try {
    console.log('🔗 Connecting to database...');
    await testConnection();
    console.log('');

    // Find all weekend appointments
    console.log('🔍 Finding weekend appointments...');
    const weekendAppointments = await query(
      `SELECT
        a.appointment_id,
        a.appointment_date,
        a.appointment_time,
        a.queue_number,
        CAST(strftime('%w', a.appointment_date) AS INTEGER) as day_of_week,
        p.full_name as patient_name,
        d.full_name as doctor_name,
        a.status
       FROM appointments a
       JOIN users p ON a.patient_id = p.user_id
       JOIN users d ON a.doctor_id = d.user_id
       WHERE CAST(strftime('%w', a.appointment_date) AS INTEGER) IN (0, 6)
       AND a.status = 'scheduled'`
    );

    if (weekendAppointments.length === 0) {
      console.log('✅ No weekend appointments found to fix!');
      console.log('');
      return;
    }

    console.log(`📋 Found ${weekendAppointments.length} weekend appointments:`);
    console.log('');

    weekendAppointments.forEach(apt => {
      const dayName = apt.day_of_week === 0 ? 'Sunday' : 'Saturday';
      console.log(`   ${apt.appointment_id}. ${apt.patient_name} → Dr. ${apt.doctor_name}`);
      console.log(`      Date: ${apt.appointment_date} (${dayName}) at ${apt.appointment_time || 'N/A'}`);
      console.log(`      Queue: #${apt.queue_number}`);
      console.log('');
    });

    console.log('🔧 Options:');
    console.log('   1. Move to next Monday (recommended)');
    console.log('   2. Cancel appointments');
    console.log('');
    console.log('💡 Running automatic fix: Moving to next business day...');
    console.log('');

    // Move each appointment to next business day
    for (const apt of weekendAppointments) {
      const appointmentDate = new Date(apt.appointment_date);
      const dayOfWeek = appointmentDate.getDay();

      // Calculate next Monday
      let daysToAdd = 0;
      if (dayOfWeek === 0) { // Sunday
        daysToAdd = 1; // Move to Monday
      } else if (dayOfWeek === 6) { // Saturday
        daysToAdd = 2; // Move to Monday
      }

      const nextBusinessDay = new Date(appointmentDate);
      nextBusinessDay.setDate(appointmentDate.getDate() + daysToAdd);
      const newDate = nextBusinessDay.toISOString().split('T')[0];

      // Update appointment
      await query(
        `UPDATE appointments
         SET appointment_date = ?,
             updated_at = datetime('now')
         WHERE appointment_id = ?`,
        [newDate, apt.appointment_id]
      );

      const dayName = dayOfWeek === 0 ? 'Sunday' : 'Saturday';
      console.log(`   ✅ Moved appointment #${apt.appointment_id}:`);
      console.log(`      FROM: ${apt.appointment_date} (${dayName})`);
      console.log(`      TO:   ${newDate} (Monday)`);
      console.log(`      Patient: ${apt.patient_name}`);
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Fixed ${weekendAppointments.length} weekend appointments!`);
    console.log('');
    console.log('📋 All appointments moved to next business day (Monday)');
    console.log('🚀 Weekend validation is now active in booking form');
    console.log('');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await close();
  }
}

fixWeekendAppointments();
