import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import {
  BOOKING_MIN_ADVANCE_MS,
  DINING_DURATION_MS,
  computeSlotBlockInterval,
  doDateIntervalsOverlap,
  doTimeSlotsOverlap,
  extendEndTimeWithCleaningBuffer,
  parseVietnamDateTime,
} from '@/app/lib/reservationHelpers';
import { releaseExpiredLocksAndHolds } from '@/app/lib/tableLockService';
import Table from '@/app/models/Table';
import TableLock from '@/app/models/TableLock';
import Reservation, { ReservationStatus } from '@/app/models/Reservation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date')?.trim() ?? '';
    const time = searchParams.get('time')?.trim() ?? '';
    const currentSessionId = searchParams.get('sessionId')?.trim() ?? '';
    const parsedGuests = Number.parseInt(searchParams.get('guests') ?? '', 10);
    const guests = Number.isNaN(parsedGuests) || parsedGuests < 1 ? 1 : parsedGuests;

    if (!date || !time || Number.isNaN(parseVietnamDateTime(date, time))) {
      return NextResponse.json(
        {
          success: false,
          message: 'Vui lòng cung cấp đầy đủ tham số hợp lệ ?date=YYYY-MM-DD&time=HH:mm',
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const requestedBlockInterval = computeSlotBlockInterval(date, time);
    // Giải phóng các khóa giữ chỗ đã quá hạn 10 phút trên ngày này trước khi truy vấn bàn trống
    await releaseExpiredLocksAndHolds({ date, now });

    const [tables, sameDayReservations, sameDayLocks] = await Promise.all([
      Table.find({ capacity: { $gte: guests } })
        .select('_id tableNumber capacity zoneName status cleaningDeadlineAt updatedAt')
        .sort({ tableNumber: 1 })
        .lean(),
      Reservation.find({
        date,
        status: { $in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] },
      })
        .select('tableId time startTime endTime')
        .lean(),
      TableLock.find({
        date,
        expiresAt: { $gt: now },
      })
        .select('tableId time sessionId expiresAt')
        .lean(),
    ]);

    const bookedTableIds = new Set(
      sameDayReservations
        .filter((res) => {
          if (requestedBlockInterval && res.startTime && res.endTime) {
            const resBlockedEnd = extendEndTimeWithCleaningBuffer(res.endTime) ?? res.endTime;
            return doDateIntervalsOverlap(
              requestedBlockInterval.startTime,
              requestedBlockInterval.endTime,
              res.startTime,
              resBlockedEnd
            );
          }
          return !res.time || doTimeSlotsOverlap(res.time, time);
        })
        .map((res) => String(res.tableId))
    );

    const otherLockedUntilByTableId = new Map<string, string>();
    const ownLockedUntilByTableId = new Map<string, string>();

    for (const lock of sameDayLocks) {
      if (lock.time && !doTimeSlotsOverlap(lock.time, time)) {
        continue;
      }
      const tableKey = String(lock.tableId);
      const expiresIso =
        lock.expiresAt instanceof Date
          ? lock.expiresAt.toISOString()
          : new Date(lock.expiresAt).toISOString();

      if (currentSessionId && lock.sessionId === currentSessionId) {
        ownLockedUntilByTableId.set(tableKey, expiresIso);
      } else {
        const prev = otherLockedUntilByTableId.get(tableKey);
        if (!prev || Date.parse(expiresIso) > Date.parse(prev)) {
          otherLockedUntilByTableId.set(tableKey, expiresIso);
        }
      }
    }

    const requestedStartMs = requestedBlockInterval
      ? requestedBlockInterval.startTime.getTime()
      : parseVietnamDateTime(date, time);
    const nowMs = now.getTime();

    const availabilityList = tables.map((table) => {
      const tableKey = String(table._id);
      const isBooked = bookedTableIds.has(tableKey);
      const otherLockedUntil = otherLockedUntilByTableId.get(tableKey) ?? null;
      const ownLockedUntil = ownLockedUntilByTableId.get(tableKey) ?? null;
      const isLockedByCurrentSession = ownLockedUntil !== null;
      const isLocked = otherLockedUntil !== null;
      const lockedUntil = otherLockedUntil ?? ownLockedUntil ?? null;

      // Kiểm tra trạng thái CLEANING chưa dọn xong trước giờ hẹn mới
      const cleaningDeadlineMs = table.cleaningDeadlineAt
        ? new Date(table.cleaningDeadlineAt).getTime()
        : Number.NaN;
      const blockedByCleaning =
        table.status === 'CLEANING' &&
        Number.isFinite(cleaningDeadlineMs) &&
        cleaningDeadlineMs > requestedStartMs;

      // Kiểm tra bàn đang SEATED quá 150 phút mà khung giờ mới sát hiện tại (chưa kịp sẵn sàng trong +30p)
      const tableUpdatedMs = table.updatedAt ? new Date(table.updatedAt).getTime() : Number.NaN;
      const isSeatedOverdue =
        table.status === 'SEATED' &&
        Number.isFinite(tableUpdatedMs) &&
        nowMs > tableUpdatedMs + DINING_DURATION_MS;
      const blockedByOverdueSeated =
        isSeatedOverdue && requestedStartMs < nowMs + BOOKING_MIN_ADVANCE_MS;

      return {
        id: tableKey,
        tableNumber: table.tableNumber || '',
        capacity: table.capacity,
        zoneName: table.zoneName || 'Khu vực chính',
        status: table.status,
        isBooked,
        isLocked,
        isLockedByCurrentSession,
        lockedUntil,
        isAvailable: !isBooked && !isLocked && !blockedByCleaning && !blockedByOverdueSeated,
      };
    });

    return NextResponse.json(
      {
        success: true,
        query: { date, time, guests },
        tables: availabilityList,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi khi kiểm tra bàn trống:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi hệ thống server.' },
      { status: 500 }
    );
  }
}
