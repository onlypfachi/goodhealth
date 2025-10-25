import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'good_health_hospital',
  multipleStatements: true
};

async function applyMigration() {
  let connection;

  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', 'add_department_to_users.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Applying migration...');
    console.log('');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('USE'));

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          console.log(`   Executing statement ${i + 1}/${statements.length}...`);
          await connection.query(statement);
          console.log(`   ✅ Statement ${i + 1} executed successfully`);
        } catch (err) {
          // Check if error is about duplicate column (already migrated)
          if (err.code === 'ER_DUP_FIELDNAME') {
            console.log(`   ⚠️  Column already exists - migration already applied`);
          } else if (err.code === 'ER_DUP_KEYNAME') {
            console.log(`   ⚠️  Index already exists - migration already applied`);
          } else if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
            console.log(`   ⚠️  Field or key doesn't exist - skipping`);
          } else {
            throw err;
          }
        }
      }
    }

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║   ✅  MIGRATION COMPLETED SUCCESSFULLY                    ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📊 Database Changes Applied:');
    console.log('   ✓ Added department_id column to Users table');
    console.log('   ✓ Added foreign key constraint to Departments table');
    console.log('   ✓ Created index for performance optimization');
    console.log('   ✓ Updated existing patients with their recent departments');
    console.log('');
    console.log('🎉 You can now use the department features in the admin dashboard!');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('╔════════════════════════════════════════════════════════════╗');
    console.error('║   ❌ ERROR: Migration failed                              ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    console.error('');
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    console.error('');

    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Solution: Make sure MySQL server is running');
      console.error('   - Start MySQL service from Services');
      console.error('   - Or start XAMPP/WAMP if you are using them');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Solution: Check your database credentials in .env file');
      console.error('   - DB_USER (default: root)');
      console.error('   - DB_PASSWORD');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('💡 Solution: Database does not exist');
      console.error('   - Run: npm run setup-db');
      console.error('   - Or create the database manually');
    }
    console.error('');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
applyMigration();
