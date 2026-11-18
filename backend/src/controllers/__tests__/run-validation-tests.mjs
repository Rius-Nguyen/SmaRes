import assert from 'node:assert';

// Mock Table & Reservation
const Table = {
  findOne: async () => null,
};

const Reservation = {
  findOne: async () => null,
};

const TableStatus = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  SEATED: 'SEATED',
  CLEANING: 'CLEANING',
};

const ReservationStatus = {
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

async function validateTableQrAccessService(payload) {
  const rawTableNumber = payload?.table_number;

  // Bước 1: Chuẩn hóa table_number (trim, uppercase)
  if (!rawTableNumber || typeof rawTableNumber !== 'string' || !rawTableNumber.trim()) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'MISSING_TABLE_IDENTIFIER',
        message: 'Vui lòng cung cấp số bàn hoặc mã QR hợp lệ.',
      },
    };
  }

  const tableNumber = rawTableNumber.trim().toUpperCase();

  // Bước 2: Query Table.findOne({ table_number })
  const table = await Table.findOne({ table_number: tableNumber });

  if (!table) {
    return {
      statusCode: 404,
      body: {
        success: false,
        error: 'TABLE_NOT_FOUND',
        message: 'Không tìm thấy thông tin bàn ăn trong hệ thống.',
      },
    };
  }

  // Bước 3 (CỐT LÕI): Kiểm tra table.status !== SEATED
  if (table.status !== TableStatus.SEATED) {
    return {
      statusCode: 403,
      body: {
        success: false,
        error: 'TABLE_NOT_OCCUPIED',
        message:
          'Bàn ăn hiện chưa được kích hoạt phục vụ. Quý khách vui lòng làm thủ tục Check-in hoặc liên hệ nhân viên trước khi gọi món.',
        data: {
          can_order: false,
          table_number: table.table_number,
          status: table.status,
          zone_name: table.zone_name,
        },
      },
    };
  }

  // Bước 4: Nếu SEATED, truy vấn Reservation CHECKED_IN
  let reservation = await Reservation.findOne({
    table_id: table._id,
    status: ReservationStatus.CHECKED_IN,
  });

  if (!reservation) {
    reservation = await Reservation.findOne({
      table_number: table.table_number,
      status: ReservationStatus.CHECKED_IN,
    });
  }

  // Bước 5: Trả về HTTP 200 OK
  return {
    statusCode: 200,
    body: {
      success: true,
      message: 'Bàn ăn đã được kích hoạt phiên phục vụ. Quý khách có thể bắt đầu gọi món.',
      data: {
        can_order: true,
        table_id: table._id,
        table_number: table.table_number,
        zone_name: table.zone_name,
        status: table.status,
        reservation_id: reservation ? reservation._id : null,
        customer_name: reservation ? reservation.customer_name : 'Khách tại bàn',
        check_in_time: reservation ? (reservation.check_in_time || reservation.updatedAt) : table.updatedAt,
      },
    },
  };
}

async function runAllTests() {
  console.log('🧪 BẮT ĐẦU CHẠY TOÀN BỘ 6 TEST CASES CHO TK-142:\n');

  // Test 1: Bàn AVAILABLE -> 403 TABLE_NOT_OCCUPIED
  Table.findOne = async (query) => {
    if (query.table_number === 'B01') {
      return {
        _id: 'tab_01',
        table_number: 'B01',
        capacity: 4,
        zone_name: 'Khu Trung Tâm',
        status: TableStatus.AVAILABLE,
        updatedAt: new Date(),
      };
    }
    return null;
  };
  const t1 = await validateTableQrAccessService({ table_number: 'B01' });
  assert.strictEqual(t1.statusCode, 403, 'TC-1 Failed: StatusCode != 403');
  assert.strictEqual(t1.body.error, 'TABLE_NOT_OCCUPIED', 'TC-1 Failed: Error code');
  assert.strictEqual(t1.body.data.can_order, false, 'TC-1 Failed: can_order != false');
  console.log('✅ Test 1 (AVAILABLE -> 403 TABLE_NOT_OCCUPIED): PASSED');

  // Test 2: Bàn RESERVED -> 403 TABLE_NOT_OCCUPIED
  Table.findOne = async (query) => {
    if (query.table_number === 'B02') {
      return {
        _id: 'tab_02',
        table_number: 'B02',
        capacity: 4,
        zone_name: 'Khu Ban Công',
        status: TableStatus.RESERVED,
        updatedAt: new Date(),
      };
    }
    return null;
  };
  const t2 = await validateTableQrAccessService({ table_number: 'b02' });
  assert.strictEqual(t2.statusCode, 403, 'TC-2 Failed: StatusCode != 403');
  assert.strictEqual(t2.body.error, 'TABLE_NOT_OCCUPIED', 'TC-2 Failed: Error code');
  assert.strictEqual(t2.body.data.can_order, false, 'TC-2 Failed: can_order != false');
  console.log('✅ Test 2 (RESERVED -> 403 TABLE_NOT_OCCUPIED): PASSED');

  // Test 3: Bàn CLEANING -> 403 TABLE_NOT_OCCUPIED
  Table.findOne = async (query) => {
    if (query.table_number === 'B03') {
      return {
        _id: 'tab_03',
        table_number: 'B03',
        capacity: 2,
        zone_name: 'Khu Cửa Sổ',
        status: TableStatus.CLEANING,
        updatedAt: new Date(),
      };
    }
    return null;
  };
  const t3 = await validateTableQrAccessService({ table_number: '  B03  ' });
  assert.strictEqual(t3.statusCode, 403, 'TC-3 Failed: StatusCode != 403');
  assert.strictEqual(t3.body.error, 'TABLE_NOT_OCCUPIED', 'TC-3 Failed: Error code');
  assert.strictEqual(t3.body.data.can_order, false, 'TC-3 Failed: can_order != false');
  console.log('✅ Test 3 (CLEANING -> 403 TABLE_NOT_OCCUPIED): PASSED');

  // Test 4: Bàn SEATED -> 200 OK, can_order: true
  Table.findOne = async (query) => {
    if (query.table_number === 'B04') {
      return {
        _id: 'tab_04',
        table_number: 'B04',
        capacity: 6,
        zone_name: 'Khu VIP 1',
        status: TableStatus.SEATED,
        updatedAt: new Date(),
      };
    }
    return null;
  };
  Reservation.findOne = async (query) => {
    return {
      _id: 'res_04',
      table_id: 'tab_04',
      table_number: 'B04',
      customer_name: 'Nguyễn Văn Thịnh',
      status: ReservationStatus.CHECKED_IN,
      check_in_time: new Date(),
    };
  };
  const t4 = await validateTableQrAccessService({ table_number: 'B04' });
  assert.strictEqual(t4.statusCode, 200, 'TC-4 Failed: StatusCode != 200');
  assert.strictEqual(t4.body.success, true, 'TC-4 Failed: success != true');
  assert.strictEqual(t4.body.data.can_order, true, 'TC-4 Failed: can_order != true');
  assert.strictEqual(t4.body.data.customer_name, 'Nguyễn Văn Thịnh');
  assert.strictEqual(t4.body.data.status, TableStatus.SEATED);
  console.log('✅ Test 4 (SEATED -> 200 OK, can_order: true): PASSED');

  // Test 5: Không tìm thấy bàn -> 404 TABLE_NOT_FOUND
  Table.findOne = async () => null;
  const t5 = await validateTableQrAccessService({ table_number: 'BAN_KO_TON_TAI' });
  assert.strictEqual(t5.statusCode, 404, 'TC-5 Failed: StatusCode != 404');
  assert.strictEqual(t5.body.error, 'TABLE_NOT_FOUND', 'TC-5 Failed: Error code');
  console.log('✅ Test 5 (NOT FOUND -> 404 TABLE_NOT_FOUND): PASSED');

  // Test 6: Thiếu table_number -> 400 MISSING_TABLE_IDENTIFIER
  const t6 = await validateTableQrAccessService({ table_number: '   ' });
  assert.strictEqual(t6.statusCode, 400, 'TC-6 Failed: StatusCode != 400');
  assert.strictEqual(t6.body.error, 'MISSING_TABLE_IDENTIFIER', 'TC-6 Failed: Error code');
  console.log('✅ Test 6 (MISSING -> 400 MISSING_TABLE_IDENTIFIER): PASSED');

  console.log('\n========================================================');
  console.log('🎉 TẤT CẢ 6/6 TEST CASES TK-142 ĐỀU ĐẠT CHUẨN 100%!');
  console.log('========================================================\n');
}

runAllTests().catch((err) => {
  console.error('❌ Kiểm thử thất bại:', err);
  process.exit(1);
});
