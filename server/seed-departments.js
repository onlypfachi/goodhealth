import { query } from './config/database.js';

const departments = [
  { name: 'Cardiology', description: 'Heart and cardiovascular care' },
  { name: 'Emergency', description: 'Emergency and urgent care services' },
  { name: 'Pediatrics', description: 'Child and adolescent healthcare' },
  { name: 'Orthopedics', description: 'Bone, joint, and muscle care' },
  { name: 'Neurology', description: 'Brain and nervous system care' },
  { name: 'General Medicine', description: 'General medical consultation' },
  { name: 'Surgery', description: 'Surgical procedures and operations' },
  { name: 'Obstetrics & Gynecology', description: 'Women\'s health and maternity care' },
  { name: 'Dermatology', description: 'Skin, hair, and nail care' },
  { name: 'Radiology', description: 'Medical imaging and diagnostics' },
  { name: 'Oncology', description: 'Cancer diagnosis and treatment' },
  { name: 'Psychiatry', description: 'Mental health services' },
];

async function seedDepartments() {
  try {
    console.log('🏥 Seeding departments...\n');

    for (const dept of departments) {
      // Check if department already exists
      const [existing] = await query(
        'SELECT * FROM Departments WHERE name = ?',
        [dept.name]
      );

      if (existing.length === 0) {
        await query(
          'INSERT INTO Departments (name, description, is_active) VALUES (?, ?, TRUE)',
          [dept.name, dept.description]
        );
        console.log(`✅ Added: ${dept.name}`);
      } else {
        console.log(`⏭️  Skipped: ${dept.name} (already exists)`);
      }
    }

    console.log('\n✅ Departments seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding departments:', error);
    process.exit(1);
  }
}

seedDepartments();
