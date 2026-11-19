import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/db';
import WaiterCall, { WaiterCallStatus } from '@/app/models/WaiterCall';
import { requireRole } from '@/app/lib/auth';
import {
  emitRealtimeEvent,
  REALTIME_EVENT_TYPES,
} from '@/app/lib/realtimeBus';

const VALID_WAITER_CALL_STATUSES: readonly string[] = Object.values(WaiterCallStatus);

function isWaiterCallStatus(value: string): value is WaiterCallStatus {
  return VALID_WAITER_CALL_STATUSES.includes(value);
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireRole(request, ['staff', 'admin']);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    await connectDB();

    const calls = await WaiterCall.find({}).sort({ createdAt: -1 }).lean();

    return NextResponse.json(
      {
        success: true,
        calls,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi API GET /api/waiter:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Lỗi khi tải danh sách gọi phục vụ', error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
        { success: false, message: 'Dữ liệu yêu cầu không hợp lệ.' },
        { status: 400 }
      );
    }

    const body = rawBody as Record<string, unknown>;
    const rawTableNumber = body.tableNumber;
    const tableNumber =
      typeof rawTableNumber === 'string' || typeof rawTableNumber === 'number'
        ? String(rawTableNumber).trim().toUpperCase()
        : '';

    if (!tableNumber) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin số bàn (tableNumber)' },
        { status: 400 }
      );
    }

    const reason =
      typeof body.reason === 'string' && body.reason.trim()
        ? body.reason.trim()
        : 'Hỗ trợ khác';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

    const newCall = await WaiterCall.create({
      tableNumber,
      reason,
      notes,
      status: WaiterCallStatus.PENDING,
    });

    try {
      emitRealtimeEvent({
        type: REALTIME_EVENT_TYPES.WAITER_CALL_CREATED,
        callId: String(newCall._id),
        tableNumber: newCall.tableNumber,
        reason: newCall.reason,
        status: newCall.status,
      });
    } catch (sseError: unknown) {
      console.error('Lỗi phát sự kiện SSE WAITER_CALL_CREATED:', sseError);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Đã gửi yêu cầu hỗ trợ cho Bàn ${tableNumber}! Nhân viên sẽ tới ngay.`,
        call: newCall,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Lỗi API POST /api/waiter:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Lỗi xử lý yêu cầu gọi phục vụ', error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = requireRole(request, ['staff', 'admin']);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

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
        { success: false, message: 'Dữ liệu cập nhật không hợp lệ.' },
        { status: 400 }
      );
    }

    const body = rawBody as Record<string, unknown>;
    const callId = typeof body.callId === 'string' ? body.callId.trim() : '';
    const rawStatus = typeof body.status === 'string' ? body.status.trim().toUpperCase() : '';

    if (!callId || !mongoose.Types.ObjectId.isValid(callId)) {
      return NextResponse.json(
        { success: false, message: 'Mã yêu cầu (callId) không hợp lệ.' },
        { status: 400 }
      );
    }

    if (!rawStatus || !isWaiterCallStatus(rawStatus)) {
      return NextResponse.json(
        { success: false, message: 'Trạng thái cập nhật không hợp lệ.' },
        { status: 400 }
      );
    }

    const updatedCall = await WaiterCall.findByIdAndUpdate(
      callId,
      {
        status: rawStatus,
        handledBy: auth.user.userId,
      },
      { new: true }
    );

    if (!updatedCall) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy yêu cầu' },
        { status: 404 }
      );
    }

    try {
      emitRealtimeEvent({
        type: REALTIME_EVENT_TYPES.WAITER_CALL_UPDATED,
        callId: String(updatedCall._id),
        tableNumber: updatedCall.tableNumber,
        reason: updatedCall.reason,
        status: updatedCall.status,
      });
    } catch (sseError: unknown) {
      console.error('Lỗi phát sự kiện SSE WAITER_CALL_UPDATED:', sseError);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Cập nhật trạng thái thành công',
        call: updatedCall,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi API PATCH /api/waiter:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Lỗi cập nhật', error: message },
      { status: 500 }
    );
  }
}
