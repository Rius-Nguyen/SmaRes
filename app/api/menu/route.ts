import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import MenuItem, { MenuCategory } from '@/app/models/MenuItem';
import { INITIAL_MENU_ITEMS } from '@/app/lib/menuInitialData';
import { requireRole } from '@/app/lib/auth';
import {
  VALID_MENU_CATEGORIES,
  isMenuCategory,
  validateCreateMenuPayload,
} from '@/app/lib/menuValidation';

export const dynamic = 'force-dynamic';

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
            categories: VALID_MENU_CATEGORIES,
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
        categories: VALID_MENU_CATEGORIES,
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
        categories: VALID_MENU_CATEGORIES,
        data: fallbackData,
      },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin']);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu JSON không hợp lệ.' },
        { status: 400 }
      );
    }

    const validation = validateCreateMenuPayload(rawBody);
    if (!validation.ok) {
      return NextResponse.json(
        { success: false, message: validation.message },
        { status: 400 }
      );
    }

    await connectDB();

    const createdItem = await MenuItem.create(validation.data);

    return NextResponse.json(
      {
        success: true,
        message: `Đã thêm món "${createdItem.name}" vào thực đơn.`,
        data: createdItem,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Lỗi API POST /api/menu:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi máy chủ khi tạo món ăn mới.',
        error: message,
      },
      { status: 500 }
    );
  }
}
