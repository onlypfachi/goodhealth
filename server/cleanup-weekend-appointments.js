import { query, run, close } from './config/database.js';

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   🧹 CLEANUP WEEKEND APPOINTMENTS                       ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

async function cleanupWeekends() {
  try {
    // 1. Find weekend appointments
    console.log('🔍 Finding weekend appointments...');
    const weekendApts = await query(`
      SELECT
        a.appointment_id,
        a.patient_id,
        a.doctor_id,
        a.appointment_date,
        a.appointment_time,
        a.status,
        p.full_name as patient_name,
        d.full_name as doctor_name
      FROM appointments a
      LEFT JOIN users p ON a.patient_id = p.user_id
      LEFT JOIN users d ON a.doctor_id = d.user_id
    `);

    const weekendAppointments = weekendApts.filter(apt => {
      const date = new Date(apt.appointment_date);
      const day = date.getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    });

    if (weekendAppointments.length === 0) {
      console.log('✅ No weekend appointments found!\n');
      return;
    }

    console.log(`Found ${weekendAppointments.length} weekend appointment(s):\n`);

    for (const apt of weekendAppointments) {
      const date = new Date(apt.appointment_date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      console.log(`  📅 Appointment #${apt.appointment_id}:`);
      console.log(`     Patient: ${apt.patient_name}`);
      console.log(`     Doctor: ${apt.doctor_name}`);
      console.log(`     Date: ${apt.appointment_date} (${dayName})`);
      console.log(`     Status: ${apt.status}`);
      console.log('');
    }

    // 2. Delete or reschedule
    console.log('🗑️  Deleting weekend appointments...');
    const result = await run(`
      DELETE FROM appointments
      WHERE appointment_id IN (
        SELECT appointment_id FROM appointments
        WHERE strftime('%w', appointment_date) IN ('0', '6')
      )
    `);

    console.log(`✅ Deleted ${result.changes} appointment(s)\n`);

    // 3. Verify
    const remaining = await query('SELECT COUNT(*) as count FROM appointments');
    console.log(`📊 Remaining appointments: ${remaining[0].count}\n`);

    console.log('💡 Note: Future bookings will automatically adjust weekends to Monday');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await close();
  }
}

cleanupWeekends();
