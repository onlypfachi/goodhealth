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

async function addDepartments() {
  let connection;

  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // Departments to add
    const departments = [
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

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              ADDING DEPARTMENTS TO DATABASE                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    let addedCount = 0;
    let skippedCount = 0;

    for (const dept of departments) {
      try {
        // Try to insert department
        await connection.query(
          'INSERT INTO Departments (name, description, is_active) VALUES (?, ?, TRUE)',
          [dept.name, dept.description]
        );
        console.log(`✅ Added: ${dept.name}`);
        addedCount++;
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`⚠️  Skipped (already exists): ${dept.name}`);
          skippedCount++;
        } else {
          throw error;
        }
      }
    }

    console.log('\n─────────────────────────────────────────────────────────────\n');
    console.log(`✅ Added: ${addedCount} department(s)`);
    console.log(`⚠️  Skipped: ${skippedCount} department(s) (already existed)`);
    console.log('\n─────────────────────────────────────────────────────────────\n');

    // Show all departments
    const [allDepartments] = await connection.query(
      'SELECT * FROM Departments ORDER BY name'
    );

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              ALL DEPARTMENTS IN DATABASE                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    allDepartments.forEach((dept, index) => {
      console.log(`${index + 1}. ${dept.name}`);
      console.log(`   ID: ${dept.department_id}`);
      console.log(`   Description: ${dept.description || 'No description'}`);
      console.log(`   Active: ${dept.is_active ? 'Yes ✓' : 'No ✗'}`);
      console.log('');
    });

    console.log(`Total departments in database: ${allDepartments.length}\n`);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║   🎉 DEPARTMENTS ADDED SUCCESSFULLY!                      ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('✅ You can now:');
    console.log('   1. Create doctor accounts with department selection');
    console.log('   2. Assign patients to departments');
    console.log('   3. Search by department name');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error adding departments:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 MySQL server is not running. Please start MySQL first.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Check your database credentials in .env file');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Database does not exist. Run: npm run setup-db');
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('\n💡 Departments table does not exist.');
      console.error('   Creating table now...\n');

      // Create Departments table
      try {
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
        console.log('✅ Departments table created!');
        console.log('   Please run this script again: npm run add-departments\n');
      } catch (createError) {
        console.error('❌ Failed to create Departments table:', createError.message);
      }
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the function
addDepartments();
