import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import MenuItem from '@/app/models/MenuItem';
import { INITIAL_MENU_ITEMS } from '@/app/lib/menuInitialData';

export async function GET(request: Request) {
  try {
    // 1. Kết nối cơ sở dữ liệu MongoDB
    await connectDB();

    // 2. Lấy query params ?category=... từ URL
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // 3. Xây dựng điều kiện lọc trực tiếp từ Database
    const filterQuery: Record<string, unknown> = {};
    if (category && category !== 'Tất cả') {
      filterQuery.category = category.trim();
    }

    // 4. Truy vấn trực tiếp từ MongoDB (sắp xếp món theo createdAt hoặc thứ tự)
    let menuItems = await MenuItem.find(filterQuery).sort({ createdAt: 1 });

    // Nếu database chưa có món nào, tự động seed từ INITIAL_MENU_ITEMS
    if (!menuItems || menuItems.length === 0) {
      if (!category || category === 'Tất cả') {
        await MenuItem.insertMany(INITIAL_MENU_ITEMS);
        menuItems = await MenuItem.find({}).sort({ createdAt: 1 });
      } else {
        const matched = INITIAL_MENU_ITEMS.filter((i) => i.category === category);
        return NextResponse.json(
          {
            success: true,
            count: matched.length,
            data: matched,
          },
          { status: 200 }
        );
      }
    }

    // 5. Trả về kết quả JSON từ Database
    return NextResponse.json(
      {
        success: true,
        count: menuItems.length,
        data: menuItems,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi khi lấy danh sách thực đơn từ DB, trả về fallback:', error);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const fallbackData =
      category && category !== 'Tất cả'
        ? INITIAL_MENU_ITEMS.filter((i) => i.category === category)
        : INITIAL_MENU_ITEMS;

    return NextResponse.json(
      {
        success: true,
        count: fallbackData.length,
        data: fallbackData,
      },
      { status: 200 }
    );
  }
}

