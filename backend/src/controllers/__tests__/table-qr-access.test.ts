import { validateTableQrAccessService, ValidateQrAccessSuccessData } from '../table.controller';
import Table, { TableStatus } from '../../models/table.model';
import Reservation, { ReservationStatus } from '../../models/reservation.model';

// Khai báo kiểu Jest để tương thích với mọi môi trường test và biên dịch TypeScript
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => Promise<void> | void) => void;
declare const expect: (actual: any) => any;
declare const beforeEach: (fn: () => void) => void;
declare const jest: any;

describe('TK-142: Kiểm tra tính hợp lệ của mã QR (Chỉ mở khi bàn SEATED / Occupied)', () => {
  beforeEach(() => {
    // Reset mocks trước mỗi test case
    if (typeof jest !== 'undefined' && jest.clearAllMocks) {
      jest.clearAllMocks();
    }
  });

  // =========================================================================
  // Test 1: Bàn đang trống (AVAILABLE) -> 403 Forbidden TABLE_NOT_OCCUPIED
  // =========================================================================
  it('Test 1: Phải trả về 403 TABLE_NOT_OCCUPIED và can_order: false khi bàn AVAILABLE', async () => {
    const mockTable = {
      _id: 'table_01_id',
      table_number: 'B01',
      capacity: 4,
      zone_name: 'Khu Trung Tâm',
      status: TableStatus.AVAILABLE,
      updatedAt: new Date(),
    };

    Table.findOne = (async (query: any) => {
      if (query.table_number === 'B01') return mockTable as any;
      return null;
    }) as any;

    const res = await validateTableQrAccessService({ table_number: 'B01' });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('TABLE_NOT_OCCUPIED');
    expect(res.body.data?.can_order).toBe(false);
    expect(res.body.data?.status).toBe(TableStatus.AVAILABLE);
    expect(res.body.message).toContain('chưa được kích hoạt phục vụ');
  });

  // =========================================================================
  // Test 2: Bàn đã được đặt trước nhưng khách chưa đến (RESERVED) -> 403 Forbidden
  // =========================================================================
  it('Test 2: Phải trả về 403 TABLE_NOT_OCCUPIED và can_order: false khi bàn RESERVED', async () => {
    const mockTable = {
      _id: 'table_02_id',
      table_number: 'B02',
      capacity: 4,
      zone_name: 'Khu Ban Công',
      status: TableStatus.RESERVED,
      updatedAt: new Date(),
    };

    Table.findOne = (async (query: any) => {
      if (query.table_number === 'B02') return mockTable as any;
      return null;
    }) as any;

    const res = await validateTableQrAccessService({ table_number: 'b02' }); // Test case-insensitive

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('TABLE_NOT_OCCUPIED');
    expect(res.body.data?.can_order).toBe(false);
    expect(res.body.data?.status).toBe(TableStatus.RESERVED);
  });

  // =========================================================================
  // Test 3: Bàn đang dọn dẹp sau khi khách về (CLEANING) -> 403 Forbidden
  // =========================================================================
  it('Test 3: Phải trả về 403 TABLE_NOT_OCCUPIED và can_order: false khi bàn CLEANING', async () => {
    const mockTable = {
      _id: 'table_03_id',
      table_number: 'B03',
      capacity: 2,
      zone_name: 'Khu Cửa Sổ',
      status: TableStatus.CLEANING,
      updatedAt: new Date(),
    };

    Table.findOne = (async (query: any) => {
      if (query.table_number === 'B03') return mockTable as any;
      return null;
    }) as any;

    const res = await validateTableQrAccessService({ table_number: '  B03  ' }); // Test trim

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('TABLE_NOT_OCCUPIED');
    expect(res.body.data?.can_order).toBe(false);
    expect(res.body.data?.status).toBe(TableStatus.CLEANING);
  });

  // =========================================================================
  // Test 4: Bàn đã Check-in và đang ngồi ăn (SEATED) -> 200 OK, can_order: true
  // =========================================================================
  it('Test 4: Phải trả về 200 OK và can_order: true khi bàn SEATED và có check-in', async () => {
    const mockTable = {
      _id: 'table_04_id',
      table_number: 'B04',
      capacity: 6,
      zone_name: 'Khu VIP 1',
      status: TableStatus.SEATED,
      updatedAt: new Date(),
    };

    const mockReservation = {
      _id: 'res_04_id',
      table_id: 'table_04_id',
      table_number: 'B04',
      customer_name: 'Nguyễn Văn Thịnh',
      customer_phone: '0901234567',
      status: ReservationStatus.CHECKED_IN,
      check_in_time: new Date(),
    };

    Table.findOne = (async (query: any) => {
      if (query.table_number === 'B04') return mockTable as any;
      return null;
    }) as any;

    Reservation.findOne = (() => ({
      sort: () => Promise.resolve(mockReservation as any),
    })) as any;

    const res = await validateTableQrAccessService({ table_number: 'B04' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.can_order).toBe(true);
    const successData = res.body.data as ValidateQrAccessSuccessData;
    expect(successData?.table_number).toBe('B04');
    expect(successData?.customer_name).toBe('Nguyễn Văn Thịnh');
    expect(successData?.status).toBe(TableStatus.SEATED);
  });

  // =========================================================================
  // Test 5: Số bàn không tồn tại trong hệ thống -> 404 TABLE_NOT_FOUND
  // =========================================================================
  it('Test 5: Phải trả về 404 TABLE_NOT_FOUND khi số bàn không có trong cơ sở dữ liệu', async () => {
    Table.findOne = (async () => null) as any;

    const res = await validateTableQrAccessService({ table_number: 'BAN_KO_TON_TAI' });

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('TABLE_NOT_FOUND');
    expect(res.body.message).toContain('Không tìm thấy thông tin bàn ăn');
  });

  // =========================================================================
  // Test 6: Yêu cầu thiếu số bàn (rỗng hoặc undefined) -> 400 MISSING_TABLE_IDENTIFIER
  // =========================================================================
  it('Test 6: Phải trả về 400 MISSING_TABLE_IDENTIFIER khi không truyền table_number', async () => {
    const res = await validateTableQrAccessService({ table_number: '' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('MISSING_TABLE_IDENTIFIER');
  });
});
