import { query, run } from './config/database.js';

async function testPatientIdGeneration() {
  try {
    console.log('🧪 Testing Patient ID Generation System\n');

    // 1. Check current patient IDs
    console.log('1️⃣ Checking existing patient IDs...');
    const existingIds = await query('SELECT patient_id FROM patient_ids ORDER BY patient_id');
    console.log(`   Found ${existingIds.length} existing IDs`);
    if (existingIds.length > 0) {
      console.log(`   Last ID: ${existingIds[existingIds.length - 1].patient_id}`);
    }

    // 2. Test the next ID logic
    console.log('\n2️⃣ Testing next ID generation logic...');
    const [maxId] = await query(
      `SELECT patient_id FROM patient_ids
       ORDER BY CAST(SUBSTR(patient_id, 2) AS INTEGER) DESC
       LIMIT 1`
    );

    let nextNumber = 1;
    if (maxId && maxId.patient_id) {
      const currentNumber = parseInt(maxId.patient_id.substring(1));
      nextNumber = currentNumber + 1;
      console.log(`   Current max ID: ${maxId.patient_id}`);
      console.log(`   Extracted number: ${currentNumber}`);
    } else {
      console.log(`   No existing IDs found, starting from 1`);
    }

    const nextPatientId = 'P' + nextNumber.toString().padStart(6, '0');
    console.log(`   Next ID will be: ${nextPatientId}`);

    // 3. Check table structure
    console.log('\n3️⃣ Checking table structure...');
    const tableInfo = await query(`PRAGMA table_info(patient_ids)`);
    console.log('   Columns:');
    tableInfo.forEach(col => {
      console.log(`     - ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
    });

    // 4. Test available IDs query
    console.log('\n4️⃣ Testing available IDs query...');
    const availableIds = await query(
      `SELECT
        p.patient_id,
        p.generated_at,
        u.full_name as generated_by_name
       FROM patient_ids p
       JOIN users u ON p.generated_by = u.user_id
       WHERE p.is_used = 0
       ORDER BY p.generated_at DESC`
    );
    console.log(`   Available (unused) IDs: ${availableIds.length}`);

    // 5. Test used IDs query
    console.log('\n5️⃣ Testing used IDs query...');
    const usedIds = await query(
      `SELECT COUNT(*) as count FROM patient_ids WHERE is_used = 1`
    );
    console.log(`   Used IDs: ${usedIds[0].count}`);

    console.log('\n✅ Patient ID system test completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Total IDs in database: ${existingIds.length}`);
    console.log(`   - Available IDs: ${availableIds.length}`);
    console.log(`   - Used IDs: ${usedIds[0].count}`);
    console.log(`   - Next ID to generate: ${nextPatientId}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
  }

  process.exit(0);
}

testPatientIdGeneration();
