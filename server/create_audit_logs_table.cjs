const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database', 'hospital.db'));

const createTableSQL = `
CREATE TABLE IF NOT EXISTS Audit_Logs (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  performed_by INTEGER NOT NULL,
  action VARCHAR(255) NOT NULL,
  description TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (performed_by) REFERENCES users(user_id) ON DELETE CASCADE
)`;

db.run(createTableSQL, (err) => {
  if (err) {
    console.error('Error creating Audit_Logs table:', err);
  } else {
    console.log('✅ Audit_Logs table created successfully');
  }
  db.close();
});
