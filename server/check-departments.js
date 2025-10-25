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

async function checkDepartments() {
  let connection;

  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // Check if Departments table exists
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'Departments'"
    );

    if (tables.length === 0) {
      console.log('❌ Departments table does not exist!\n');
      console.log('Creating Departments table...\n');

      // Create Departments table
      await connection.query(`
        CREATE TABLE Departments (
          department_id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
      `);

      console.log('✅ Departments table created\n');
    }

    // Get all departments
    const [departments] = await connection.query(
      'SELECT * FROM Departments ORDER BY name'
    );

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                   DEPARTMENTS IN DATABASE                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    if (departments.length === 0) {
      console.log('⚠️  No departments found in the database!\n');
      console.log('Creating default departments...\n');

      // Create default departments
      const defaultDepartments = [
        { name: 'General Medicine', description: 'General medical consultations and treatment' },
        { name: 'Cardiology', description: 'Heart and cardiovascular system care' },
        { name: 'Pediatrics', description: 'Medical care for infants, children, and adolescents' },
        { name: 'Orthopedics', description: 'Musculoskeletal system treatment' },
        { name: 'Dermatology', description: 'Skin, hair, and nail care' },
        { name: 'Neurology', description: 'Nervous system disorders treatment' },
        { name: 'Obstetrics & Gynecology', description: 'Women\'s health and pregnancy care' },
        { name: 'Emergency Medicine', description: 'Emergency and urgent care services' },
        { name: 'Internal Medicine', description: 'Adult disease prevention and treatment' },
        { name: 'Surgery', description: 'Surgical procedures and interventions' }
      ];

      for (const dept of defaultDepartments) {
        await connection.query(
          'INSERT INTO Departments (name, description, is_active) VALUES (?, ?, TRUE)',
          [dept.name, dept.description]
        );
        console.log(`   ✅ Created: ${dept.name}`);
      }

      console.log('\n✅ Default departments created!\n');

      // Fetch again
      const [newDepartments] = await connection.query(
        'SELECT * FROM Departments ORDER BY name'
      );

      console.log(`Total departments: ${newDepartments.length}\n`);
      newDepartments.forEach((dept, index) => {
        console.log(`${index + 1}. ${dept.name}`);
        console.log(`   ID: ${dept.department_id}`);
        console.log(`   Description: ${dept.description}`);
        console.log(`   Active: ${dept.is_active ? 'Yes' : 'No'}`);
        console.log('');
      });

    } else {
      console.log(`Found ${departments.length} department(s):\n`);

      departments.forEach((dept, index) => {
        console.log(`${index + 1}. ${dept.name}`);
        console.log(`   ID: ${dept.department_id}`);
        console.log(`   Description: ${dept.description || 'No description'}`);
        console.log(`   Active: ${dept.is_active ? 'Yes' : 'No'}`);
        console.log(`   Created: ${dept.created_at}`);
        console.log('');
      });
    }

    console.log('─────────────────────────────────────────────────────────────\n');

    // Check active departments count
    const [activeDepts] = await connection.query(
      'SELECT COUNT(*) as count FROM Departments WHERE is_active = TRUE'
    );

    console.log(`Active departments: ${activeDepts[0].count}`);
    console.log(`Inactive departments: ${departments.length - activeDepts[0].count}`);

    console.log('\n✅ Department check complete!');

  } catch (error) {
    console.error('\n❌ Error checking departments:', error.message);

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
checkDepartments();
