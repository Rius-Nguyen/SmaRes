import { describe, it, expect } from 'vitest';
import {
  validateTableQrAccessCore,
  type QrReservationRecord,
  type QrTableRecord,
  type ValidateQrAccessDeps,
} from '@/app/lib/validateTableQrAccessCore';

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

describe('validateTableQrAccessCore', () => {
  it('returns 403 TABLE_NOT_OCCUPIED when table status is AVAILABLE', async () => {
    const deps = createMockDeps({
      B01: { _id: 'tbl-1', tableNumber: 'B01', zoneName: 'Tầng 1', status: 'AVAILABLE' },
    });

    const result = await validateTableQrAccessCore({ table_number: ' b01 ' }, deps);

    expect(result.statusCode).toBe(403);
    expect(result.body.success).toBe(false);
    expect(result.body.error).toBe('TABLE_NOT_OCCUPIED');
    expect(result.body.data).toEqual({
      can_order: false,
      table_number: 'B01',
      status: 'AVAILABLE',
      zone_name: 'Tầng 1',
    });
  });

  it('returns 403 TABLE_NOT_OCCUPIED when table status is RESERVED', async () => {
    const deps = createMockDeps({
      B02: { _id: 'tbl-2', tableNumber: 'B02', zoneName: 'VIP', status: 'RESERVED' },
    });

    const result = await validateTableQrAccessCore({ tableNumber: 'B02' }, deps);

    expect(result.statusCode).toBe(403);
    expect(result.body.success).toBe(false);
    expect(result.body.error).toBe('TABLE_NOT_OCCUPIED');
    expect(result.body.data).toEqual({
      can_order: false,
      table_number: 'B02',
      status: 'RESERVED',
      zone_name: 'VIP',
    });
  });

  it('returns 403 TABLE_NOT_OCCUPIED when table status is CLEANING', async () => {
    const deps = createMockDeps({
      B03: { _id: 'tbl-3', tableNumber: 'B03', status: 'CLEANING' },
    });

    const result = await validateTableQrAccessCore({ table_number: 'B03' }, deps);

    expect(result.statusCode).toBe(403);
    expect(result.body.success).toBe(false);
    expect(result.body.error).toBe('TABLE_NOT_OCCUPIED');
    expect(result.body.data).toEqual({
      can_order: false,
      table_number: 'B03',
      status: 'CLEANING',
      zone_name: 'Khu vực chính',
    });
  });

  it('returns 200 with can_order: true when table is SEATED with checked-in reservation', async () => {
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

    expect(result.statusCode).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.error).toBeUndefined();
    expect(result.body.data).toEqual({
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

  it('returns 200 walk-in fallback when table is SEATED without a checked-in reservation', async () => {
    const tableUpdatedAt = new Date('2026-11-19T12:00:00.000Z');
    const deps = createMockDeps({
      B05: {
        _id: 'tbl-5',
        tableNumber: 'B05',
        status: 'SEATED',
        updatedAt: tableUpdatedAt,
      },
    });

    const result = await validateTableQrAccessCore({ tableNumber: 'b05' }, deps);

    expect(result.statusCode).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.data).toEqual({
      can_order: true,
      table_id: 'tbl-5',
      table_number: 'B05',
      zone_name: 'Khu vực chính',
      status: 'SEATED',
      reservation_id: null,
      customer_name: 'Khách tại bàn',
      check_in_time: tableUpdatedAt,
    });
  });

  it('returns 404 TABLE_NOT_FOUND for unknown table', async () => {
    const deps = createMockDeps({});

    const result = await validateTableQrAccessCore({ table_number: 'B99' }, deps);

    expect(result.statusCode).toBe(404);
    expect(result.body.success).toBe(false);
    expect(result.body.error).toBe('TABLE_NOT_FOUND');
    expect(result.body.data).toBeUndefined();
  });

  it('returns 400 MISSING_TABLE_IDENTIFIER for empty or missing identifier', async () => {
    const deps = createMockDeps({});

    const missingResult = await validateTableQrAccessCore({}, deps);
    expect(missingResult.statusCode).toBe(400);
    expect(missingResult.body.success).toBe(false);
    expect(missingResult.body.error).toBe('MISSING_TABLE_IDENTIFIER');

    const blankResult = await validateTableQrAccessCore({ table_number: '   ' }, deps);
    expect(blankResult.statusCode).toBe(400);
    expect(blankResult.body.success).toBe(false);
    expect(blankResult.body.error).toBe('MISSING_TABLE_IDENTIFIER');
  });

  it('returns 500 INTERNAL_SERVER_ERROR if dependency lookup throws', async () => {
    const failingDeps: ValidateQrAccessDeps = {
      async findTableByNumber() {
        throw new Error('DB read timeout');
      },
      async findCheckedInReservation() {
        return null;
      },
    };

    const result = await validateTableQrAccessCore({ table_number: 'B01' }, failingDeps);

    expect(result.statusCode).toBe(500);
    expect(result.body.success).toBe(false);
    expect(result.body.error).toBe('INTERNAL_SERVER_ERROR');
    expect(result.body.message).toBe('DB read timeout');
  });
});
