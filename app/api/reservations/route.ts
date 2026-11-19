import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import crypto from 'crypto';
import connectDB from '@/app/lib/db';
import Table from '@/app/models/Table';
import Reservation, { ReservationStatus } from '@/app/models/Reservation';
import { getAuthUser, requireAuth } from '@/app/lib/auth';

function isMongoDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    await connectDB();

    const isStaffOrAdmin = auth.user.role === 'staff' || auth.user.role === 'admin';
    const filter = isStaffOrAdmin ? {} : { userId: auth.user.userId };

    const reservations = await Reservation.find(filter).sort({ createdAt: -1 }).lean();

    return NextResponse.json(
      {
        success: true,
        reservations,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi khi tải danh sách đặt bàn:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi hệ thống server.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const user = getAuthUser(request);

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu JSON không hợp lệ.' },
        { status: 400 }
      );
    }

    if (typeof rawBody !== 'object' || rawBody === null) {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu đặt bàn không hợp lệ.' },
        { status: 400 }
      );
    }

    const body = rawBody as Record<string, unknown>;
    const tableId = typeof body.tableId === 'string' ? body.tableId.trim() : '';
    const date = typeof body.date === 'string' ? body.date.trim() : '';
    const time = typeof body.time === 'string' ? body.time.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    const customerName =
      typeof body.customerName === 'string' && body.customerName.trim()
        ? body.customerName.trim()
        : 'Khách tại bàn';

    const guestsNum =
      typeof body.guests === 'number'
        ? body.guests
        : typeof body.guests === 'string'
          ? Number.parseInt(body.guests, 10)
          : Number.NaN;

    if (!tableId || !date || !time || !phone || !Number.isFinite(guestsNum) || guestsNum < 1) {
      return NextResponse.json(
        {
          success: false,
          message: 'Vui lòng nhập đầy đủ: tableId, date, time, guests, phone.',
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      return NextResponse.json(
        { success: false, message: 'Mã bàn (tableId) không hợp lệ.' },
        { status: 400 }
      );
    }

    const table = await Table.findById(tableId);
    if (!table) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy bàn được chọn.' },
        { status: 404 }
      );
    }

    const existingReservation = await Reservation.findOne({
      tableId: table._id,
      date,
      time,
      status: { $ne: ReservationStatus.CANCELLED },
    });

    if (existingReservation) {
      return NextResponse.json(
        { success: false, message: 'Bàn này đã có người đặt vào khung giờ đã chọn!' },
        { status: 409 }
      );
    }

    const bookingCode = `RES-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const newReservation = await Reservation.create({
      userId: user?.userId ?? null,
      tableId: table._id,
      tableNumber: table.tableNumber,
      customerName,
      bookingCode,
      date,
      time,
      guests: guestsNum,
      phone,
      note,
      status: ReservationStatus.CONFIRMED,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Tạo đơn đặt bàn thành công!',
        data: {
          id: newReservation._id,
          bookingCode: newReservation.bookingCode,
          tableId: newReservation.tableId,
          tableNumber: newReservation.tableNumber,
          customerName: newReservation.customerName,
          date: newReservation.date,
          time: newReservation.time,
          guests: newReservation.guests,
          phone: newReservation.phone,
          note: newReservation.note,
          status: newReservation.status,
          createdAt: newReservation.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (isMongoDuplicateKeyError(error)) {
      return NextResponse.json(
        { success: false, message: 'Bàn này đã có người đặt vào khung giờ đã chọn!' },
        { status: 409 }
      );
    }

    console.error('Lỗi khi tạo đơn đặt bàn:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi hệ thống server.' },
      { status: 500 }
    );
  }
}
