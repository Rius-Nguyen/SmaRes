const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function createAdmin() {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || !adminPassword.trim()) {
    console.error('Error: ADMIN_PASSWORD environment variable is required (e.g. in .env.local).');
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable is required.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB smares_db');

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(adminPassword, salt);

  const usersCol = mongoose.connection.db.collection('users');

  // Tài khoản quản trị duy nhất: admin@smares.com
  await usersCol.updateOne(
    { email: 'admin@smares.com' },
    {
      $set: {
        name: 'Quản Trị Viên (Admin)',
        username: 'admin',
        email: 'admin@smares.com',
        password: hashedPassword,
        phone: '0900000000',
        role: 'admin',
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );

  console.log('Successfully configured admin user "admin@smares.com" in MongoDB!');
  await mongoose.disconnect();
}

createAdmin().catch(console.error);
