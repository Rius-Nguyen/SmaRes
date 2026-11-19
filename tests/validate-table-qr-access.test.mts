import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTableQrAccessCore,
  type QrReservationRecord,
  type QrTableRecord,
  type ValidateQrAccessDeps,
} from '../app/lib/validateTableQrAccessCore.ts';

function createMockDeps(
  tables: Record<string, QrTableRecord>,
  reservations: Record<string, QrReservationRecord> = {}
): ValidateQrAccessDeps {
  return {
    async findTableByNumber(tableNumber: string): Promise<QrTableRecord | null> {
      return tables[tableNumber] ?? null;
    },
    async findCheckedInReservation(
      tableId: unknown,
      tableNumber: string
    ): Promise<QrReservationRecord | null> {
      return reservations[String(tableId)] ?? reservations[tableNumber] ?? null;
    },
  };
}

test('returns 403 TABLE_NOT_OCCUPIED when table status is AVAILABLE', async () => {
  const deps = createMockDeps({
    B01: { _id: 'tbl-1', tableNumber: 'B01', zoneName: 'Tầng 1', status: 'AVAILABLE' },
  });

  const result = await validateTableQrAccessCore({ table_number: ' b01 ' }, deps);

  assert.equal(result.statusCode, 403);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'TABLE_NOT_OCCUPIED');
  assert.deepEqual(result.body.data, {
    can_order: false,
    table_number: 'B01',
    status: 'AVAILABLE',
    zone_name: 'Tầng 1',
  });
});

test('returns 403 TABLE_NOT_OCCUPIED when table status is RESERVED', async () => {
  const deps = createMockDeps({
    B02: { _id: 'tbl-2', tableNumber: 'B02', zoneName: 'VIP', status: 'RESERVED' },
  });

  const result = await validateTableQrAccessCore({ tableNumber: 'B02' }, deps);

  assert.equal(result.statusCode, 403);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'TABLE_NOT_OCCUPIED');
  assert.deepEqual(result.body.data, {
    can_order: false,
    table_number: 'B02',
    status: 'RESERVED',
    zone_name: 'VIP',
  });
});

test('returns 403 TABLE_NOT_OCCUPIED when table status is CLEANING', async () => {
  const deps = createMockDeps({
    B03: { _id: 'tbl-3', tableNumber: 'B03', status: 'CLEANING' },
  });

  const result = await validateTableQrAccessCore({ table_number: 'B03' }, deps);

  assert.equal(result.statusCode, 403);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'TABLE_NOT_OCCUPIED');
  assert.deepEqual(result.body.data, {
    can_order: false,
    table_number: 'B03',
    status: 'CLEANING',
    zone_name: 'Khu vực chính',
  });
});

test('returns 200 with can_order: true when table is SEATED with checked-in reservation', async () => {
  const checkInTime = new Date('2026-11-19T11:30:00.000Z');
  const deps = createMockDeps(
    {
      B04: {
        _id: 'tbl-4',
        tableNumber: 'B04',
        zoneName: 'Sân vườn',
        status: 'SEATED',
        updatedAt: new Date('2026-11-19T11:25:00.000Z'),
      },
    },
    {
      'tbl-4': {
        _id: 'res-4',
        customerName: 'Nguyễn Văn A',
        checkInTime,
      },
    }
  );

  const result = await validateTableQrAccessCore({ table_number: 'b04' }, deps);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.error, undefined);
  assert.deepEqual(result.body.data, {
    can_order: true,
    table_id: 'tbl-4',
    table_number: 'B04',
    zone_name: 'Sân vườn',
    status: 'SEATED',
    reservation_id: 'res-4',
    customer_name: 'Nguyễn Văn A',
    check_in_time: checkInTime,
  });
});

test('returns 404 TABLE_NOT_FOUND for unknown table', async () => {
  const deps = createMockDeps({});

  const result = await validateTableQrAccessCore({ table_number: 'B99' }, deps);

  assert.equal(result.statusCode, 404);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'TABLE_NOT_FOUND');
  assert.equal(result.body.data, undefined);
});

test('returns 400 MISSING_TABLE_IDENTIFIER for empty or missing identifier', async () => {
  const deps = createMockDeps({});

  const missingResult = await validateTableQrAccessCore({}, deps);
  assert.equal(missingResult.statusCode, 400);
  assert.equal(missingResult.body.success, false);
  assert.equal(missingResult.body.error, 'MISSING_TABLE_IDENTIFIER');

  const blankResult = await validateTableQrAccessCore({ table_number: '   ' }, deps);
  assert.equal(blankResult.statusCode, 400);
  assert.equal(blankResult.body.success, false);
  assert.equal(blankResult.body.error, 'MISSING_TABLE_IDENTIFIER');
});
