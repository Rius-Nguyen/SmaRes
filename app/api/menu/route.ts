import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import MenuItem, { MenuCategory } from '@/app/models/MenuItem';
import { INITIAL_MENU_ITEMS } from '@/app/lib/menuInitialData';

const VALID_CATEGORIES: readonly string[] = Object.values(MenuCategory);

function isMenuCategory(value: string): value is MenuCategory {
  return VALID_CATEGORIES.includes(value);
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const rawCategory = searchParams.get('category')?.trim() ?? '';

    const totalCount = await MenuItem.countDocuments();
    if (totalCount === 0) {
      await MenuItem.insertMany(INITIAL_MENU_ITEMS);
    }

    const filterQuery: { category?: MenuCategory } = {};
    if (rawCategory && rawCategory !== 'Tất cả') {
      if (!isMenuCategory(rawCategory)) {
        return NextResponse.json(
          {
            success: true,
            count: 0,
            data: [],
          },
          { status: 200 }
        );
      }
      filterQuery.category = rawCategory;
    }

    const menuItems = await MenuItem.find(filterQuery).sort({ createdAt: 1 }).lean();

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
    const rawCategory = searchParams.get('category')?.trim() ?? '';

    const fallbackData =
      rawCategory && rawCategory !== 'Tất cả'
        ? INITIAL_MENU_ITEMS.filter((item) => item.category === rawCategory)
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
