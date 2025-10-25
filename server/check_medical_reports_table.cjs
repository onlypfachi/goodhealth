const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'hospital.db');
const db = new sqlite3.Database(dbPath);

db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='medical_reports'", (err, row) => {
  if (err) {
    console.error('❌ Error checking table:', err.message);
    process.exit(1);
  }

  if (row) {
    console.log('✅ medical_reports table EXISTS');

    // Get table schema
    db.all("PRAGMA table_info(medical_reports)", (err, columns) => {
      if (err) {
        console.error('❌ Error getting schema:', err.message);
      } else {
        console.log('\n📋 Table Schema:');
        columns.forEach(col => {
          console.log(`  - ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}`);
        });
      }
      db.close();
      process.exit(0);
    });
  } else {
    console.log('❌ medical_reports table DOES NOT EXIST - Creating it now...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS medical_reports (
        report_id INTEGER PRIMARY KEY AUTOINCREMENT,
        appointment_id INTEGER NOT NULL,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        report_type VARCHAR(100) DEFAULT 'consultation',
        is_patient_visible INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `;

    db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ Error creating table:', err.message);
        process.exit(1);
      } else {
        console.log('✅ medical_reports table created successfully!');
        db.close();
        process.exit(0);
      }
    });
  }
});
