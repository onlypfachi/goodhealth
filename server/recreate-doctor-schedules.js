import { exec, query, run, close } from './config/database.js';

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   🔄 RECREATE DOCTOR SCHEDULES TABLE                    ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

async function recreateTable() {
  try {
    // 1. Drop existing table
    console.log('🗑️  Dropping existing doctor_schedules table...');
    try {
      await exec('DROP TABLE IF EXISTS doctor_schedules');
      console.log('✅ Old table dropped\n');
    } catch (error) {
      console.log('  ℹ️  No existing table to drop\n');
    }

    // 2. Create new table with updated schema
    console.log('📝 Creating new doctor_schedules table with updated schema...');
    await exec(`
      CREATE TABLE doctor_schedules (
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

      CREATE INDEX idx_doctor_schedules_doctor ON doctor_schedules(doctor_id);
      CREATE INDEX idx_doctor_schedules_day ON doctor_schedules(day_of_week);
    `);
    console.log('✅ New table created successfully!\n');

    // 3. Add schedules for all doctors
    console.log('👨‍⚕️ Adding default schedules for all doctors...');
    const doctors = await query(`
      SELECT user_id, full_name
      FROM users
      WHERE role = 'doctor' AND is_active = 1
    `);

    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const weekends = ['Saturday', 'Sunday'];

    for (const doctor of doctors) {
      console.log(`  📋 ${doctor.full_name}...`);

      // Add weekday schedules
      for (const day of weekdays) {
        await run(`
          INSERT INTO doctor_schedules (
            doctor_id, day_of_week, start_time, end_time,
            is_available, max_patients, consultation_duration
          ) VALUES (?, ?, '08:00', '16:00', 1, 19, 25)
        `, [doctor.user_id, day]);
      }

      // Add weekend schedules (unavailable)
      for (const day of weekends) {
        await run(`
          INSERT INTO doctor_schedules (
            doctor_id, day_of_week, start_time, end_time,
            is_available, max_patients, consultation_duration
          ) VALUES (?, ?, '00:00', '00:00', 0, 0, 25)
        `, [doctor.user_id, day]);
      }

      console.log(`     ✓ Added 7 day schedules`);
    }

    console.log('\n✅ All schedules created successfully!\n');

    // 4. Verify
    const count = await query('SELECT COUNT(*) as count FROM doctor_schedules');
    console.log(`📊 Total schedules in database: ${count[0].count}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await close();
  }
}

recreateTable();
