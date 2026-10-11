import { NextResponse } from 'next/server';

let memoryOrders = [
  {
    _id: "ORD2026101101",
    phone: "0905123456",
    totalAmount: 150000,
    status: "PENDING",
    items: [
      { name: "Phở Bò Đặc Biệt", price: 75000, quantity: 2 }
    ],
    createdAt: new Date().toISOString()
  },
  {
    _id: "ORD2026101102",
    phone: "0918999888",
    totalAmount: 220000,
    status: "COOKING",
    items: [
      { name: "Cơm Gà Giòn Da", price: 110000, quantity: 2 }
    ],
    createdAt: new Date().toISOString()
  }
];

// 1. Phương thức GET: Lấy danh sách đơn hàng
export async function GET() {
  try {
    return NextResponse.json({ 
      success: true, 
      orders: memoryOrders 
    }, { status: 200 });
  } catch (error) {
    console.error('Lỗi API GET /api/orders:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// 2. Phương thức POST: Tạo đơn hàng mới và lưu vào bộ nhớ tạm
export async function POST(request) {
  try {
    const body = await request.json();
    
    const newOrder = {
      _id: "ORD" + Date.now(),
      ...body,
      status: body.status || "PENDING",
      createdAt: new Date().toISOString()
    };

    memoryOrders.unshift(newOrder);

    return NextResponse.json({
      success: true,
      message: 'Tạo đơn hàng thành công',
      orderId: newOrder._id,
      totalPrice: newOrder.totalAmount,
      order: newOrder
    }, { status: 201 });

  } catch (error) {
    console.error('Lỗi API POST /api/orders:', error);
    return NextResponse.json({
      success: false,
      message: 'Lỗi server khi khởi tạo đơn hàng',
      error: error.message
    }, { status: 500 });
  }
}