import bcrypt from 'bcryptjs';
import { query } from './config/database.js';

async function createAdmin() {
  try {
    // Hash password
    const passwordHash = await bcrypt.hash('admin123', 10);

    console.log('Creating admin user...');

    // First, check if admin exists
    const existing = await query(
      'SELECT * FROM Users WHERE email = ?',
      ['admin@gmail.com']
    );

    if (existing.length > 0) {
      console.log('Admin user already exists. Updating password...');
      await query(
        'UPDATE Users SET password_hash = ? WHERE email = ?',
        [passwordHash, 'admin@gmail.com']
      );
      console.log('✅ Admin password updated successfully!');
    } else {
      console.log('Creating new admin user...');
      await query(
        `INSERT INTO Users (email, password_hash, role, full_name, staff_id, phone, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['admin@gmail.com', passwordHash, 'admin', 'Test Admin', 'EMP0001', '+1234567890', true]
      );
      console.log('✅ Admin user created successfully!');
    }

    console.log('\nAdmin credentials:');
    console.log('Email: admin@gmail.com');
    console.log('Staff ID: EMP0001');
    console.log('Password: admin123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
