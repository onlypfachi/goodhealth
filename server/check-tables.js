import mysql from 'mysql2/promise';
import { config } from './config/config.js';

async function checkTables() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: config.database.host,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database
    });

    console.log('📦 Connected to database:', config.database.database);
    console.log('');

    // Get all tables
    const [tables] = await connection.query('SHOW TABLES');

    console.log('📊 Available tables:');
    tables.forEach((row, index) => {
      const tableName = Object.values(row)[0];
      console.log(`   ${index + 1}. ${tableName}`);
    });

    console.log('');

    // Check for Staff-like tables
    const [staffTables] = await connection.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = ?
       AND table_name LIKE '%taff%'`,
      [config.database.database]
    );

    if (staffTables.length > 0) {
      console.log('🔍 Staff-related tables:');
      staffTables.forEach(row => {
        console.log(`   • ${row.table_name}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTables();
