import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import MenuItem, { MenuCategory } from '@/app/models/MenuItem';
import { INITIAL_MENU_ITEMS } from '@/app/lib/menuInitialData';
import { requireRole } from '@/app/lib/auth';

const VALID_CATEGORIES: readonly string[] = Object.values(MenuCategory);

function isMenuCategory(value: string): value is MenuCategory {
  return VALID_CATEGORIES.includes(value);
}

function parseNonNegativePrice(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 ? raw : null;
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw.trim());
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
  return null;
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

    if (typeof rawBody !== 'object' || rawBody === null) {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu món ăn không hợp lệ.' },
        { status: 400 }
      );
    }

    const body = rawBody as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const price = parseNonNegativePrice(body.price);
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    const rawCategory = typeof body.category === 'string' ? body.category.trim() : '';

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập tên món ăn.' },
        { status: 400 }
      );
    }

    if (price === null) {
      return NextResponse.json(
        { success: false, message: 'Giá món ăn phải là số hợp lệ lớn hơn hoặc bằng 0.' },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập mô tả món ăn.' },
        { status: 400 }
      );
    }

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng cung cấp đường dẫn hình ảnh món ăn.' },
        { status: 400 }
      );
    }

    if (!rawCategory || !isMenuCategory(rawCategory)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Danh mục món ăn không hợp lệ (Khai vị, Món chính, Đồ uống, Tráng miệng).',
        },
        { status: 400 }
      );
    }

    if (body.isAvailable !== undefined && typeof body.isAvailable !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'Trạng thái phục vụ (isAvailable) phải là giá trị boolean.' },
        { status: 400 }
      );
    }

    if (body.isPreOrderOnly !== undefined && typeof body.isPreOrderOnly !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'Cờ đặt trước (isPreOrderOnly) phải là giá trị boolean.' },
        { status: 400 }
      );
    }

    if (body.preparationNote !== undefined && typeof body.preparationNote !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Ghi chú chế biến (preparationNote) phải là chuỗi ký tự.' },
        { status: 400 }
      );
    }

    await connectDB();

    const createdItem = await MenuItem.create({
      name,
      price,
      description,
      imageUrl,
      category: rawCategory,
      isAvailable: typeof body.isAvailable === 'boolean' ? body.isAvailable : true,
      isPreOrderOnly: typeof body.isPreOrderOnly === 'boolean' ? body.isPreOrderOnly : false,
      preparationNote: typeof body.preparationNote === 'string' ? body.preparationNote.trim() : '',
    });

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
