require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function testAtlasValidation() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to Atlas successfully!');
  const db = mongoose.connection.db;

  const cases = ['B01', 'B02', 'B03', 'B04', '04', 'UNKNOWN', ''];
  console.log('\n--- KIỂM TRA TRỰC TIẾP TRÊN MONGODB ATLAS CHO TK-142 ---');
  for (const c of cases) {
    if (!c.trim()) {
      console.log(`Case "${c}": 400 MISSING_TABLE_IDENTIFIER`);
      continue;
    }
    const table = await db.collection('tables').findOne({ $or: [{ table_number: c }, { tableNumber: c }] });
    if (!table) {
      console.log(`Case "${c}": 404 TABLE_NOT_FOUND`);
      continue;
    }
    if (table.status !== 'SEATED') {
      console.log(`Case "${c}" (Status: ${table.status}): 403 TABLE_NOT_OCCUPIED`);
      continue;
    }
    const res = await db.collection('reservations').findOne({ table_id: table._id, status: 'CHECKED_IN' });
    console.log(`Case "${c}" (Status: SEATED): 200 OK, Customer: "${res?.customer_name}"`);
  }
  process.exit(0);
}

testAtlasValidation().catch(e => {
  console.error(e);
  process.exit(1);
});
