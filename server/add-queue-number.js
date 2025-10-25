import { exec, close } from './config/database.js';

async function addQueueNumberColumn() {
  try {
    console.log('Adding queue_number column to appointments table...');

    // Check if column exists, if not add it
    await exec(`
      ALTER TABLE appointments ADD COLUMN queue_number INTEGER;
    `);

    console.log('✅ queue_number column added successfully!');
  } catch (error) {
    if (error.message.includes('duplicate column')) {
      console.log('✅ queue_number column already exists');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await close();
  }
}

addQueueNumberColumn();
