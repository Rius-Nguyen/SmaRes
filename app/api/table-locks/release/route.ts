import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/app/lib/db';
import { releaseTableLock } from '@/app/lib/tableLockService';
import { TableLockReleaseReason } from '@/app/models/TableLock';

export const dynamic = 'force-dynamic';

const PUBLIC_RELEASE_REASONS: readonly TableLockReleaseReason[] = [
  TableLockReleaseReason.USER_CANCELLED,
  TableLockReleaseReason.PAYMENT_FAILED,
  TableLockReleaseReason.EXPIRED,
];

function isPublicReleaseReason(value: string): value is TableLockReleaseReason {
  return (PUBLIC_RELEASE_REASONS as readonly string[]).includes(value);
}

export async function POST(request: NextRequest) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu JSON không hợp lệ.', error: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    if (typeof rawBody !== 'object' || rawBody === null) {
      return NextResponse.json(
        { success: false, message: 'Payload yêu cầu không hợp lệ.', error: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    const body = rawBody as Record<string, unknown>;
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    const lockKey = typeof body.lockKey === 'string' ? body.lockKey.trim() : '';
    const tableId = typeof body.tableId === 'string' ? body.tableId.trim() : '';
    const date = typeof body.date === 'string' ? body.date.trim() : '';
    const time = typeof body.time === 'string' ? body.time.trim() : '';
    const reservationId =
      typeof body.reservationId === 'string' ? body.reservationId.trim() : '';
    const rawReason =
      typeof body.reason === 'string'
        ? body.reason.trim().toUpperCase()
        : TableLockReleaseReason.USER_CANCELLED;

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Vui lòng cung cấp mã phiên giữ bàn (sessionId).',
          error: 'MISSING_SESSION_ID',
        },
        { status: 400 }
      );
    }

    if (!lockKey && !reservationId && !(tableId && date && time)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Vui lòng cung cấp lockKey, reservationId hoặc bộ ba (tableId, date, time).',
          error: 'MISSING_LOCK_LOCATOR',
        },
        { status: 400 }
      );
    }

    if (tableId && !Types.ObjectId.isValid(tableId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Mã bàn (tableId) không đúng định dạng ObjectId.',
          error: 'INVALID_TABLE_ID',
        },
        { status: 400 }
      );
    }

    if (reservationId && !Types.ObjectId.isValid(reservationId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Mã đơn đặt bàn (reservationId) không đúng định dạng ObjectId.',
          error: 'INVALID_RESERVATION_ID',
        },
        { status: 400 }
      );
    }

    if (!isPublicReleaseReason(rawReason)) {
      return NextResponse.json(
        {
          success: false,
          message: `Lý do giải phóng không hợp lệ. Cho phép: ${PUBLIC_RELEASE_REASONS.join(', ')}.`,
          error: 'INVALID_RELEASE_REASON',
        },
        { status: 400 }
      );
    }

    await connectDB();

    const result = await releaseTableLock({
      lockKey: lockKey || undefined,
      tableId: tableId || undefined,
      date: date || undefined,
      time: time || undefined,
      reservationId: reservationId || undefined,
      sessionId,
      force: false,
      reason: rawReason,
    });

    if (result.forbidden) {
      return NextResponse.json(
        {
          success: false,
          message: result.message || 'Bạn không có quyền giải phóng khóa bàn này.',
          error: 'FORBIDDEN_LOCK_SESSION',
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Đã giải phóng khóa bàn.',
        data: {
          released: result.released,
          lockKey: result.lockKey,
          reservationId: result.reservationId,
          updatedPaymentStatus: result.updatedPaymentStatus,
          updatedReservationStatus: result.updatedReservationStatus,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi khi giải phóng khóa bàn:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi hệ thống server.' },
      { status: 500 }
    );
  }
}
