import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn<() => Promise<void>>(),
  getAuthUser: vi.fn(),
  tableFindById: vi.fn(),
  tableFindOne: vi.fn(),
  tableFind: vi.fn(),
  tableFindOneAndUpdate: vi.fn(),
  tableLockFind: vi.fn(),
  tableLockFindOne: vi.fn(),
  tableLockFindOneAndUpdate: vi.fn(),
  tableLockCreate: vi.fn(),
  tableLockDeleteOne: vi.fn(),
  tableLockDeleteMany: vi.fn(),
  reservationFind: vi.fn(),
  reservationFindOne: vi.fn(),
  reservationFindOneAndUpdate: vi.fn(),
  reservationUpdateMany: vi.fn(),
  reservationCountDocuments: vi.fn(),
  transactionUpdateMany: vi.fn(),
}));

vi.mock('@/app/lib/db', () => ({
  default: mocks.connectDB,
  connectDB: mocks.connectDB,
}));

vi.mock('@/app/lib/auth', () => ({
  getAuthUser: mocks.getAuthUser,
}));

vi.mock('@/app/models/Table', () => ({
  TableStatus: {
    AVAILABLE: 'AVAILABLE',
    RESERVED: 'RESERVED',
    SEATED: 'SEATED',
    CLEANING: 'CLEANING',
  } as const,
  default: {
    findById: mocks.tableFindById,
    findOne: mocks.tableFindOne,
    find: mocks.tableFind,
    findOneAndUpdate: mocks.tableFindOneAndUpdate,
  },
}));

vi.mock('@/app/models/TableLock', () => ({
  TABLE_LOCK_TTL_SECONDS: 600,
  TABLE_LOCK_TTL_MS: 600000,
  TableLockReleaseReason: {
    PAYMENT_PAID: 'PAYMENT_PAID',
    USER_CANCELLED: 'USER_CANCELLED',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    EXPIRED: 'EXPIRED',
  } as const,
  default: {
    find: mocks.tableLockFind,
    findOne: mocks.tableLockFindOne,
    findOneAndUpdate: mocks.tableLockFindOneAndUpdate,
    create: mocks.tableLockCreate,
    deleteOne: mocks.tableLockDeleteOne,
    deleteMany: mocks.tableLockDeleteMany,
  },
}));

vi.mock('@/app/models/Reservation', () => ({
  ReservationStatus: {
    CONFIRMED: 'CONFIRMED',
    CHECKED_IN: 'CHECKED_IN',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  } as const,
  PaymentStatus: {
    UNPAID: 'UNPAID',
    PENDING: 'PENDING',
    PAID: 'PAID',
    FAILED: 'FAILED',
    EXPIRED: 'EXPIRED',
    REFUNDED: 'REFUNDED',
  } as const,
  default: {
    find: mocks.reservationFind,
    findOne: mocks.reservationFindOne,
    findOneAndUpdate: mocks.reservationFindOneAndUpdate,
    updateMany: mocks.reservationUpdateMany,
    countDocuments: mocks.reservationCountDocuments,
  },
}));

vi.mock('@/app/models/Transaction', () => ({
  default: {
    updateMany: mocks.transactionUpdateMany,
  },
}));

import {
  TABLE_LOCK_TTL_SECONDS,
  TableLockReleaseReason,
} from '@/app/models/TableLock';
import {
  acquireTableLock,
  buildTableLockKey,
  releaseExpiredLocksAndHolds,
  releaseTableLock,
} from '@/app/lib/tableLockService';
import {
  GET as tableLockGet,
  POST as tableLockPost,
} from '@/app/api/table-locks/route';
import { POST as tableLockReleasePost } from '@/app/api/table-locks/release/route';
import { GET as tableAvailabilityGet } from '@/app/api/tables/availability/route';

const TABLE_ID = '6717a01a1e0011a100000101';
const LOCK_ID = '6717a01a1e0011a100000401';
const RESERVATION_ID = '6717a01a1e0011a100000201';
const USER_ID_A = '6717a01a1e0011a100000301';
const SLOT_DATE = '2026-12-20';
const SLOT_TIME = '19:00';
const SLOT_LOCK_KEY = buildTableLockKey(TABLE_ID, SLOT_DATE, SLOT_TIME);

function mockSelectLean<T>(fnMock: ReturnType<typeof vi.fn>, value: T) {
  const lean = vi.fn().mockResolvedValue(value);
  const select = vi.fn().mockReturnValue({ lean });
  fnMock.mockReturnValue({ select, lean });
  return { select, lean };
}

function setupDefaultEmptyCleanup() {
  mockSelectLean(mocks.tableLockFind, []);
  mockSelectLean(mocks.reservationFind, []);
  mockSelectLean(mocks.reservationFindOne, null);
  mocks.tableLockDeleteMany.mockResolvedValue({ deletedCount: 0 });
  mocks.tableLockDeleteOne.mockResolvedValue({ deletedCount: 1 });
  mocks.transactionUpdateMany.mockResolvedValue({ modifiedCount: 0 });
  mocks.reservationUpdateMany.mockResolvedValue({ modifiedCount: 0 });
  mocks.reservationCountDocuments.mockResolvedValue(0);
  mocks.tableFindOneAndUpdate.mockResolvedValue(null);
}

describe('TK-129 & TK-130: Distributed Table Lock (TTL 10 phút) & Auto-Release', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connectDB.mockResolvedValue(undefined);
    mocks.getAuthUser.mockReturnValue(null);
    setupDefaultEmptyCleanup();
  });

  it('acquires a table lock with exact 600s (10-minute) TTL', async () => {
    const now = new Date('2026-11-20T10:00:00.000Z');
    const expectedExpiry = new Date(now.getTime() + 600_000);

    mocks.tableLockFindOneAndUpdate.mockResolvedValue(null);
    mocks.tableLockCreate.mockImplementation(async (payload: Record<string, unknown>) => ({
      _id: LOCK_ID,
      ...payload,
    }));

    const result = await acquireTableLock({
      tableId: TABLE_ID,
      tableNumber: 'b01',
      date: SLOT_DATE,
      time: SLOT_TIME,
      sessionId: 'sess_user_a',
      userId: USER_ID_A,
      now,
    });

    expect(TABLE_LOCK_TTL_SECONDS).toBe(600);
    expect(result.acquired).toBe(true);
    if (result.acquired) {
      expect(result.renewed).toBe(false);
      expect(result.lock.lockKey).toBe(SLOT_LOCK_KEY);
      expect(result.lock.tableNumber).toBe('B01');
      expect(result.lock.ttlSeconds).toBe(600);
      expect(result.lock.expiresAt).toBe(expectedExpiry.toISOString());
      expect(result.lock.sessionId).toBe('sess_user_a');
    }
  });

  it('preserves original expiresAt (does not reset 10m countdown) when the same sessionId re-acquires/binds reservationId while active', async () => {
    const step2CreatedAt = new Date('2026-11-20T10:00:00.000Z');
    const originalExpiry = new Date(step2CreatedAt.getTime() + 600_000);
    const step4ConfirmAt = new Date('2026-11-20T10:03:00.000Z');

    mocks.tableLockFindOneAndUpdate.mockResolvedValueOnce({
      _id: LOCK_ID,
      lockKey: SLOT_LOCK_KEY,
      tableId: TABLE_ID,
      tableNumber: 'B01',
      date: SLOT_DATE,
      time: SLOT_TIME,
      sessionId: 'sess_user_a',
      reservationId: RESERVATION_ID,
      expiresAt: originalExpiry,
    });

    const result = await acquireTableLock({
      tableId: TABLE_ID,
      tableNumber: 'B01',
      date: SLOT_DATE,
      time: SLOT_TIME,
      sessionId: 'sess_user_a',
      reservationId: RESERVATION_ID,
      now: step4ConfirmAt,
    });

    expect(result.acquired).toBe(true);
    if (result.acquired) {
      expect(result.renewed).toBe(true);
      expect(result.lock.expiresAt).toBe(originalExpiry.toISOString());
    }
    expect(mocks.tableLockFindOneAndUpdate).toHaveBeenCalledWith(
      {
        lockKey: SLOT_LOCK_KEY,
        sessionId: 'sess_user_a',
        expiresAt: { $gt: step4ConfirmAt },
      },
      expect.objectContaining({
        $set: expect.not.objectContaining({
          expiresAt: expect.anything(),
        }),
      }),
      { returnDocument: 'after' }
    );
    expect(mocks.tableLockCreate).not.toHaveBeenCalled();
  });

  it('prevents race condition when 2 users acquire lock concurrently (unique index E11000 -> 409 Conflict)', async () => {
    const now = new Date('2026-11-20T10:00:00.000Z');
    const lockedUntil = new Date(now.getTime() + 600_000);

    mocks.tableLockFindOneAndUpdate.mockResolvedValue(null);

    let insertAttempts = 0;
    mocks.tableLockCreate.mockImplementation(async (payload: Record<string, unknown>) => {
      insertAttempts += 1;
      if (insertAttempts === 1) {
        return { _id: LOCK_ID, ...payload };
      }
      const dupErr = new Error('E11000 duplicate key error collection: smares_db.table_locks') as Error & {
        code: number;
      };
      dupErr.code = 11000;
      throw dupErr;
    });
    mockSelectLean(mocks.tableLockFindOne, { expiresAt: lockedUntil });

    const [firstAttempt, secondAttempt] = await Promise.all([
      acquireTableLock({
        tableId: TABLE_ID,
        tableNumber: 'B01',
        date: SLOT_DATE,
        time: SLOT_TIME,
        sessionId: 'sess_user_a',
        now,
      }),
      acquireTableLock({
        tableId: TABLE_ID,
        tableNumber: 'B01',
        date: SLOT_DATE,
        time: SLOT_TIME,
        sessionId: 'sess_user_b',
        now,
      }),
    ]);

    const winners = [firstAttempt, secondAttempt].filter((r) => r.acquired);
    const blocked = [firstAttempt, secondAttempt].filter((r) => !r.acquired);

    expect(winners).toHaveLength(1);
    expect(blocked).toHaveLength(1);
    if (!blocked[0].acquired) {
      expect(blocked[0].conflictReason).toBe('TABLE_LOCKED');
      expect(blocked[0].lockedUntil?.toISOString()).toBe(lockedUntil.toISOString());
    }

    // Verify HTTP 409 response via POST /api/table-locks when locked by another user
    mockSelectLean(mocks.tableFindById, { _id: TABLE_ID, tableNumber: 'B01' });
    mocks.tableLockCreate.mockRejectedValueOnce(
      Object.assign(new Error('E11000 duplicate key'), { code: 11000 })
    );

    const req = new NextRequest('http://localhost:3000/api/table-locks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: TABLE_ID,
        date: SLOT_DATE,
        time: SLOT_TIME,
        sessionId: 'sess_user_b',
      }),
    });

    const response = await tableLockPost(req);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error).toBe('TABLE_LOCKED');
    expect(body.data.lockedUntil).toBe(lockedUntil.toISOString());
  });

  it('returns 409 ALREADY_RESERVED when slot overlaps an active CONFIRMED/CHECKED_IN reservation (180-minute window: 150m dining + 30m cleaning)', async () => {
    mockSelectLean(mocks.tableFindById, { _id: TABLE_ID, tableNumber: 'B01' });
    // Lần 1 (cleanup expired): [], lần 2 (same-day active reservations): đơn 19:00 (ăn tới 21:30 + dọn tới 22:00) chồng lấn với 21:45
    mocks.reservationFind
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: RESERVATION_ID,
              time: '19:00',
              startTime: new Date('2026-12-20T12:00:00.000Z'),
              endTime: new Date('2026-12-20T14:30:00.000Z'),
              paymentStatus: 'PAID',
            },
          ]),
        }),
      });

    const req = new NextRequest('http://localhost:3000/api/table-locks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: TABLE_ID,
        date: SLOT_DATE,
        time: '21:45',
        sessionId: 'sess_user_c',
      }),
    });

    const response = await tableLockPost(req);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error).toBe('ALREADY_RESERVED');
    expect(mocks.reservationFind).toHaveBeenLastCalledWith({
      tableId: TABLE_ID,
      date: SLOT_DATE,
      status: { $in: ['CONFIRMED', 'CHECKED_IN'] },
    });
  });

  it('returns 409 TABLE_LOCKED when another session holds an overlapping lock (19:00 vs 21:45) and releases previous unlinked lock of same session when switching tables', async () => {
    const now = new Date('2026-11-20T10:00:00.000Z');
    const otherExpiry = new Date(now.getTime() + 500_000);

    // Lần 1: cleanup trả [], lần 2: activeOtherLocks trả lock lúc 19:00 của sess_user_a
    mocks.tableLockFind
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { _id: LOCK_ID, time: '19:00', expiresAt: otherExpiry },
          ]),
        }),
      });

    const overlapRes = await acquireTableLock({
      tableId: TABLE_ID,
      tableNumber: 'B01',
      date: SLOT_DATE,
      time: '21:45',
      sessionId: 'sess_user_b',
      now,
    });

    expect(overlapRes.acquired).toBe(false);
    if (!overlapRes.acquired) {
      expect(overlapRes.conflictReason).toBe('TABLE_LOCKED');
      expect(overlapRes.lockedUntil?.toISOString()).toBe(otherExpiry.toISOString());
    }

    // Khi cùng session chuyển sang bàn khác ở Bước 2 -> xóa mọi lock sơ đồ cũ của session đó
    setupDefaultEmptyCleanup();
    mocks.tableLockFindOneAndUpdate.mockResolvedValue(null);
    mocks.tableLockCreate.mockImplementation(async (payload: Record<string, unknown>) => ({
      _id: LOCK_ID,
      ...payload,
    }));

    const table2Id = '6717a01a1e0011a100000102';
    const switchRes = await acquireTableLock({
      tableId: table2Id,
      tableNumber: 'B02',
      date: SLOT_DATE,
      time: SLOT_TIME,
      sessionId: 'sess_user_a',
      now,
    });

    expect(switchRes.acquired).toBe(true);
    expect(mocks.tableLockDeleteMany).toHaveBeenCalledWith({
      sessionId: 'sess_user_a',
      lockKey: { $ne: buildTableLockKey(table2Id, SLOT_DATE, SLOT_TIME) },
      reservationId: null,
    });
  });

  it('auto-releases expired 10-minute locks, marks tx/reservation EXPIRED, frees table & allows new user', async () => {
    const expiredNow = new Date('2026-11-20T10:10:01.000Z');
    const newExpiry = new Date(expiredNow.getTime() + 600_000);

    // Giả lập lock + reservation đã quá hạn 10 phút
    mockSelectLean(mocks.tableLockFind, [
      { _id: LOCK_ID, reservationId: RESERVATION_ID, tableId: TABLE_ID },
    ]);
    mockSelectLean(mocks.reservationFind, [{ _id: RESERVATION_ID, tableId: TABLE_ID }]);
    mocks.tableLockDeleteMany.mockResolvedValue({ deletedCount: 1 });
    mocks.transactionUpdateMany.mockResolvedValue({ modifiedCount: 1 });
    mocks.reservationUpdateMany.mockResolvedValue({ modifiedCount: 1 });
    mocks.reservationCountDocuments.mockResolvedValue(0);

    const cleanupRes = await releaseExpiredLocksAndHolds({
      tableId: TABLE_ID,
      date: SLOT_DATE,
      time: SLOT_TIME,
      now: expiredNow,
    });

    expect(cleanupRes).toEqual({
      expiredLocksCount: 1,
      expiredTransactionsCount: 1,
      expiredReservationsCount: 1,
    });

    expect(mocks.transactionUpdateMany).toHaveBeenCalledWith(
      { reservationId: { $in: [RESERVATION_ID] }, status: 'PENDING' },
      { $set: { status: 'EXPIRED' } }
    );
    expect(mocks.reservationUpdateMany).toHaveBeenCalledWith(
      {
        _id: { $in: [RESERVATION_ID] },
        paymentStatus: { $ne: 'PAID' },
        status: { $ne: 'CANCELLED' },
      },
      {
        $set: {
          paymentStatus: 'EXPIRED',
          status: 'CANCELLED',
          holdExpiresAt: null,
        },
      }
    );
    expect(mocks.tableFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: TABLE_ID, status: 'RESERVED' },
      { $set: { status: 'AVAILABLE' } }
    );

    // Sau khi hết hạn, user khác giành khóa thành công ngay lập tức
    setupDefaultEmptyCleanup();
    mocks.tableLockFindOneAndUpdate.mockResolvedValueOnce({
      _id: LOCK_ID,
      lockKey: SLOT_LOCK_KEY,
      tableId: TABLE_ID,
      tableNumber: 'B01',
      date: SLOT_DATE,
      time: SLOT_TIME,
      sessionId: 'sess_user_b',
      reservationId: null,
      expiresAt: newExpiry,
    });

    const reclaimResult = await acquireTableLock({
      tableId: TABLE_ID,
      tableNumber: 'B01',
      date: SLOT_DATE,
      time: SLOT_TIME,
      sessionId: 'sess_user_b',
      now: expiredNow,
    });

    expect(reclaimResult.acquired).toBe(true);
    if (reclaimResult.acquired) {
      expect(reclaimResult.lock.sessionId).toBe('sess_user_b');
    }
  });

  it('releases lock & marks tx/reservation FAILED when user cancels payment via POST /api/table-locks/release', async () => {
    const activeExpiry = new Date(Date.now() + 500_000);
    mockSelectLean(mocks.tableLockFindOne, {
      _id: LOCK_ID,
      lockKey: SLOT_LOCK_KEY,
      tableId: TABLE_ID,
      date: SLOT_DATE,
      time: SLOT_TIME,
      sessionId: 'sess_owner',
      reservationId: RESERVATION_ID,
      expiresAt: activeExpiry,
    });
    mocks.reservationFindOneAndUpdate.mockResolvedValue({
      _id: RESERVATION_ID,
      tableId: TABLE_ID,
      status: 'CANCELLED',
      paymentStatus: 'FAILED',
    });
    mocks.reservationCountDocuments.mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/table-locks/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: TABLE_ID,
        date: SLOT_DATE,
        time: SLOT_TIME,
        sessionId: 'sess_owner',
        reason: TableLockReleaseReason.USER_CANCELLED,
      }),
    });

    const response = await tableLockReleasePost(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.released).toBe(true);
    expect(body.data.updatedPaymentStatus).toBe('FAILED');
    expect(body.data.updatedReservationStatus).toBe('CANCELLED');
    expect(mocks.tableLockDeleteOne).toHaveBeenCalledWith({ _id: LOCK_ID });
    expect(mocks.transactionUpdateMany).toHaveBeenCalledWith(
      { reservationId: RESERVATION_ID, status: 'PENDING' },
      { $set: { status: 'FAILED' } }
    );
    expect(mocks.tableFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: TABLE_ID, status: 'RESERVED' },
      { $set: { status: 'AVAILABLE' } }
    );
  });

  it('returns 403 Forbidden if a different session tries to release an active lock', async () => {
    const activeExpiry = new Date(Date.now() + 500_000);
    mockSelectLean(mocks.tableLockFindOne, {
      _id: LOCK_ID,
      lockKey: SLOT_LOCK_KEY,
      tableId: TABLE_ID,
      sessionId: 'sess_owner',
      reservationId: RESERVATION_ID,
      expiresAt: activeExpiry,
    });

    const req = new NextRequest('http://localhost:3000/api/table-locks/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lockKey: SLOT_LOCK_KEY,
        sessionId: 'sess_attacker',
      }),
    });

    const response = await tableLockReleasePost(req);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toBe('FORBIDDEN_LOCK_SESSION');
    expect(mocks.tableLockDeleteOne).not.toHaveBeenCalled();
  });

  it('never cancels or overwrites a reservation that is already PAID during FAILED release', async () => {
    mockSelectLean(mocks.tableLockFindOne, null);
    mocks.reservationFindOneAndUpdate.mockResolvedValue(null);

    const releaseRes = await releaseTableLock({
      reservationId: RESERVATION_ID,
      tableId: TABLE_ID,
      sessionId: 'sess_owner',
      force: true,
      reason: TableLockReleaseReason.PAYMENT_FAILED,
    });

    expect(mocks.reservationFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: RESERVATION_ID,
        paymentStatus: { $ne: 'PAID' },
      },
      {
        $set: {
          paymentStatus: 'FAILED',
          status: 'CANCELLED',
          holdExpiresAt: null,
        },
      },
      { returnDocument: 'after' }
    );
    expect(releaseRes.updatedReservationStatus).toBeNull();
    expect(mocks.tableFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('marks locked tables as unavailable in GET /api/tables/availability and releases once expired', async () => {
    const sortMock = vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: TABLE_ID,
          tableNumber: 'B01',
          capacity: 4,
          zoneName: 'Khu Trung Tâm',
          status: 'AVAILABLE',
        },
      ]),
    });
    const selectTableMock = vi.fn().mockReturnValue({ sort: sortMock });
    mocks.tableFind.mockReturnValue({ select: selectTableMock });

    const futureExpiry = new Date(Date.now() + 300_000);
    // Lần 1: cleanup find trả [], sau đó query activeLocks trong Promise.all trả về futureExpiry
    mocks.tableLockFind
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
      })
      .mockReturnValueOnce({
        select: vi
          .fn()
          .mockReturnValue({
            lean: vi.fn().mockResolvedValue([{ tableId: TABLE_ID, expiresAt: futureExpiry }]),
          }),
      });
    mocks.reservationFind
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
      });

    const req1 = new NextRequest(
      `http://localhost:3000/api/tables/availability?date=${SLOT_DATE}&time=${SLOT_TIME}&guests=2`
    );
    const res1 = await tableAvailabilityGet(req1);
    const data1 = await res1.json();

    expect(res1.status).toBe(200);
    expect(data1.tables[0].isLocked).toBe(true);
    expect(data1.tables[0].isAvailable).toBe(false);
    expect(data1.tables[0].lockedUntil).toBe(futureExpiry.toISOString());

    // Lần 2: khi lock hết hạn -> trả isLocked=false, isAvailable=true
    mocks.tableLockFind
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
      });
    mocks.reservationFind
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
      });

    const req2 = new NextRequest(
      `http://localhost:3000/api/tables/availability?date=${SLOT_DATE}&time=${SLOT_TIME}&guests=2`
    );
    const res2 = await tableAvailabilityGet(req2);
    const data2 = await res2.json();

    expect(res2.status).toBe(200);
    expect(data2.tables[0].isLocked).toBe(false);
    expect(data2.tables[0].isAvailable).toBe(true);
    expect(data2.tables[0].lockedUntil).toBeNull();

    // Lần 3: truyền sessionId của chính chủ khóa -> nhận diện isLockedByCurrentSession=true & isAvailable=true (cho phép đi tiếp)
    mocks.tableLockFind
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              tableId: TABLE_ID,
              time: '19:00',
              sessionId: 'sess_owner',
              expiresAt: futureExpiry,
            },
          ]),
        }),
      });
    mocks.reservationFind
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
      });

    const reqOwn = new NextRequest(
      `http://localhost:3000/api/tables/availability?date=${SLOT_DATE}&time=19:15&guests=2&sessionId=sess_owner`
    );
    const resOwn = await tableAvailabilityGet(reqOwn);
    const dataOwn = await resOwn.json();

    expect(resOwn.status).toBe(200);
    expect(dataOwn.tables[0].isLockedByCurrentSession).toBe(true);
    expect(dataOwn.tables[0].isLocked).toBe(false);
    expect(dataOwn.tables[0].isAvailable).toBe(true);
    expect(dataOwn.tables[0].lockedUntil).toBe(futureExpiry.toISOString());
    expect(dataOwn.tables[0].sessionId).toBeUndefined();
  });

  it('checks lock status via GET /api/table-locks without leaking sessionId and rejects invalid release reason', async () => {
    const futureExpiry = new Date(Date.now() + 240_000);
    mockSelectLean(mocks.tableLockFindOne, {
      lockKey: SLOT_LOCK_KEY,
      expiresAt: futureExpiry,
    });

    const statusReq = new NextRequest(
      `http://localhost:3000/api/table-locks?tableId=${TABLE_ID}&date=${SLOT_DATE}&time=${SLOT_TIME}`
    );
    const statusRes = await tableLockGet(statusReq);
    const statusBody = await statusRes.json();

    expect(statusRes.status).toBe(200);
    expect(statusBody.data.isLocked).toBe(true);
    expect(statusBody.data.remainingSeconds).toBeGreaterThan(0);
    expect(statusBody.data.sessionId).toBeUndefined();

    // Không cho phép truyền reason=PAYMENT_PAID từ public release endpoint
    const badReleaseReq = new NextRequest('http://localhost:3000/api/table-locks/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lockKey: SLOT_LOCK_KEY,
        sessionId: 'sess_owner',
        reason: 'PAYMENT_PAID',
      }),
    });
    const badReleaseRes = await tableLockReleasePost(badReleaseReq);
    expect(badReleaseRes.status).toBe(400);
  });
});
