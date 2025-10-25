const Database = require('better-sqlite3');

const db = new Database('./database/hospital.db');

console.log('\n📊 Checking doctors in database:\n');

const doctors = db.prepare("SELECT user_id, staff_id, full_name, email, role FROM users WHERE role = 'doctor'").all();

if (doctors.length === 0) {
  console.log('❌ No doctors found in database\n');
} else {
  console.log(`✅ Found ${doctors.length} doctor(s):\n`);
  doctors.forEach(doc => {
    console.log(`   - ${doc.full_name} (${doc.staff_id}) - ${doc.email}`);
  });
  console.log('');
}

db.close();
