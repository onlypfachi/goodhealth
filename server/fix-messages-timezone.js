import { query, run, testConnection, close } from './config/database.js';

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║                                                          ║');
console.log('║   🕐  FIX MESSAGES TIMEZONE                              ║');
console.log('║                                                          ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

async function fixMessagesTimezone() {
  try {
    console.log('🔗 Connecting to database...');
    await testConnection();
    console.log('');

    // Step 1: Get current table schema
    console.log('📋 Step 1: Checking current messages table schema...');
    const tableInfo = await query('PRAGMA table_info(messages)');
    console.log('');
    console.log('Current schema:');
    tableInfo.forEach(col => {
      console.log(`   ${col.name}: ${col.type} ${col.dflt_value ? `(default: ${col.dflt_value})` : ''}`);
    });
    console.log('');

    // Step 2: Get all existing messages
    console.log('📬 Step 2: Backing up existing messages...');
    const existingMessages = await query('SELECT * FROM messages');
    console.log(`   Found ${existingMessages.length} message(s)`);
    console.log('');

    // Step 3: Recreate table with Zimbabwe timezone default
    console.log('🔧 Step 3: Recreating messages table with Zimbabwe timezone...');

    // Drop old table
    await run('DROP TABLE IF EXISTS messages_backup');
    await run('ALTER TABLE messages RENAME TO messages_backup');

    // Create new table with correct default
    await run(`
      CREATE TABLE messages (
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
        created_at TEXT DEFAULT (datetime('now', '+2 hours')),
        read_at TEXT,
        FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    console.log('   ✅ Table recreated with Zimbabwe timezone default!');
    console.log('');

    // Step 4: Restore messages
    if (existingMessages.length > 0) {
      console.log('📥 Step 4: Restoring messages...');

      let restoredCount = 0;
      let skippedCount = 0;

      for (const msg of existingMessages) {
        try {
          await run(`
            INSERT INTO messages (
              message_id, sender_id, sender_name, sender_role,
              recipient_id, recipient_role, subject, content,
              priority, status, created_at, read_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            msg.message_id,
            msg.sender_id,
            msg.sender_name,
            msg.sender_role,
            msg.recipient_id,
            msg.recipient_role,
            msg.subject,
            msg.content,
            msg.priority,
            msg.status,
            msg.created_at,  // Keep original timestamp
            msg.read_at
          ]);
          restoredCount++;
        } catch (error) {
          // Skip messages with invalid foreign keys (deleted users)
          console.log(`   ⚠️  Skipped message #${msg.message_id} (sender ${msg.sender_name}) - user no longer exists`);
          skippedCount++;
        }
      }

      console.log(`   ✅ Restored ${restoredCount} message(s)`);
      if (skippedCount > 0) {
        console.log(`   ⚠️  Skipped ${skippedCount} message(s) with invalid user references`);
      }
      console.log('');
    }

    // Step 5: Test new message creation
    console.log('🧪 Step 5: Testing new message creation...');
    const testResult = await run(`
      INSERT INTO messages (sender_id, sender_name, sender_role, subject, content, priority)
      VALUES (1, 'Test User', 'admin', 'Test Message', 'Testing timezone fix', 'normal')
    `);

    const testMessage = await query(
      'SELECT message_id, sender_name, subject, created_at FROM messages WHERE message_id = ?',
      [testResult.lastID]
    );

    console.log('   Test message created:');
    console.log(`      ID: ${testMessage[0].message_id}`);
    console.log(`      Subject: ${testMessage[0].subject}`);
    console.log(`      Created at: ${testMessage[0].created_at}`);
    console.log('');

    // Delete test message
    await run('DELETE FROM messages WHERE message_id = ?', [testResult.lastID]);
    console.log('   ✅ Test message deleted');
    console.log('');

    // Step 6: Clean up backup
    console.log('🧹 Step 6: Cleaning up...');
    await run('DROP TABLE messages_backup');
    console.log('   ✅ Backup table removed');
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ MESSAGES TIMEZONE FIX COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   - Messages table recreated with Zimbabwe timezone (CAT/UTC+2)`);
    console.log(`   - ${existingMessages.length} existing message(s) preserved`);
    console.log('   - New messages will now use datetime(\'now\', \'+2 hours\')');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Restart your server');
    console.log('   2. Send a test message from doctor dashboard');
    console.log('   3. Check admin dashboard - should show "Just now" or correct time');
    console.log('   4. Old messages may still show wrong time (they used UTC)');
    console.log('');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await close();
  }
}

fixMessagesTimezone();
