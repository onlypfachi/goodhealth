const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'hospital.db');
const db = new sqlite3.Database(dbPath);

const createTableSQL = `
  CREATE TABLE IF NOT EXISTS consultation_reports (
    report_id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    report_title VARCHAR(255) NOT NULL,
    diagnosis TEXT,
    prescription TEXT,
    recommendations TEXT,
    follow_up_date DATE,
    report_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(user_id) ON DELETE CASCADE
  )
`;

db.run(createTableSQL, (err) => {
  if (err) {
    console.error('❌ Error creating consultation_reports table:', err.message);
    process.exit(1);
  } else {
    console.log('✅ consultation_reports table created successfully!');
    db.close((closeErr) => {
      if (closeErr) {
        console.error('❌ Error closing database:', closeErr.message);
        process.exit(1);
      }
      console.log('✅ Database connection closed.');
      process.exit(0);
    });
  }
});
