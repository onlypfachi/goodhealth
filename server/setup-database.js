import { exec, query, run, testConnection, close } from './config/database.js';
import bcrypt from 'bcryptjs';

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║                                                          ║');
console.log('║   🏥  GOOD HEALTH HOSPITAL - DATABASE SETUP             ║');
console.log('║                                                          ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

async function setupDatabase() {
  try {
    console.log('🔗 Testing database connection...');
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    console.log('📝 Creating database schema...');
    console.log('');

    await exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('patient', 'doctor', 'admin', 'superadmin')),
        full_name TEXT NOT NULL,
        patient_id TEXT UNIQUE,
        staff_id TEXT UNIQUE,
        phone TEXT,
        address TEXT,
        date_of_birth TEXT,
        gender TEXT CHECK(gender IN ('male', 'female', 'other')),
        created_by INTEGER,
        is_active INTEGER DEFAULT 1,
        two_factor_enabled INTEGER DEFAULT 0,
        two_factor_secret TEXT,
        backup_codes TEXT,
        last_password_change TEXT,
        profile_updated_at TEXT,
        last_login TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS departments (
        department_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS doctor_departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        department_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE CASCADE,
        UNIQUE(user_id, department_id)
      );

      CREATE TABLE IF NOT EXISTS patient_ids (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT NOT NULL UNIQUE,
        is_used INTEGER DEFAULT 0,
        used_by INTEGER,
        generated_by INTEGER,
        generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        used_at TEXT,
        FOREIGN KEY (used_by) REFERENCES users(user_id) ON DELETE SET NULL,
        FOREIGN KEY (generated_by) REFERENCES users(user_id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS appointments (
        appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        appointment_date TEXT NOT NULL,
        appointment_time TEXT NOT NULL,
        status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
        reason TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES users(user_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS messages (
        message_id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        sender_name TEXT NOT NULL,
        sender_role TEXT NOT NULL CHECK(sender_role IN ('doctor', 'admin', 'patient')),
        recipient_id INTEGER,
        recipient_role TEXT DEFAULT 'admin' CHECK(recipient_role IN ('admin', 'doctor')),
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT DEFAULT 'normal' CHECK(priority IN ('normal', 'urgent')),
        status TEXT DEFAULT 'unread' CHECK(status IN ('unread', 'read')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        read_at TEXT,
        FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        user_role TEXT NOT NULL CHECK(user_role IN ('patient', 'doctor', 'admin', 'superadmin')),
        action_type TEXT NOT NULL CHECK(action_type IN ('login', 'logout', 'profile_update', 'password_change', '2fa_enable', '2fa_disable', 'account_created', 'appointment_booked', 'message_sent')),
        action_description TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_patient_id ON users(patient_id);
      CREATE INDEX IF NOT EXISTS idx_users_staff_id ON users(staff_id);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
      CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
    `);

    console.log('✅ Database schema created successfully!');
    console.log('');
    console.log('🏢 Populating departments...');

    const departments = [
      { name: 'General Medicine', description: 'General medical care and consultation' },
      { name: 'Cardiology', description: 'Heart and cardiovascular system care' },
      { name: 'Pediatrics', description: 'Medical care for infants, children, and adolescents' },
      { name: 'Orthopedics', description: 'Musculoskeletal system care' },
      { name: 'Dermatology', description: 'Skin, hair, and nail care' },
      { name: 'Neurology', description: 'Nervous system care' },
      { name: 'Obstetrics & Gynecology', description: 'Women\'s reproductive health' },
      { name: 'Emergency Medicine', description: 'Emergency and urgent care' },
      { name: 'Internal Medicine', description: 'Adult disease prevention, diagnosis, and treatment' },
      { name: 'Surgery', description: 'Surgical procedures and care' }
    ];

    for (const dept of departments) {
      try {
        await run('INSERT INTO departments (name, description) VALUES (?, ?)', [dept.name, dept.description]);
        console.log(`   ✓ ${dept.name}`);
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          console.log(`   ⏭️  ${dept.name} (already exists)`);
        }
      }
    }

    console.log('');
    console.log('👤 Creating default admin account...');

    const hashedPassword = await bcrypt.hash('admin123', 10);

    try {
      const result = await run(
        `INSERT INTO users (email, password_hash, role, full_name, staff_id)
         VALUES (?, ?, ?, ?, ?)`,
        ['admin@gmail.com', hashedPassword, 'superadmin', 'System Administrator', 'EMP0001']
      );

      console.log('   ✅ Admin account created!');
      console.log('   📧 Email: admin@gmail.com');
      console.log('   🔑 Password: admin123');
      console.log('   🆔 Staff ID: EMP0001');

      await run(
        `INSERT INTO activity_logs (user_id, user_role, action_type, action_description)
         VALUES (?, ?, ?, ?)`,
        [result.lastID, 'superadmin', 'account_created', 'Default superadmin account created']
      );
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        console.log('   ⏭️  Admin account already exists');
      }
    }

    console.log('');
    console.log('✅ Database setup completed successfully!');
    console.log('');
    console.log('🎉 Your hospital management system is ready!');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Start server: npm run dev');
    console.log('   2. Login at your admin dashboard');
    console.log('   3. Start managing your hospital!');
    console.log('');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    await close();
  }
}

setupDatabase();
