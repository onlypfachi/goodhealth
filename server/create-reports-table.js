import { exec, close } from './config/database.js';

async function createReportsTable() {
  try {
    console.log('Creating medical_reports table...');

    await exec(`
      CREATE TABLE IF NOT EXISTS medical_reports (
        report_id INTEGER PRIMARY KEY AUTOINCREMENT,
        appointment_id INTEGER NOT NULL,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        is_patient_visible INTEGER DEFAULT 1,
        report_type TEXT DEFAULT 'consultation',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES users(user_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_reports_patient ON medical_reports(patient_id);
      CREATE INDEX IF NOT EXISTS idx_reports_doctor ON medical_reports(doctor_id);
      CREATE INDEX IF NOT EXISTS idx_reports_appointment ON medical_reports(appointment_id);
    `);

    console.log('✅ medical_reports table created successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await close();
  }
}

createReportsTable();
