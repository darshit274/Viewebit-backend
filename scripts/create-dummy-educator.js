const bcrypt = require('bcryptjs');
const { Educator, Institution } = require('../models');

const DUMMY_EMAIL = 'educator@viewebit.com';
const DUMMY_PASSWORD = 'Educator@123';

async function createDummyEducator() {
  try {
    const existing = await Educator.findOne({ where: { email: DUMMY_EMAIL } });
    if (existing) {
      console.log(`✅ Dummy educator already exists: ${DUMMY_EMAIL}`);
      process.exit(0);
    }

    const institution = await Institution.findOne({ where: { slug: 'viewebit-academy' } });

    const hashedPassword = await bcrypt.hash(DUMMY_PASSWORD, 10);
    const educator = await Educator.create({
      name: 'Dr. Priya Mehta',
      email: DUMMY_EMAIL,
      password: hashedPassword,
      designation: 'Senior Faculty',
      employee_code: 'EDU-0001',
      bio: 'Dummy educator account for testing the Educator Panel.',
      institution_id: institution ? institution.id : null,
      isActive: true
    });

    console.log('✅ Created dummy educator:');
    console.log(`   Email: ${educator.email}`);
    console.log(`   Password: ${DUMMY_PASSWORD}`);
    console.log(`   Institution: ${institution ? institution.name : '(none)'}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create dummy educator:', error);
    process.exit(1);
  }
}

createDummyEducator();
