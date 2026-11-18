import { NextResponse } from 'next/server';

// Lưu trữ danh sách phiên QR động theo từng bàn trong bộ nhớ tạm (TK-141)
let activeTableSessions = {};

// Hàm tạo chuỗi Token định danh động gắn liền với Table ID
function createDynamicToken(tableId) {
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timeCode = Date.now().toString(36).toUpperCase();
  return `SMARES-${tableId}-${timeCode}-${randomStr}`;
}

// 1. Phương thức GET: Tạo và lấy mã QR động theo tableId (Ví dụ: /api/qr?tableId=B05)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tableId = (searchParams.get('tableId') || 'B05').toUpperCase();

    // Tạo Token mới gắn liền với Table ID
    const token = createDynamicToken(tableId);

    // Đường dẫn gọi món tại bàn có đính kèm Table ID và Token xác thực
    const orderUrl = `http://localhost:3000/menu?tableId=${tableId}&token=${token}`;

    // Tạo link ảnh QR động trực tiếp từ chuỗi orderUrl
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(orderUrl)}`;

    const sessionData = {
      tableId: tableId,
      token: token,
      orderUrl: orderUrl,
      qrImageUrl: qrImageUrl,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    // Lưu phiên QR của bàn vào bộ nhớ
    activeTableSessions[tableId] = sessionData;

    return NextResponse.json({
      success: true,
      message: 'Khởi tạo mã QR động định danh bàn ăn thành công',
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

// 2. Phương thức POST: Cấp mới lại mã QR động cho bàn khi đón lượt khách mới
export async function POST(request) {
  try {
    const body = await request.json();
    const tableId = (body.tableId || 'B05').toUpperCase();
    const token = createDynamicToken(tableId);
    const orderUrl = `http://localhost:3000/menu?tableId=${tableId}&token=${token}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(orderUrl)}`;

    const sessionData = {
      tableId: tableId,
      token: token,
      orderUrl: orderUrl,
      qrImageUrl: qrImageUrl,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    activeTableSessions[tableId] = sessionData;

    return NextResponse.json({
      success: true,
      message: 'Làm mới Token và mã QR động thành công',
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