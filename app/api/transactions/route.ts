import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/app/lib/db';
import Transaction from '@/app/models/Transaction';
import Reservation from '@/app/models/Reservation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get('reservationId');
    const userId = searchParams.get('userId');
    const transactionRef = searchParams.get('transactionRef');
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    // 1. Kiểm tra reservationId nếu có truyền
    if (reservationId) {
      if (Types.ObjectId.isValid(reservationId)) {
        filter.reservationId = new Types.ObjectId(reservationId);
      } else {
        // Thử tìm theo bookingCode
        const matchedReservation = await Reservation.findOne({
          bookingCode: reservationId.trim(),
        }).select('_id');

        if (!matchedReservation) {
          return NextResponse.json(
            {
              success: false,
              message: 'Tham số reservationId không đúng định dạng ObjectId hoặc không tìm thấy bookingCode.',
              error: 'INVALID_RESERVATION_ID',
            },
            { status: 400 }
          );
        }
        filter.reservationId = matchedReservation._id;
      }
    }

    // 2. Kiểm tra userId nếu có truyền
    if (userId) {
      if (!Types.ObjectId.isValid(userId)) {
        return NextResponse.json(
          {
            success: false,
            message: 'Tham số userId không đúng định dạng ObjectId.',
            error: 'INVALID_USER_ID',
          },
          { status: 400 }
        );
      }
      filter.userId = new Types.ObjectId(userId);
    }

    // 3. Tra cứu nhanh theo mã tham chiếu transactionRef
    if (transactionRef) {
      filter.transactionRef = transactionRef.trim();
    }

    // 4. Lọc theo trạng thái giao dịch
    if (status) {
      const validStatuses = ['PENDING', 'SUCCESS', 'FAILED', 'EXPIRED'];
      if (!validStatuses.includes(status.toUpperCase())) {
        return NextResponse.json(
          {
            success: false,
            message: `Trạng thái status không hợp lệ. Cho phép: ${validStatuses.join(', ')}`,
            error: 'INVALID_STATUS',
          },
          { status: 400 }
        );
      }
      filter.status = status.toUpperCase();
    }

    // 5. Lọc theo cổng thanh toán
    if (provider) {
      const validProviders = ['VNPAY', 'MOMO'];
      if (!validProviders.includes(provider.toUpperCase())) {
        return NextResponse.json(
          {
            success: false,
            message: `Cổng thanh toán provider không hợp lệ. Cho phép: ${validProviders.join(', ')}`,
            error: 'INVALID_PROVIDER',
          },
          { status: 400 }
        );
      }
      filter.provider = provider.toUpperCase();
    }

    // 6. Thực hiện truy vấn danh sách (loại bỏ rawResponse để đảm bảo an toàn bảo mật)
    const [total, transactions] = await Promise.all([
      Transaction.countDocuments(filter),
      Transaction.find(filter)
        .select('-rawResponse')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'reservationId',
          select: 'bookingCode date time guests status tableId',
        })
        .lean(),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: 'Lấy danh sách giao dịch thành công.',
        data: transactions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Lỗi khi truy vấn danh sách giao dịch:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi hệ thống khi tải danh sách giao dịch.',
        error: error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
