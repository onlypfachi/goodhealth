import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import { config } from './config/config.js';

async function migrateMessages() {
  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection({
      host: config.database.host,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      multipleStatements: true
    });

    console.log('📦 Connected to database');

    // Read migration file
    const migrationSQL = await fs.readFile('./database/migrations/create_messages_table.sql', 'utf-8');

    console.log('📄 Running Messages table migration...');

    // Execute migration
    await connection.query(migrationSQL);

    console.log('✅ Messages table migration completed successfully!');
    console.log('');
    console.log('📊 Migration Summary:');
    console.log('   - Created Messages table with all required fields');
    console.log('   - Added foreign keys and indexes');
    console.log('   - Inserted sample messages for testing');
    console.log('');
    console.log('🔄 Next Steps:');
    console.log('   1. Restart the backend server (npm run dev)');
    console.log('   2. Open the Messages tab in admin dashboard');
    console.log('   3. Verify auto mark-as-read functionality');
    console.log('   4. Test search and filter features');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('⚠️  Messages table already exists. Migration skipped.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('');
      console.error('Database connection failed. Please ensure:');
      console.error('  1. MySQL is running');
      console.error('  2. Database credentials in .env are correct');
      console.error('  3. Database "good_health_hospital" exists');
    } else {
      console.error('Error details:', error);
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
migrateMessages();
