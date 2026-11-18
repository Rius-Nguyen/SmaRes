import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import Table, { TableStatus } from '@/backend/src/models/table.model';
import Reservation, { ReservationStatus } from '@/backend/src/models/reservation.model';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Đảm bảo kết nối MongoDB
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const rawTableNumber = body?.table_number;

    // Bước 1: Chuẩn hóa table_number (trim, uppercase). Nếu rỗng -> 400
    if (!rawTableNumber || typeof rawTableNumber !== 'string' || !rawTableNumber.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_TABLE_IDENTIFIER',
          message: 'Vui lòng cung cấp số bàn hoặc mã QR hợp lệ.',
        },
        { status: 400 }
      );
    }

    const tableNumber = rawTableNumber.trim().toUpperCase();

    // Bước 2: Query Table.findOne({ table_number })
    const table = await Table.findOne({
      $or: [{ table_number: tableNumber }, { tableNumber: tableNumber }],
    });

    if (!table) {
      return NextResponse.json(
        {
          success: false,
          error: 'TABLE_NOT_FOUND',
          message: 'Không tìm thấy thông tin bàn ăn trong hệ thống.',
        },
        { status: 404 }
      );
    }

    // Bước 3 (CỐT LÕI): Kiểm tra table.status !== TableStatus.SEATED -> 403 Forbidden
    if (table.status !== TableStatus.SEATED) {
      return NextResponse.json(
        {
          success: false,
          error: 'TABLE_NOT_OCCUPIED',
          message:
            'Bàn ăn hiện chưa được kích hoạt phục vụ. Quý khách vui lòng làm thủ tục Check-in hoặc liên hệ nhân viên trước khi gọi món.',
          data: {
            can_order: false,
            table_number: table.table_number,
            status: table.status,
            zone_name: table.zone_name,
          },
        },
        { status: 403 }
      );
    }

    // Bước 4: Nếu SEATED, truy vấn Reservation đang Check-in
    let reservation = await Reservation.findOne({
      table_id: table._id,
      status: ReservationStatus.CHECKED_IN,
    }).sort({ updatedAt: -1, createdAt: -1 });

    if (!reservation) {
      reservation = await Reservation.findOne({
        table_number: table.table_number,
        status: ReservationStatus.CHECKED_IN,
      }).sort({ updatedAt: -1, createdAt: -1 });
    }

    // Bước 5: Trả về HTTP 200 OK thành công
    return NextResponse.json(
      {
        success: true,
        message: 'Bàn ăn đã được kích hoạt phiên phục vụ. Quý khách có thể bắt đầu gọi món.',
        data: {
          can_order: true,
          table_id: table._id,
          table_number: table.table_number,
          zone_name: table.zone_name,
          status: table.status,
          reservation_id: reservation?._id || null,
          customer_name: reservation?.customer_name || 'Khách tại bàn',
          check_in_time:
            reservation?.check_in_time || reservation?.updatedAt || table.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Lỗi POST /api/v1/tables/validate-qr-access:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: error?.message || 'Đã xảy ra lỗi hệ thống khi kiểm tra tính hợp lệ của bàn ăn.',
      },
      { status: 500 }
    );
  }
}
