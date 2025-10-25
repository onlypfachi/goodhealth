import { query } from './config/database.js';

async function testMessagesAPI() {
  console.log('Testing Messages API...\n');

  // Test 1: Get all messages from database
  console.log('1. Fetching messages directly from database:');
  try {
    const messages = await query(`
      SELECT
        m.message_id,
        m.sender_id,
        m.sender_name,
        m.sender_role,
        m.subject,
        m.content,
        m.priority,
        m.status,
        m.created_at,
        m.read_at,
        u.staff_id as sender_staff_id,
        u.patient_id as sender_patient_id,
        GROUP_CONCAT(DISTINCT d.name) as sender_departments
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.user_id
      LEFT JOIN doctor_departments dd ON u.user_id = dd.user_id
      LEFT JOIN departments d ON dd.department_id = d.department_id
      GROUP BY m.message_id
      ORDER BY m.created_at DESC
    `);

    console.log(`Found ${messages.length} message(s):`);
    console.log(JSON.stringify(messages, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test 2: Get unread count
  console.log('\n2. Fetching unread count:');
  try {
    const [result] = await query(`
      SELECT COUNT(*) as count
      FROM messages
      WHERE status = 'unread'
    `);
    console.log(`Unread count: ${result.count}`);
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test 3: Check users table for sender
  console.log('\n3. Checking user with ID 10:');
  try {
    const [user] = await query('SELECT * FROM users WHERE user_id = 10');
    console.log(JSON.stringify(user, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  process.exit(0);
}

testMessagesAPI();
