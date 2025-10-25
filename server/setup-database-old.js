import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function setupDatabase() {
  console.log('\nTPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW');
  console.log('Q   <å  Good Health Hospital - Database Setup               Q');
  console.log('ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]\n');

  try {
    // First, connect without database to create it
    console.log('=á Connecting to MySQL server...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log(' Connected to MySQL server!\n');

    // Read the schema file
    console.log('=Ä Reading schema.sql file...');
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log(' Schema file loaded!\n');

    // Execute the schema
    console.log('™  Creating database and tables...');
    await connection.query(schema);
    console.log(' Database created successfully!\n');

    // Verify database was created
    const [databases] = await connection.query('SHOW DATABASES LIKE "good_health_hospital"');

    if (databases.length > 0) {
      console.log(' Database "good_health_hospital" verified!\n');

      // Show tables
      await connection.query('USE good_health_hospital');
      const [tables] = await connection.query('SHOW TABLES');

      console.log('=Ê Created tables:');
      tables.forEach((table, index) => {
        console.log(`   ${index + 1}. ${Object.values(table)[0]}`);
      });
      console.log('');
    }

    await connection.end();

    console.log('TPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW');
    console.log('Q     DATABASE SETUP COMPLETE!                            Q');
    console.log('ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]\n');
    console.log('=€ You can now start your server with: npm start\n');

  } catch (error) {
    console.error('\nL Error setting up database:');
    console.error(error.message);
    console.log('\n=¡ Troubleshooting:');
    console.log('   1. Make sure MySQL is installed and running');
    console.log('   2. Check your .env file has correct DB_PASSWORD');
    console.log('   3. Verify MySQL root password is correct\n');
    process.exit(1);
  }
}

setupDatabase();
