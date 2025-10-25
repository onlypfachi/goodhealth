const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

const createTableSQL = `
CREATE TABLE IF NOT EXISTS doctor_schedules (
  schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  doctor_id INTEGER NOT NULL,
  day_of_week VARCHAR(20) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES users(user_id) ON DELETE CASCADE
)`;

db.run(createTableSQL, (err) => {
  if (err) {
    console.error('Error creating doctor_schedules table:', err);
  } else {
    console.log('✅ doctor_schedules table created successfully');
  }
  db.close();
});
