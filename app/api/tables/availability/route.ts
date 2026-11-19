import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import { parseVietnamDateTime } from '@/app/lib/reservationHelpers';
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
    // Giải phóng các khóa giữ chỗ đã quá hạn 10 phút trước khi truy vấn bàn trống
    await releaseExpiredLocksAndHolds({ date, time, now });

    const [tables, bookedReservations, activeLocks] = await Promise.all([
      Table.find({ capacity: { $gte: guests } })
        .select('_id tableNumber capacity zoneName status')
        .sort({ tableNumber: 1 })
        .lean(),
      Reservation.find({
        date,
        time,
        status: { $ne: ReservationStatus.CANCELLED },
      })
        .select('tableId')
        .lean(),
      TableLock.find({
        date,
        time,
        expiresAt: { $gt: now },
      })
        .select('tableId expiresAt')
        .lean(),
    ]);

    const bookedTableIds = new Set(bookedReservations.map((res) => String(res.tableId)));
    const lockedUntilByTableId = new Map<string, string>();
    for (const lock of activeLocks) {
      const expiresIso =
        lock.expiresAt instanceof Date
          ? lock.expiresAt.toISOString()
          : new Date(lock.expiresAt).toISOString();
      lockedUntilByTableId.set(String(lock.tableId), expiresIso);
    }

    const availabilityList = tables.map((table) => {
      const tableKey = String(table._id);
      const lockedUntil = lockedUntilByTableId.get(tableKey) ?? null;
      const isLocked = lockedUntil !== null;
      return {
        id: tableKey,
        tableNumber: table.tableNumber || '',
        capacity: table.capacity,
        zoneName: table.zoneName || 'Khu vực chính',
        status: table.status,
        isLocked,
        lockedUntil,
        isAvailable: !bookedTableIds.has(tableKey) && !isLocked,
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
