import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/db';
import {
  computeDiningInterval,
  computeSlotBlockInterval,
  doDateIntervalsOverlap,
  doTimeSlotsOverlap,
  extendEndTimeWithCleaningBuffer,
  generateBookingCode,
  getOperatingHoursForDate,
  isSlotBeforeMinAdvance,
  isWithinOperatingHoursForDate,
  parseVietnamDateTime,
} from '@/app/lib/reservationHelpers';
import Table from '@/app/models/Table';
import Reservation, { ReservationStatus } from '@/app/models/Reservation';
import { requireAuth } from '@/app/lib/auth';
import { checkBookingAccess } from '@/app/lib/bookingRoleGuard';

export const dynamic = 'force-dynamic';

const VALID_RESERVATION_STATUSES: readonly string[] = Object.values(ReservationStatus);

function isReservationStatus(value: string): value is ReservationStatus {
  return VALID_RESERVATION_STATUSES.includes(value);
}

function extractMongoErrorCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  if ('code' in error && typeof (error as { code?: unknown }).code === 'number') {
    return (error as { code: number }).code;
  }

  if ('cause' in error) {
    return extractMongoErrorCode((error as { cause?: unknown }).cause);
  }

  return undefined;
}

function isMongoDuplicateKeyError(error: unknown): boolean {
  return extractMongoErrorCode(error) === 11000;
}

function isBookingCodeDuplicateError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const record = error as { keyPattern?: unknown; message?: unknown; cause?: unknown };
  if (typeof record.keyPattern === 'object' && record.keyPattern !== null) {
    const keys = Object.keys(record.keyPattern);
    if (keys.includes('bookingCode') && !keys.includes('tableId')) {
      return true;
    }
  }

  if (
    typeof record.message === 'string' &&
    record.message.includes('bookingCode') &&
    !record.message.includes('uniq_active_table_slot')
  ) {
    return true;
  }

  if ('cause' in record) {
    return isBookingCodeDuplicateError(record.cause);
  }

  return false;
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const rawBookingCode = searchParams.get('bookingCode')?.trim() ?? '';
    const rawStatus = searchParams.get('status')?.trim() ?? '';

    const filter: {
      userId?: string;
      bookingCode?: string;
      status?: ReservationStatus;
    } = {};

    const isStaffOrAdmin = auth.user.role === 'staff' || auth.user.role === 'admin';
    if (!isStaffOrAdmin) {
      filter.userId = auth.user.userId;
    }

    if (rawBookingCode) {
      filter.bookingCode = rawBookingCode.toUpperCase();
    }

    if (rawStatus) {
      const normalizedStatus = rawStatus.toUpperCase();
      if (!isReservationStatus(normalizedStatus)) {
        return NextResponse.json(
          { success: false, message: 'Trạng thái đặt bàn không hợp lệ.' },
          { status: 400 }
        );
      }
      filter.status = normalizedStatus;
    }

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
    const roleCheck = checkBookingAccess(request);
    if (roleCheck.errorResponse) {
      return roleCheck.errorResponse;
    }
    const user = roleCheck.user;

    await connectDB();

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
    const tableNumberInput =
      typeof body.tableNumber === 'string' ? body.tableNumber.trim().toUpperCase() : '';
    const date = typeof body.date === 'string' ? body.date.trim() : '';
    const time = typeof body.time === 'string' ? body.time.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    const customerName =
      typeof body.customerName === 'string' && body.customerName.trim()
        ? body.customerName.trim()
        : 'Khách tại bàn';
    const customerEmail =
      typeof body.customerEmail === 'string' && body.customerEmail.trim()
        ? body.customerEmail.trim().toLowerCase()
        : typeof body.email === 'string' && body.email.trim()
          ? body.email.trim().toLowerCase()
          : '';

    const guestsNum =
      typeof body.guests === 'number'
        ? body.guests
        : typeof body.guests === 'string' && body.guests.trim() !== ''
          ? Number(body.guests.trim())
          : Number.NaN;

    if (
      (!tableId && !tableNumberInput) ||
      !date ||
      !time ||
      !phone ||
      !Number.isInteger(guestsNum) ||
      guestsNum < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Vui lòng nhập đầy đủ: tableId hoặc tableNumber, date, time, guests (>= 1), phone.',
        },
        { status: 400 }
      );
    }

    if (Number.isNaN(parseVietnamDateTime(date, time))) {
      return NextResponse.json(
        {
          success: false,
          message: 'Ngày hoặc khung giờ đặt bàn không hợp lệ (YYYY-MM-DD và HH:mm).',
        },
        { status: 400 }
      );
    }

    if (!isWithinOperatingHoursForDate(date, time)) {
      const hours = getOperatingHoursForDate(date);
      return NextResponse.json(
        {
          success: false,
          error: 'OUTSIDE_OPERATING_HOURS',
          message: `Giờ đặt bàn phải nằm trong khung giờ phục vụ ${hours.label}.`,
        },
        { status: 400 }
      );
    }

    if (isSlotBeforeMinAdvance(date, time)) {
      return NextResponse.json(
        {
          success: false,
          error: 'BOOKING_LEAD_TIME_TOO_SHORT',
          message: 'Vui lòng đặt bàn trước giờ hẹn tối thiểu 30 phút (BR-RES-13).',
        },
        { status: 400 }
      );
    }

    if (tableId && !mongoose.Types.ObjectId.isValid(tableId)) {
      return NextResponse.json(
        { success: false, message: 'Mã bàn (tableId) không hợp lệ.' },
        { status: 400 }
      );
    }

    const table = tableId
      ? await Table.findById(tableId)
      : await Table.findOne({ tableNumber: tableNumberInput });

    if (!table) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy bàn được chọn.' },
        { status: 404 }
      );
    }

    if (table.capacity < guestsNum) {
      return NextResponse.json(
        {
          success: false,
          message: `Số lượng khách (${guestsNum}) vượt quá sức chứa của bàn ${table.tableNumber} (${table.capacity} chỗ).`,
        },
        { status: 400 }
      );
    }

    const diningInterval = computeDiningInterval(date, time);
    const blockInterval = computeSlotBlockInterval(date, time);
    if (!diningInterval || !blockInterval) {
      return NextResponse.json(
        {
          success: false,
          message: 'Ngày hoặc khung giờ đặt bàn không hợp lệ (YYYY-MM-DD và HH:mm).',
        },
        { status: 400 }
      );
    }

    const activeSameDayReservations = await Reservation.find({
      tableId: table._id,
      date,
      status: { $in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] },
    })
      .select('_id time startTime endTime')
      .lean();

    const overlappingReservation = activeSameDayReservations.find((res) => {
      if (res.startTime && res.endTime) {
        const resBlockedEnd = extendEndTimeWithCleaningBuffer(res.endTime) ?? res.endTime;
        return doDateIntervalsOverlap(
          blockInterval.startTime,
          blockInterval.endTime,
          res.startTime,
          resBlockedEnd
        );
      }
      return !res.time || doTimeSlotsOverlap(res.time, time);
    });

    if (overlappingReservation) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Bàn này đã có người đặt trong khung giờ trùng lặp (150 phút dùng bữa + 30 phút dọn bàn = 180 phút / 3 giờ). Vui lòng chọn bàn khác hoặc khung giờ khác!',
        },
        { status: 409 }
      );
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const bookingCode = generateBookingCode();
      try {
        const newReservation = await Reservation.create({
          userId: user?.userId ?? null,
          tableId: table._id,
          tableNumber: table.tableNumber,
          customerName,
          ...(customerEmail ? { customerEmail } : {}),
          bookingCode,
          date,
          time,
          startTime: diningInterval.startTime,
          endTime: diningInterval.endTime,
          guests: guestsNum,
          phone,
          note,
          status: ReservationStatus.CONFIRMED,
        });

        const resolvedStartIso =
          newReservation.startTime instanceof Date
            ? newReservation.startTime.toISOString()
            : diningInterval.startTime.toISOString();
        const resolvedEndIso =
          newReservation.endTime instanceof Date
            ? newReservation.endTime.toISOString()
            : diningInterval.endTime.toISOString();

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
              startTime: resolvedStartIso,
              endTime: resolvedEndIso,
              guests: newReservation.guests,
              phone: newReservation.phone,
              note: newReservation.note,
              status: newReservation.status,
              createdAt: newReservation.createdAt,
            },
          },
          { status: 201 }
        );
      } catch (createError: unknown) {
        if (isMongoDuplicateKeyError(createError)) {
          if (isBookingCodeDuplicateError(createError) && attempt === 0) {
            continue;
          }
          return NextResponse.json(
            { success: false, message: 'Bàn này đã có người đặt vào khung giờ đã chọn!' },
            { status: 409 }
          );
        }
        throw createError;
      }
    }

    return NextResponse.json(
      { success: false, message: 'Bàn này đã có người đặt vào khung giờ đã chọn!' },
      { status: 409 }
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
