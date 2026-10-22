import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import MenuItem from '@/app/models/MenuItem';

export async function GET(request: Request) {
  try {
    // 1. Kết nối cơ sở dữ liệu MongoDB
    await connectDB();

    // 2. Lấy query params ?category=... từ URL
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // 3. Xây dựng điều kiện lọc trực tiếp từ Database
    const filterQuery: Record<string, unknown> = {};
    if (category) {
      filterQuery.category = category.trim();
    }

    // 4. Truy vấn trực tiếp từ MongoDB (sắp xếp món mới tạo lên trước)
    const menuItems = await MenuItem.find(filterQuery).sort({ createdAt: -1 });

    // 5. Trả về kết quả JSON
    return NextResponse.json(
      {
        success: true,
        count: menuItems.length,
        data: menuItems,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi khi lấy danh sách thực đơn:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Lỗi hệ thống máy chủ';

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
