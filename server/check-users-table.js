import mysql from 'mysql2/promise';
import { config } from './config/config.js';

async function checkUsersTable() {
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

    // Get users table structure
    const [columns] = await connection.query('DESCRIBE users');

    console.log('📊 Users table structure:');
    console.log('');
    columns.forEach(col => {
      console.log(`   ${col.Field}`);
      console.log(`      Type: ${col.Type}`);
      console.log(`      Null: ${col.Null}`);
      console.log(`      Key: ${col.Key || 'none'}`);
      console.log(`      Default: ${col.Default || 'none'}`);
      console.log('');
    });

    // Get sample data
    const [users] = await connection.query('SELECT * FROM users LIMIT 3');
    console.log('📋 Sample users:');
    console.log(JSON.stringify(users, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUsersTable();
