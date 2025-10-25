import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import { config } from './config/config.js';

async function migrateProfileSecurity() {
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
    const migrationSQL = await fs.readFile('./database/migrations/update_profile_security_activity_v2.sql', 'utf-8');

    console.log('📄 Running Profile, Security & Activity Summary migration...');
    console.log('');

    // Execute migration
    const [results] = await connection.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📊 Migration Summary:');
    console.log('   ✓ Updated Staff table with 2FA fields');
    console.log('   ✓ Created ActivityLogs table');
    console.log('   ✓ Created MonthlySummary view');
    console.log('   ✓ Created GetMonthlySummary stored procedure');
    console.log('   ✓ Created LogActivity function');
    console.log('   ✓ Inserted sample activity logs for testing');
    console.log('');
    console.log('🎯 New Features Available:');
    console.log('   • Profile editing with real-time updates');
    console.log('   • Secure password change functionality');
    console.log('   • Two-Factor Authentication (2FA) support');
    console.log('   • Monthly activity summary statistics');
    console.log('   • Activity logging for all major actions');
    console.log('');
    console.log('🔄 Next Steps:');
    console.log('   1. Backend server will auto-reload with new routes');
    console.log('   2. Test Profile tab - Edit Profile functionality');
    console.log('   3. Test Security tab - Change Password & 2FA');
    console.log('   4. Test Activity Summary tab - Monthly statistics');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('⚠️  Tables already exist. Some operations may have been skipped.');
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
      console.log('');
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
migrateProfileSecurity();
