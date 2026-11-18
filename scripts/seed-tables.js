const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function seedTables() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to Atlas MongoDB');
  const db = mongoose.connection.db;

  await db.collection('tables').deleteMany({});
  await db.collection('reservations').deleteMany({ bookingCode: { $regex: '^TK142' } });

  const tables = [
    { table_number: 'B01', tableNumber: 'B01', capacity: 4, zone_name: 'Khu Trung Tâm', status: 'AVAILABLE', createdAt: new Date(), updatedAt: new Date() },
    { table_number: 'B02', tableNumber: 'B02', capacity: 4, zone_name: 'Khu Ban Công', status: 'RESERVED', createdAt: new Date(), updatedAt: new Date() },
    { table_number: 'B03', tableNumber: 'B03', capacity: 2, zone_name: 'Khu Cửa Sổ', status: 'CLEANING', createdAt: new Date(), updatedAt: new Date() },
    { table_number: 'B04', tableNumber: 'B04', capacity: 6, zone_name: 'Khu VIP 1', status: 'SEATED', createdAt: new Date(), updatedAt: new Date() },
    { table_number: '04', tableNumber: '04', capacity: 4, zone_name: 'Khu Vực Chính', status: 'SEATED', createdAt: new Date(), updatedAt: new Date() },
    { table_number: '01', tableNumber: '01', capacity: 2, zone_name: 'Khu Vực Chính', status: 'AVAILABLE', createdAt: new Date(), updatedAt: new Date() },
    { table_number: '02', tableNumber: '02', capacity: 4, zone_name: 'Khu Vực Chính', status: 'RESERVED', createdAt: new Date(), updatedAt: new Date() },
    { table_number: '03', tableNumber: '03', capacity: 4, zone_name: 'Khu Vực Chính', status: 'CLEANING', createdAt: new Date(), updatedAt: new Date() },
  ];

  const tableRes = await db.collection('tables').insertMany(tables);
  console.log('Inserted tables successfully:', tableRes.insertedCount);

  const b04Id = tableRes.insertedIds[3];
  const t04Id = tableRes.insertedIds[4];

  const reservations = [
    {
      table_id: b04Id,
      table_number: 'B04',
      tableNumber: 'B04',
      customer_name: 'Nguyễn Văn Thịnh',
      customer_phone: '0901234567',
      bookingCode: 'TK142_B04',
      status: 'CHECKED_IN',
      reservationDate: new Date(),
      timeSlot: '19:00 - 21:00',
      guests: 4,
      check_in_time: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      table_id: t04Id,
      table_number: '04',
      tableNumber: '04',
      customer_name: 'Khách VIP SmaRes',
      customer_phone: '0908889999',
      bookingCode: 'TK142_04',
      status: 'CHECKED_IN',
      reservationDate: new Date(),
      timeSlot: '18:30 - 20:30',
      guests: 2,
      check_in_time: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  await db.collection('reservations').insertMany(reservations);
  console.log('Inserted active checked-in reservations for testing!');
  process.exit(0);
}

seedTables().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
