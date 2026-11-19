import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import { parseVietnamDateTime } from '@/app/lib/reservationHelpers';
import Table from '@/app/models/Table';
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

    const [tables, bookedReservations] = await Promise.all([
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
    ]);

    const bookedTableIds = new Set(bookedReservations.map((res) => String(res.tableId)));

    const availabilityList = tables.map((table) => ({
      id: String(table._id),
      tableNumber: table.tableNumber || '',
      capacity: table.capacity,
      zoneName: table.zoneName || 'Khu vực chính',
      status: table.status,
      isAvailable: !bookedTableIds.has(String(table._id)),
    }));

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
