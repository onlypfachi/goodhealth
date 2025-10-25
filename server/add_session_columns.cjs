const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'hospital.db');
const db = new sqlite3.Database(dbPath);

// Check if columns exist first
db.all("PRAGMA table_info(appointments)", (err, columns) => {
  if (err) {
    console.error('❌ Error checking table:', err.message);
    process.exit(1);
  }

  const hasSessionStart = columns.some(col => col.name === 'session_start');
  const hasSessionEnd = columns.some(col => col.name === 'session_end');

  if (hasSessionStart && hasSessionEnd) {
    console.log('✅ Session columns already exist!');
    db.close();
    process.exit(0);
    return;
  }

  // Add session_start column if it doesn't exist
  if (!hasSessionStart) {
    db.run(`ALTER TABLE appointments ADD COLUMN session_start TIMESTAMP`, (err) => {
      if (err) {
        console.error('❌ Error adding session_start column:', err.message);
      } else {
        console.log('✅ session_start column added successfully!');
      }
    });
  }

  // Add session_end column if it doesn't exist
  if (!hasSessionEnd) {
    db.run(`ALTER TABLE appointments ADD COLUMN session_end TIMESTAMP`, (err) => {
      if (err) {
        console.error('❌ Error adding session_end column:', err.message);
      } else {
        console.log('✅ session_end column added successfully!');
      }

      db.close((closeErr) => {
        if (closeErr) {
          console.error('❌ Error closing database:', closeErr.message);
          process.exit(1);
        }
        console.log('✅ Database connection closed.');
        process.exit(0);
      });
    });
  }
});
