const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function seedTables() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to Atlas MongoDB');
  const db = mongoose.connection.db;

  await db.collection('tables').deleteMany({});
  await db.collection('reservations').deleteMany({ bookingCode: { $regex: '^TK142' } });

  const now = new Date();
  const todayDate = now.toISOString().slice(0, 10);

  const tables = [
    { tableNumber: 'B01', capacity: 4, zoneName: 'Khu Trung Tâm', status: 'AVAILABLE', qrToken: null, createdAt: now, updatedAt: now },
    { tableNumber: 'B02', capacity: 4, zoneName: 'Khu Ban Công', status: 'RESERVED', qrToken: null, createdAt: now, updatedAt: now },
    { tableNumber: 'B03', capacity: 2, zoneName: 'Khu Cửa Sổ', status: 'CLEANING', qrToken: null, createdAt: now, updatedAt: now },
    { tableNumber: 'B04', capacity: 6, zoneName: 'Khu VIP 1', status: 'SEATED', qrToken: null, createdAt: now, updatedAt: now },
    { tableNumber: '04', capacity: 4, zoneName: 'Khu Vực Chính', status: 'SEATED', qrToken: null, createdAt: now, updatedAt: now },
    { tableNumber: '01', capacity: 2, zoneName: 'Khu Vực Chính', status: 'AVAILABLE', qrToken: null, createdAt: now, updatedAt: now },
    { tableNumber: '02', capacity: 4, zoneName: 'Khu Vực Chính', status: 'RESERVED', qrToken: null, createdAt: now, updatedAt: now },
    { tableNumber: '03', capacity: 4, zoneName: 'Khu Vực Chính', status: 'CLEANING', qrToken: null, createdAt: now, updatedAt: now },
  ];

  const tableRes = await db.collection('tables').insertMany(tables);
  console.log('Inserted tables successfully:', tableRes.insertedCount);

  const b04Id = tableRes.insertedIds[3];
  const t04Id = tableRes.insertedIds[4];

  const reservations = [
    {
      userId: null,
      tableId: b04Id,
      tableNumber: 'B04',
      customerName: 'Nguyễn Văn Thịnh',
      phone: '0901234567',
      date: todayDate,
      time: '19:00',
      guests: 4,
      note: '',
      bookingCode: 'TK142_B04',
      status: 'CHECKED_IN',
      checkInTime: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: null,
      tableId: t04Id,
      tableNumber: '04',
      customerName: 'Khách VIP SmaRes',
      phone: '0908889999',
      date: todayDate,
      time: '18:30',
      guests: 2,
      note: '',
      bookingCode: 'TK142_04',
      status: 'CHECKED_IN',
      checkInTime: now,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.collection('reservations').insertMany(reservations);
  console.log('Inserted active checked-in reservations for testing!');
  process.exit(0);
}

seedTables().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
