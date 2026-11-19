import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/db';
import Table from '@/app/models/Table';
import Reservation from '@/app/models/Reservation';

export const dynamic = 'force-dynamic';

// Xử lý GET request kiểm tra bàn trống thời gian thực (TK-125)
export async function GET(request) {
  try {
    await connectDB();

    // Đọc Query Params từ URL (VD: ?date=2026-10-25&time=19:00&guests=4)
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const time = searchParams.get('time');
    const guests = parseInt(searchParams.get('guests') || '1', 10);

    // Validate dữ liệu truyền vào
    if (!date || !time) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng cung cấp đầy đủ tham số ?date=YYYY-MM-DD&time=HH:mm' },
        { status: 400 }
      );
    }

    const cleanDate = date.trim();
    const cleanTime = time.trim();

    // 1. Tìm các đơn đặt bàn trùng ngày, giờ và trạng thái không phải hủy ('cancelled')
    const bookedReservations = await Reservation.find({
      $or: [
        { date: cleanDate, time: cleanTime },
        { date: cleanDate, timeSlot: cleanTime }
      ],
      status: { $ne: 'cancelled' }
    }).lean();

    // 2. Thu thập danh sách ID và số bàn đã bị đặt
    const bookedTableIds = new Set();
    const bookedTableNumbers = new Set();

    bookedReservations.forEach((r) => {
      if (r.tableId) bookedTableIds.add(r.tableId.toString());
      if (r.tableNumber) bookedTableNumbers.add(String(r.tableNumber).trim().toUpperCase());
      if (r.table_number) bookedTableNumbers.add(String(r.table_number).trim().toUpperCase());
    });

    // 3. Lấy tất cả các bàn trong cơ sở dữ liệu
    const tables = await Table.find({}).lean();

    // 4. Đồng bộ danh sách bàn và cờ isAvailable
    const availabilityList = tables.map((table) => {
      const tNum = String(table.tableNumber || table.table_number || '').trim().toUpperCase();
      const isBooked =
        bookedTableIds.has(table._id.toString()) ||
        (tNum && bookedTableNumbers.has(tNum));

      return {
        id: table._id.toString(),
        tableNumber: table.tableNumber || table.table_number,
        capacity: table.capacity,
        zone_name: table.zone_name || 'Khu vực chính',
        status: isBooked ? 'occupied' : (table.status === 'occupied' ? 'occupied' : 'available'),
        isAvailable: !isBooked && table.status !== 'occupied'
      };
    });

    return NextResponse.json(
      {
        success: true,
        query: { date: cleanDate, time: cleanTime, guests },
        bookedTableNumbers: Array.from(bookedTableNumbers),
        tables: availabilityList
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      }
    );
  } catch (error) {
    console.error('Lỗi khi kiểm tra bàn trống:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi hệ thống server khi kiểm tra tình trạng bàn.' },
      { status: 500 }
    );
  }
}
