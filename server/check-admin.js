import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'good_health_hospital'
};

async function checkAdminUsers() {
  let connection;

  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // Get all admin users
    const [admins] = await connection.query(
      `SELECT user_id, email, staff_id, role, full_name, is_active, created_at
       FROM Users
       WHERE role IN ('admin', 'superadmin')
       ORDER BY created_at DESC`
    );

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                   ADMIN USERS IN DATABASE                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    if (admins.length === 0) {
      console.log('⚠️  No admin users found in the database!\n');
      console.log('Creating a default admin account...\n');

      // Create default admin
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('admin123', 10);

      await connection.query(
        `INSERT INTO Users (email, password_hash, role, full_name, staff_id, is_active)
         VALUES ('admin@gmail.com', ?, 'admin', 'System Admin', 'EMP0001', TRUE)`,
        [hashedPassword]
      );

      console.log('✅ Default admin created:');
      console.log('   Email: admin@gmail.com');
      console.log('   Staff ID: EMP0001');
      console.log('   Password: admin123');
      console.log('   Role: admin\n');
    } else {
      console.log(`Found ${admins.length} admin user(s):\n`);

      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.full_name}`);
        console.log(`   User ID: ${admin.user_id}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Staff ID: ${admin.staff_id}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Status: ${admin.is_active ? 'Active' : 'Inactive'}`);
        console.log(`   Created: ${admin.created_at}`);
        console.log('');
      });
    }

    console.log('─────────────────────────────────────────────────────────────\n');

    // Check if any users have role issues
    const [allStaff] = await connection.query(
      `SELECT user_id, email, staff_id, role, full_name
       FROM Users
       WHERE staff_id IS NOT NULL`
    );

    console.log(`Total staff members: ${allStaff.length}`);
    console.log('Role distribution:');

    const roleCount = {};
    allStaff.forEach(staff => {
      roleCount[staff.role] = (roleCount[staff.role] || 0) + 1;
    });

    Object.keys(roleCount).forEach(role => {
      console.log(`   ${role}: ${roleCount[role]}`);
    });

    console.log('\n✅ Admin check complete!');

  } catch (error) {
    console.error('\n❌ Error checking admin users:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 MySQL server is not running. Please start MySQL first.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Check your database credentials in .env file');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Database does not exist. Run: npm run setup-db');
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the check
checkAdminUsers();
