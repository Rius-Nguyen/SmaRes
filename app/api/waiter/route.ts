import { NextResponse } from 'next/server';

export interface WaiterCall {
  id: string;
  tableNumber: string;
  reason: string;
  notes?: string;
  status: 'PENDING' | 'ATTENDED' | 'COMPLETED';
  createdAt: string;
}

// Lưu trữ các yêu cầu gọi phục vụ tại bàn trong bộ nhớ (hỗ trợ hiển thị thời gian thực)
let activeWaiterCalls: WaiterCall[] = [
  {
    id: 'CALL-101',
    tableNumber: '04',
    reason: 'Xin thêm nước/đá',
    notes: 'Khách cần thêm 1 xô đá lạnh',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  },
];

// GET: Lấy danh sách yêu cầu gọi phục vụ cho nhân viên
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      calls: activeWaiterCalls,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi khi tải danh sách gọi phục vụ', error: err.message },
      { status: 500 }
    );
  }
}

// POST: Thực khách tại bàn gửi yêu cầu gọi nhân viên
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tableNumber, reason, notes } = body;

    if (!tableNumber) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin số bàn (tableNumber)' },
        { status: 400 }
      );
    }

    const newCall: WaiterCall = {
      id: `CALL-${Date.now().toString().slice(-4)}`,
      tableNumber: String(tableNumber),
      reason: reason || 'Hỗ trợ khác',
      notes: notes || '',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    activeWaiterCalls.unshift(newCall);

    return NextResponse.json({
      success: true,
      message: `Đã gửi yêu cầu hỗ trợ cho Bàn ${tableNumber}! Nhân viên sẽ tới ngay.`,
      call: newCall,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi xử lý yêu cầu gọi phục vụ', error: err.message },
      { status: 500 }
    );
  }
}

// PATCH: Cập nhật trạng thái yêu cầu (Dành cho nhân viên xử lý)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { callId, status } = body;

    const target = activeWaiterCalls.find((c) => c.id === callId);
    if (!target) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy yêu cầu' },
        { status: 404 }
      );
    }

    target.status = status;

    return NextResponse.json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      call: target,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi cập nhật', error: err.message },
      { status: 500 }
    );
  }
}
