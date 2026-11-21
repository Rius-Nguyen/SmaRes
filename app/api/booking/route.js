import { NextResponse } from 'next/server';
import { checkBookingAccess } from '@/app/lib/bookingRoleGuard';

const bookingsByTable = new Map();

export async function GET(request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const tableId = (searchParams.get('tableId') || 'B05').trim().toUpperCase();

  return NextResponse.json(
    {
      success: true,
      tableId,
      responseTimeMs: Date.now() - startTime,
      booking: bookingsByTable.get(tableId) || null
    },
    { status: 200 }
  );
}

export async function POST(request) {
  const startTime = Date.now();
  const roleCheck = checkBookingAccess(request);
  if (roleCheck.errorResponse) {
    return roleCheck.errorResponse;
  }

  try {
    const body = await request.json();
    const tableId = (body.tableId || '').trim().toUpperCase();
    const customerName = (body.customerName || '').trim();
    const timeSlot = (body.timeSlot || '').trim();

    if (!tableId || !customerName || !timeSlot) {
      return NextResponse.json(
        {
          success: false,
          message: 'Thiếu thông tin bắt buộc: tableId, customerName hoặc timeSlot'
        },
        { status: 400 }
      );
    }

    const record = {
      tableId,
      customerName,
      timeSlot,
      holdMinutes: 10,
      status: 'RESERVED',
      updatedAt: new Date().toISOString()
    };

    bookingsByTable.set(tableId, record);

    return NextResponse.json(
      {
        success: true,
        message: 'Tạo/cập nhật giữ chỗ đặt bàn thành công',
        responseTimeMs: Date.now() - startTime,
        data: record
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Dữ liệu gửi lên không hợp lệ',
        error: error.message
      },
      { status: 400 }
    );
  }
}