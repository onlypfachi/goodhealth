import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbDir = join(__dirname, 'database');
const dbPath = join(dbDir, 'hospital.db');
const walPath = join(dbDir, 'hospital.db-wal');
const shmPath = join(dbDir, 'hospital.db-shm');

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║                                                          ║');
console.log('║   🏥  GOOD HEALTH HOSPITAL - DATABASE RESET             ║');
console.log('║                                                          ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');
console.log('⚠️  WARNING: This will delete ALL data and recreate the database!');
console.log('');

async function resetDatabase() {
  try {
    console.log('🗑️  Deleting old database files...');

    // Delete database files if they exist
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('   ✓ Deleted hospital.db');
    }
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
      console.log('   ✓ Deleted hospital.db-wal');
    }
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
      console.log('   ✓ Deleted hospital.db-shm');
    }

    console.log('');
    console.log('🔄 Running database setup...');
    console.log('');

    // Run setup script
    const { stdout, stderr } = await execPromise('node setup-database.js');

    console.log(stdout);
    if (stderr) {
      console.error(stderr);
    }

    console.log('');
    console.log('✅ Database reset completed successfully!');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Reset failed:', error.message);
    console.error('');
    process.exit(1);
  }
}

resetDatabase();
