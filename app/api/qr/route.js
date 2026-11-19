import { NextResponse } from 'next/server';

// Lưu trữ danh sách phiên QR động theo từng bàn trong bộ nhớ tạm (TK-141 & TK-150)
let activeTableSessions = {};

// Hàm tạo chuỗi Token định danh động gắn liền với Table ID
function createDynamicToken(tableId) {
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timeCode = Date.now().toString(36).toUpperCase();
  return `SMARES-${tableId}-${timeCode}-${randomStr}`;
}

// 1. Phương thức GET: Tạo mã QR động và kiểm tra trạng thái bàn (Available, Occupied, Cleaning)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tableId = (searchParams.get('tableId') || 'B05').toUpperCase();
    const tableStatus = (searchParams.get('status') || 'Occupied');

    // Kịch bản 1 (TK-150): Bàn đang dọn dẹp (Cleaning) -> Chặn gọi món (Mã 403)
    if (tableStatus.toLowerCase() === 'cleaning') {
      return NextResponse.json({
        success: false,
        tableId: tableId,
        tableStatus: 'Cleaning',
        canOrder: false,
        message: `Bàn ${tableId} hiện đang trong trạng thái dọn dẹp (Cleaning). Vui lòng chờ nhân viên hoàn tất trước khi quét QR gọi món!`
      }, { status: 403 });
    }

    // Kịch bản 2 (TK-150): Bàn trống chưa kích hoạt phiên (Available) -> Yêu cầu nhận bàn trước
    if (tableStatus.toLowerCase() === 'available') {
      return NextResponse.json({
        success: true,
        tableId: tableId,
        tableStatus: 'Available',
        canOrder: false,
        redirectUrl: `http://localhost:3000/booking?tableId=${tableId}`,
        message: `Bàn ${tableId} đang trống (Available). Vui lòng kích hoạt nhận bàn trước khi gọi món.`
      }, { status: 200 });
    }

    // Kịch bản 3 (TK-141 & TK-150): Bàn đang có khách (Occupied) -> Tạo Token & QR động cho phép gọi món
    const token = createDynamicToken(tableId);
    const orderUrl = `http://localhost:3000/menu?tableId=${tableId}&status=Occupied&token=${token}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(orderUrl)}`;

    const sessionData = {
      tableId: tableId,
      tableStatus: 'Occupied',
      canOrder: true,
      token: token,
      orderUrl: orderUrl,
      qrImageUrl: qrImageUrl,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    activeTableSessions[tableId] = sessionData;

    return NextResponse.json({
      success: true,
      message: `Quét mã QR Bàn ${tableId} (Occupied) hợp lệ. Cho phép gọi thêm món.`,
      data: sessionData
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Lỗi khi tạo mã QR động',
      error: error.message
    }, { status: 500 });
  }
}

// 2. Phương thức POST: Cấp mới lại mã QR động và cập nhật trạng thái bàn
export async function POST(request) {
  try {
    const body = await request.json();
    const tableId = (body.tableId || 'B05').toUpperCase();
    const tableStatus = body.tableStatus || 'Occupied';
    const token = createDynamicToken(tableId);
    const orderUrl = `http://localhost:3000/menu?tableId=${tableId}&status=${tableStatus}&token=${token}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(orderUrl)}`;

    const sessionData = {
      tableId: tableId,
      tableStatus: tableStatus,
      canOrder: tableStatus.toLowerCase() === 'occupied',
      token: token,
      orderUrl: orderUrl,
      qrImageUrl: qrImageUrl,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    activeTableSessions[tableId] = sessionData;

    return NextResponse.json({
      success: true,
      message: 'Làm mới Token và trạng thái mã QR động thành công',
      data: sessionData
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Lỗi server khi làm mới mã QR',
      error: error.message
    }, { status: 500 });
  }
}