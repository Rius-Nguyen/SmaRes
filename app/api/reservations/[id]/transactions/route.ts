import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/app/lib/db';
import Transaction from '@/app/models/Transaction';
import Reservation from '@/app/models/Reservation';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await context.params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'Vui lòng cung cấp mã đơn đặt bàn hợp lệ.',
          error: 'MISSING_RESERVATION_ID',
        },
        { status: 400 }
      );
    }

    let targetReservationId: string = id;

    // Kiểm tra tính hợp lệ của ObjectId để tránh CastError
    if (!Types.ObjectId.isValid(id)) {
      // Hỗ trợ tra cứu phụ nếu khách truyền vào bookingCode (VD: SR-2026-1234)
      const reservationByCode = await Reservation.findOne({
        bookingCode: id.trim(),
      }).select('_id');

      if (!reservationByCode) {
        return NextResponse.json(
          {
            success: false,
            message: 'Mã đơn đặt bàn không đúng định dạng ObjectId hoặc không tìm thấy bookingCode tương ứng.',
            error: 'INVALID_RESERVATION_ID',
          },
          { status: 400 }
        );
      }

      targetReservationId = (reservationByCode._id as Types.ObjectId).toString();
    }

    // Lấy danh sách giao dịch, loại trừ rawResponse để bảo mật dữ liệu webhook
    const transactions = await Transaction.find({
      reservationId: targetReservationId,
    })
      .select('-rawResponse')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: 'Lấy danh sách lịch sử giao dịch thành công.',
        data: transactions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử giao dịch:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi hệ thống khi tải lịch sử giao dịch đặt cọc.',
        error: error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
