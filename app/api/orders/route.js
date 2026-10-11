import { NextResponse } from 'next/server';

// 1. Phương thức GET: Lấy danh sách đơn hàng cho trang UI hiển thị
export async function GET() {
  try {
    // Dữ liệu mẫu (hoặc bạn có thể thay thế bằng logic gọi Mongoose Model: await Order.find())
    const mockOrders = [
      {
        _id: "ORD2026101101",
        phone: "0905123456",
        totalAmount: 150000,
        status: "PENDING",
        items: [
          { name: "Phở Bò Đặc Biệt", price: 75000, quantity: 2 }
        ]
      },
      {
        _id: "ORD2026101102",
        phone: "0918999888",
        totalAmount: 220000,
        status: "COOKING",
        items: [
          { name: "Cơm Gà Giòn Da", price: 110000, quantity: 2 }
        ]
      }
    ];

    return NextResponse.json({ 
      success: true, 
      orders: mockOrders 
    }, { status: 200 });

  } catch (error) {
    console.error('Lỗi API GET /api/orders:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// 2. Phương thức POST: Nhận payload từ Frontend để khởi tạo và lưu đơn hàng mới
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Logic xử lý dữ liệu và tính toán tổng tiền (kế thừa từ task TK-102 của nhóm)
    const savedOrder = {
      _id: "ORD" + Date.now(),
      ...body,
      status: "PENDING",
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'Tạo đơn hàng thành công',
      orderId: savedOrder._id,
      totalPrice: savedOrder.totalAmount,
      order: savedOrder
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