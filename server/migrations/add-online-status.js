import { run, query } from '../config/database.js';

async function addOnlineStatusColumn() {
  try {
    console.log('🔄 Adding is_online column to users table...');

    // Check if column already exists
    const columns = await query('PRAGMA table_info(users)');
    const hasOnlineColumn = columns.some(col => col.name === 'is_online');

    if (hasOnlineColumn) {
      console.log('✅ is_online column already exists');
      return;
    }

    // Add is_online column
    await run(`
      ALTER TABLE users
      ADD COLUMN is_online INTEGER DEFAULT 0
    `);

    console.log('✅ Successfully added is_online column to users table');

    // Set all users to offline initially
    await run('UPDATE users SET is_online = 0');
    console.log('✅ Set all users to offline status');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }

  process.exit(0);
}

addOnlineStatusColumn();
