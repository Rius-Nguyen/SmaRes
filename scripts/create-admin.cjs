const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB smares_db');

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('123', salt);

  const usersCol = mongoose.connection.db.collection('users');

  // Tài khoản 1: Email chuẩn admin@smares.com
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

  // Tài khoản 2: Email là 'admin' (để người dùng nhập chữ 'admin' là đăng nhập được ngay)
  await usersCol.updateOne(
    { email: 'admin' },
    {
      $set: {
        name: 'Quản Trị Viên (Admin)',
        username: 'admin',
        email: 'admin',
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

  console.log('Successfully configured admin user in MongoDB for both "admin@smares.com" and "admin"!');
  await mongoose.disconnect();
}

createAdmin().catch(console.error);
