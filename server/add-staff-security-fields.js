import mysql from 'mysql2/promise';
import { config } from './config/config.js';

async function addStaffSecurityFields() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: config.database.host,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database
    });

    console.log('📦 Connected to database');
    console.log('');

    // Check and add columns one by one
    const columns = [
      {
        name: 'two_factor_enabled',
        definition: 'two_factor_enabled BOOLEAN DEFAULT FALSE AFTER password_hash'
      },
      {
        name: 'two_factor_secret',
        definition: 'two_factor_secret VARCHAR(255) DEFAULT NULL'
      },
      {
        name: 'backup_codes',
        definition: 'backup_codes TEXT DEFAULT NULL'
      },
      {
        name: 'last_password_change',
        definition: 'last_password_change TIMESTAMP NULL DEFAULT NULL'
      },
      {
        name: 'profile_updated_at',
        definition: 'profile_updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP'
      }
    ];

    console.log('🔍 Checking users table columns...');
    console.log('');

    for (const column of columns) {
      try {
        // Check if column exists
        const [columns] = await connection.query(
          `SELECT COUNT(*) as count
           FROM INFORMATION_SCHEMA.COLUMNS
           WHERE table_schema = ?
           AND table_name = 'users'
           AND column_name = ?`,
          [config.database.database, column.name]
        );

        if (columns[0].count === 0) {
          // Column doesn't exist, add it
          await connection.query(`ALTER TABLE users ADD COLUMN ${column.definition}`);
          console.log(`✅ Added column: ${column.name}`);
        } else {
          console.log(`⏭️  Column already exists: ${column.name}`);
        }
      } catch (err) {
        console.error(`❌ Error adding column ${column.name}:`, err.message);
      }
    }

    // Add index for 2FA
    console.log('');
    console.log('🔍 Adding index for 2FA...');
    try {
      await connection.query(`
        CREATE INDEX idx_two_factor_enabled ON users(two_factor_enabled)
      `);
      console.log('✅ Added index: idx_two_factor_enabled');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⏭️  Index already exists: idx_two_factor_enabled');
      } else {
        console.error('❌ Error adding index:', err.message);
      }
    }

    console.log('');
    console.log('✅ Users table security fields setup complete!');
    console.log('');
    console.log('📊 Added Features:');
    console.log('   • Two-Factor Authentication (2FA) support');
    console.log('   • Password change tracking');
    console.log('   • Profile update timestamps');

  } catch (error) {
    console.error('❌ Operation failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('');
      console.log('🔌 Database connection closed');
    }
  }
}

addStaffSecurityFields();
