const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'hospital.db');
const db = new sqlite3.Database(dbPath);

const createTableSQL = `
  CREATE TABLE IF NOT EXISTS notifications (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_type VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    appointment_id INTEGER,
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL
  )
`;

db.run(createTableSQL, (err) => {
  if (err) {
    console.error('❌ Error creating notifications table:', err.message);
    process.exit(1);
  } else {
    console.log('✅ notifications table created successfully!');
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
