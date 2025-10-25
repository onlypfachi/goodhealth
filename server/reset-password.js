import { run, close } from './config/database.js';
import bcrypt from 'bcryptjs';

async function resetPassword() {
  try {
    const email = process.argv[2];
    const newPassword = process.argv[3] || 'password123';

    if (!email) {
      console.log('Usage: node reset-password.js <email> [new-password]');
      console.log('Example: node reset-password.js john.doe@gmail.com patient123');
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await run(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [hashedPassword, email]
    );

    if (result.changes > 0) {
      console.log(`✅ Password reset successful for ${email}`);
      console.log(`   New password: ${newPassword}`);
    } else {
      console.log(`❌ User not found: ${email}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await close();
  }
}

resetPassword();
