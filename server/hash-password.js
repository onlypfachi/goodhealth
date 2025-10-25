import bcrypt from 'bcryptjs';

const password = 'admin123';
const hash = await bcrypt.hash(password, 10);
console.log('Password hash:', hash);

// Update admin password in database
import { query } from './config/database.js';

try {
  const result = await query(
    'UPDATE Users SET password_hash = ? WHERE email = ? AND staff_id = ?',
    [hash, 'admin@gmail.com', 'EMP0001']
  );

  if (result.affectedRows > 0) {
    console.log('✅ Admin password updated successfully!');
  } else {
    console.log('⚠️ No admin user found with email admin@gmail.com and staff_id EMP0001');
  }

  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
