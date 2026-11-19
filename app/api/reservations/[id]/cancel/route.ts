import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/db';
import { evaluateCancellationWindow } from '@/app/lib/reservationHelpers';
import Reservation, { ReservationStatus } from '@/app/models/Reservation';
import { requireAuth } from '@/app/lib/auth';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(request);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    await connectDB();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Mã đơn đặt bàn (ID) không hợp lệ.' },
        { status: 400 }
      );
    }

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy đơn đặt bàn.' },
        { status: 404 }
      );
    }

    const isStaffOrAdmin = auth.user.role === 'staff' || auth.user.role === 'admin';
    if (!isStaffOrAdmin) {
      if (!reservation.userId || reservation.userId.toString() !== auth.user.userId) {
        return NextResponse.json(
          { success: false, message: 'Bạn không có quyền hủy đơn đặt bàn này.' },
          { status: 403 }
        );
      }
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      return NextResponse.json(
        { success: false, message: 'Đơn đặt bàn này đã được hủy từ trước.' },
        { status: 400 }
      );
    }

    if (
      reservation.status === ReservationStatus.CHECKED_IN ||
      reservation.status === ReservationStatus.COMPLETED
    ) {
      return NextResponse.json(
        { success: false, message: 'Không thể hủy đơn đặt bàn đã nhận bàn hoặc đã hoàn thành.' },
        { status: 400 }
      );
    }

    const windowEvaluation = evaluateCancellationWindow(reservation.date, reservation.time);
    if (!windowEvaluation.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: windowEvaluation.reason ?? 'Chỉ được phép hủy đơn trước giờ hẹn ít nhất 60 phút.',
        },
        { status: 400 }
      );
    }

    reservation.status = ReservationStatus.CANCELLED;
    await reservation.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Hủy đơn đặt bàn thành công!',
        data: {
          id: reservation._id,
          bookingCode: reservation.bookingCode,
          status: reservation.status,
          cancelledAt: new Date(),
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi khi hủy đơn đặt bàn:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi hệ thống server.' },
      { status: 500 }
    );
  }
}
