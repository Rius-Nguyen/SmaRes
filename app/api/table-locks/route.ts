import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/app/lib/db';
import { getAuthUser } from '@/app/lib/auth';
import { parseVietnamDateTime } from '@/app/lib/reservationHelpers';
import {
  acquireTableLock,
  buildTableLockKey,
  releaseExpiredLocksAndHolds,
} from '@/app/lib/tableLockService';
import Table from '@/app/models/Table';
import TableLock from '@/app/models/TableLock';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLockKey = searchParams.get('lockKey')?.trim() ?? '';
    const tableId = searchParams.get('tableId')?.trim() ?? '';
    const date = searchParams.get('date')?.trim() ?? '';
    const time = searchParams.get('time')?.trim() ?? '';

    const lockKey = rawLockKey || (tableId && date && time ? buildTableLockKey(tableId, date, time) : '');

    if (!lockKey) {
      return NextResponse.json(
        {
          success: false,
          message: 'Vui lòng cung cấp lockKey hoặc bộ ba (tableId, date, time).',
          error: 'MISSING_LOCK_IDENTIFIER',
        },
        { status: 400 }
      );
    }

    await connectDB();

    const now = new Date();
    if (tableId && date && time) {
      await releaseExpiredLocksAndHolds({ tableId, date, time, now });
    } else {
      await releaseExpiredLocksAndHolds({ now });
    }

    const activeLock = await TableLock.findOne({
      lockKey,
      expiresAt: { $gt: now },
    })
      .select('lockKey expiresAt')
      .lean();

    if (!activeLock) {
      return NextResponse.json(
        {
          success: true,
          data: {
            isLocked: false,
            lockKey,
            expiresAt: null,
            remainingSeconds: 0,
          },
        },
        { status: 200 }
      );
    }

    const expiresAtDate =
      activeLock.expiresAt instanceof Date
        ? activeLock.expiresAt
        : new Date(activeLock.expiresAt);
    const remainingSeconds = Math.max(
      0,
      Math.ceil((expiresAtDate.getTime() - now.getTime()) / 1000)
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          isLocked: true,
          lockKey: activeLock.lockKey,
          expiresAt: expiresAtDate.toISOString(),
          remainingSeconds,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi khi kiểm tra trạng thái khóa bàn:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi hệ thống server.' },
      { status: 500 }
    );
  }
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
    const tableId = typeof body.tableId === 'string' ? body.tableId.trim() : '';
    const tableNumber =
      typeof body.tableNumber === 'string' ? body.tableNumber.trim().toUpperCase() : '';
    const date = typeof body.date === 'string' ? body.date.trim() : '';
    const time = typeof body.time === 'string' ? body.time.trim() : '';
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    const reservationId =
      typeof body.reservationId === 'string' ? body.reservationId.trim() : '';

    if ((!tableId && !tableNumber) || !date || !time) {
      return NextResponse.json(
        {
          success: false,
          message: 'Vui lòng cung cấp đầy đủ: tableId hoặc tableNumber, date, time.',
          error: 'MISSING_FIELDS',
        },
        { status: 400 }
      );
    }

    if (Number.isNaN(parseVietnamDateTime(date, time))) {
      return NextResponse.json(
        {
          success: false,
          message: 'Ngày hoặc khung giờ không hợp lệ (YYYY-MM-DD và HH:mm).',
          error: 'INVALID_SLOT',
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

    await connectDB();

    const table = tableId
      ? await Table.findById(tableId).select('_id tableNumber').lean()
      : await Table.findOne({ tableNumber }).select('_id tableNumber').lean();

    if (!table) {
      return NextResponse.json(
        {
          success: false,
          message: 'Không tìm thấy bàn được chọn.',
          error: 'TABLE_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const user = getAuthUser(request);

    const lockResult = await acquireTableLock({
      tableId: String(table._id),
      tableNumber: table.tableNumber || tableNumber,
      date,
      time,
      sessionId: sessionId || undefined,
      userId: user?.userId ?? null,
      reservationId: reservationId || null,
    });

    if (!lockResult.acquired) {
      return NextResponse.json(
        {
          success: false,
          message: lockResult.message,
          error: lockResult.conflictReason,
          data: {
            lockedUntil: lockResult.lockedUntil
              ? lockResult.lockedUntil.toISOString()
              : null,
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Đã giữ chỗ bàn tạm thời trong 10 phút.',
        data: lockResult.lock,
      },
      { status: lockResult.renewed ? 200 : 201 }
    );
  } catch (error: unknown) {
    console.error('Lỗi khi khóa bàn tạm thời:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi hệ thống server.' },
      { status: 500 }
    );
  }
}
