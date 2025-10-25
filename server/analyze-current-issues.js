import { query, close } from './config/database.js';

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   🔍 ANALYZING CURRENT APPOINTMENT ISSUES               ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

async function analyzeIssues() {
  try {
    // 1. Check all appointments with full details
    console.log('📅 CURRENT APPOINTMENTS:');
    console.log('─'.repeat(70));
    const appointments = await query(`
      SELECT
        a.appointment_id,
        a.patient_id,
        a.doctor_id,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.queue_number,
        a.reason,
        a.notes,
        p.full_name as patient_name,
        p.email as patient_email,
        d.full_name as doctor_name,
        d.email as doctor_email,
        d.staff_id as doctor_staff_id
      FROM appointments a
      LEFT JOIN users p ON a.patient_id = p.user_id
      LEFT JOIN users d ON a.doctor_id = d.user_id
      ORDER BY a.appointment_date DESC, a.appointment_time ASC
    `);

    if (appointments.length === 0) {
      console.log('  ℹ️  No appointments found');
    } else {
      appointments.forEach(apt => {
        console.log(`\n  📋 Appointment #${apt.appointment_id}:`);
        console.log(`     Patient: ${apt.patient_name} (${apt.patient_email})`);
        console.log(`     Doctor ID: ${apt.doctor_id} → ${apt.doctor_name || '❌ NULL/INVALID'}`);
        console.log(`     Doctor Email: ${apt.doctor_email || 'N/A'}`);
        console.log(`     Date: ${apt.appointment_date} ${apt.appointment_time}`);
        console.log(`     Queue #: ${apt.queue_number}`);
        console.log(`     Status: ${apt.status}`);

        // Check if doctor exists
        if (!apt.doctor_name) {
          console.log(`     ⚠️  WARNING: Doctor ID ${apt.doctor_id} does not exist!`);
        }

        // Check if queue number makes sense
        if (apt.queue_number > appointments.length) {
          console.log(`     ⚠️  WARNING: Queue number ${apt.queue_number} too high (total appointments: ${appointments.length})`);
        }

        // Check if weekend
        const date = new Date(apt.appointment_date);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          console.log(`     ⚠️  WARNING: Weekend appointment (${dayOfWeek === 0 ? 'Sunday' : 'Saturday'})`);
        }
      });
    }
    console.log('\n');

    // 2. Check all doctors
    console.log('👨‍⚕️ DOCTORS IN DATABASE:');
    console.log('─'.repeat(70));
    const doctors = await query(`
      SELECT
        u.user_id,
        u.full_name,
        u.email,
        u.staff_id,
        u.role,
        u.is_active,
        GROUP_CONCAT(d.name) as departments
      FROM users u
      LEFT JOIN doctor_departments dd ON u.user_id = dd.user_id
      LEFT JOIN departments d ON dd.department_id = d.department_id
      WHERE u.role = 'doctor'
      GROUP BY u.user_id
      ORDER BY u.user_id
    `);

    doctors.forEach(doc => {
      console.log(`  Doctor ID: ${doc.user_id}`);
      console.log(`    Name: ${doc.full_name}`);
      console.log(`    Email: ${doc.email}`);
      console.log(`    Staff ID: ${doc.staff_id}`);
      console.log(`    Active: ${doc.is_active ? 'Yes' : 'No'}`);
      console.log(`    Departments: ${doc.departments || 'None assigned'}`);
      console.log('');
    });

    // 3. Check doctor schedules table
    console.log('📅 DOCTOR SCHEDULES:');
    console.log('─'.repeat(70));
    try {
      const schedules = await query(`
        SELECT
          ds.schedule_id,
          ds.doctor_id,
          u.full_name as doctor_name,
          ds.day_of_week,
          ds.start_time,
          ds.end_time,
          ds.is_available
        FROM doctor_schedules ds
        LEFT JOIN users u ON ds.doctor_id = u.user_id
        ORDER BY ds.doctor_id, ds.day_of_week
      `);

      if (schedules.length === 0) {
        console.log('  ⚠️  No doctor schedules found!');
        console.log('  This explains why shifts are not being used correctly.');
      } else {
        let currentDoctor = null;
        schedules.forEach(sched => {
          if (currentDoctor !== sched.doctor_id) {
            console.log(`\n  📋 ${sched.doctor_name} (ID: ${sched.doctor_id}):`);
            currentDoctor = sched.doctor_id;
          }
          const available = sched.is_available ? '✓' : '✗';
          console.log(`     ${available} ${sched.day_of_week}: ${sched.start_time} - ${sched.end_time}`);
        });
      }
    } catch (error) {
      console.log('  ❌ doctor_schedules table does not exist!');
      console.log('  Need to create this table for shift management.');
    }
    console.log('\n');

    // 4. Issues Summary
    console.log('🚨 ISSUES DETECTED:');
    console.log('─'.repeat(70));

    let issueCount = 0;

    // Check for invalid doctor references
    const invalidDoctors = appointments.filter(a => !a.doctor_name);
    if (invalidDoctors.length > 0) {
      issueCount++;
      console.log(`  ${issueCount}. Invalid doctor references: ${invalidDoctors.length} appointments`);
      invalidDoctors.forEach(a => {
        console.log(`     - Appointment #${a.appointment_id} references doctor_id ${a.doctor_id} (doesn't exist)`);
      });
    }

    // Check for weekend appointments
    const weekendApts = appointments.filter(a => {
      const date = new Date(a.appointment_date);
      const day = date.getDay();
      return day === 0 || day === 6;
    });
    if (weekendApts.length > 0) {
      issueCount++;
      console.log(`  ${issueCount}. Weekend appointments: ${weekendApts.length} found`);
    }

    // Check for incorrect queue numbers
    const highQueueNumbers = appointments.filter(a => a.queue_number > appointments.length);
    if (highQueueNumbers.length > 0) {
      issueCount++;
      console.log(`  ${issueCount}. Incorrect queue numbers: ${highQueueNumbers.length} appointments`);
    }

    // Check for missing schedules
    try {
      const schedules = await query('SELECT COUNT(*) as count FROM doctor_schedules');
      if (schedules[0].count === 0) {
        issueCount++;
        console.log(`  ${issueCount}. No doctor schedules configured`);
      }
    } catch (error) {
      issueCount++;
      console.log(`  ${issueCount}. Doctor schedules table missing`);
    }

    if (issueCount === 0) {
      console.log('  ✅ No critical issues detected!');
    }
    console.log('');

    // 5. Recommended Actions
    console.log('💡 RECOMMENDED ACTIONS:');
    console.log('─'.repeat(70));
    console.log('  1. Clean up invalid appointments (wrong doctor references)');
    console.log('  2. Create doctor_schedules table if missing');
    console.log('  3. Add default schedules for all doctors');
    console.log('  4. Fix queue numbering logic in booking endpoint');
    console.log('  5. Add weekend validation to booking endpoint');
    console.log('  6. Update frontend to show only weekdays');
    console.log('');

  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    console.error(error.stack);
  } finally {
    await close();
  }
}

analyzeIssues();
