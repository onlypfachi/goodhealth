import { exec, query, run, close } from './config/database.js';

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   📅 SETUP DOCTOR SCHEDULES                             ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

async function setupSchedules() {
  try {
    // 1. Create table if not exists
    console.log('📝 Creating doctor_schedules table...');
    await exec(`
      CREATE TABLE IF NOT EXISTS doctor_schedules (
        schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
        doctor_id INTEGER NOT NULL,
        day_of_week TEXT NOT NULL CHECK(day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        is_available INTEGER DEFAULT 1,
        max_patients INTEGER DEFAULT 19,
        consultation_duration INTEGER DEFAULT 25,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (doctor_id) REFERENCES users(user_id) ON DELETE CASCADE,
        UNIQUE(doctor_id, day_of_week)
      );

      CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor ON doctor_schedules(doctor_id);
      CREATE INDEX IF NOT EXISTS idx_doctor_schedules_day ON doctor_schedules(day_of_week);
    `);
    console.log('✅ Table created successfully!\n');

    // 2. Get all doctors
    console.log('👨‍⚕️ Finding doctors to configure schedules...');
    const doctors = await query(`
      SELECT user_id, full_name, email
      FROM users
      WHERE role = 'doctor' AND is_active = 1
    `);

    if (doctors.length === 0) {
      console.log('⚠️  No active doctors found. Schedules will be added when doctors are created.');
      return;
    }

    console.log(`Found ${doctors.length} doctor(s):\n`);

    // 3. Add default schedules for each doctor
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const defaultStartTime = '08:00';
    const defaultEndTime = '16:00';
    const maxPatients = 19; // 8 hours * 60 min / 25 min per patient

    for (const doctor of doctors) {
      console.log(`📋 Setting up schedule for ${doctor.full_name}...`);

      let addedCount = 0;
      for (const day of weekdays) {
        try {
          await run(`
            INSERT OR IGNORE INTO doctor_schedules (
              doctor_id,
              day_of_week,
              start_time,
              end_time,
              is_available,
              max_patients,
              consultation_duration
            ) VALUES (?, ?, ?, ?, 1, ?, 25)
          `, [doctor.user_id, day, defaultStartTime, defaultEndTime, maxPatients]);
          addedCount++;
        } catch (error) {
          if (!error.message.includes('UNIQUE constraint')) {
            console.error(`   ⚠️  Error adding ${day}:`, error.message);
          }
        }
      }

      // Add weekends as unavailable
      for (const day of ['Saturday', 'Sunday']) {
        try {
          await run(`
            INSERT OR IGNORE INTO doctor_schedules (
              doctor_id,
              day_of_week,
              start_time,
              end_time,
              is_available,
              max_patients,
              consultation_duration
            ) VALUES (?, ?, ?, ?, 0, 0, 25)
          `, [doctor.user_id, day, '00:00', '00:00']);
        } catch (error) {
          if (!error.message.includes('UNIQUE constraint')) {
            console.error(`   ⚠️  Error adding ${day}:`, error.message);
          }
        }
      }

      console.log(`   ✓ Added schedules: ${addedCount} weekdays, 2 weekends (unavailable)\n`);
    }

    // 4. Verify schedules
    console.log('📊 Schedule Summary:');
    console.log('─'.repeat(70));

    const schedules = await query(`
      SELECT
        u.full_name as doctor_name,
        ds.day_of_week,
        ds.start_time,
        ds.end_time,
        ds.is_available,
        ds.max_patients
      FROM doctor_schedules ds
      JOIN users u ON ds.doctor_id = u.user_id
      ORDER BY u.user_id, ds.day_of_week
    `);

    let currentDoctor = null;
    schedules.forEach(sched => {
      if (currentDoctor !== sched.doctor_name) {
        console.log(`\n👨‍⚕️ ${sched.doctor_name}:`);
        currentDoctor = sched.doctor_name;
      }
      const status = sched.is_available ? '✓ Available' : '✗ Unavailable';
      const hours = sched.is_available ? `${sched.start_time} - ${sched.end_time} (max ${sched.max_patients} patients)` : 'Closed';
      console.log(`   ${status} ${sched.day_of_week.padEnd(10)} ${hours}`);
    });

    console.log('\n');
    console.log('✅ Doctor schedules setup complete!');
    console.log('');
    console.log('💡 Notes:');
    console.log('   - Weekday hours: 8:00 AM - 4:00 PM');
    console.log('   - Max patients per day: 19 (480 minutes / 25 min per patient)');
    console.log('   - Weekends: Closed (unavailable)');
    console.log('   - Consultation duration: 25 minutes');
    console.log('');

  } catch (error) {
    console.error('❌ Error setting up schedules:', error.message);
    console.error(error.stack);
  } finally {
    await close();
  }
}

setupSchedules();
