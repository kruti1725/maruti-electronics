import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { seedAdmin } from '../src/lib/data-service';

async function run() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@krutielectronics.com';
  const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.argv[4] || 'Kruti Electronics Admin';

  console.log('Seeding admin account...');
  console.log(`Email: ${email}`);
  console.log(`Name: ${name}`);

  try {
    const user = await seedAdmin(email, password, name);
    console.log('✅ Admin user created/updated successfully:');
    console.log(`ID: ${user._id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed admin:', err);
    process.exit(1);
  }
}

run();
