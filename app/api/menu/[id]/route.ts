import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/db';
import MenuItem, { MenuCategory } from '@/app/models/MenuItem';
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

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireRole(request, ['admin']);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    const { id } = await context.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'ID món ăn không hợp lệ.' },
        { status: 400 }
      );
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
        { success: false, message: 'Dữ liệu cập nhật món ăn không hợp lệ.' },
        { status: 400 }
      );
    }

    const body = rawBody as Record<string, unknown>;
    const hasUpdatableField = [
      'name',
      'price',
      'description',
      'imageUrl',
      'category',
      'isAvailable',
      'isPreOrderOnly',
      'preparationNote',
    ].some((key) => body[key] !== undefined);

    if (!hasUpdatableField) {
      return NextResponse.json(
        { success: false, message: 'Không có trường dữ liệu hợp lệ để cập nhật.' },
        { status: 400 }
      );
    }

    await connectDB();

    const menuItem = await MenuItem.findById(id);
    if (!menuItem) {
      return NextResponse.json(
        { success: false, message: `Không tìm thấy món ăn với ID: ${id}` },
        { status: 404 }
      );
    }

    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) {
        return NextResponse.json(
          { success: false, message: 'Tên món ăn không được để trống.' },
          { status: 400 }
        );
      }
      menuItem.name = name;
    }

    if (body.price !== undefined) {
      const price = parseNonNegativePrice(body.price);
      if (price === null) {
        return NextResponse.json(
          { success: false, message: 'Giá món ăn phải là số hợp lệ lớn hơn hoặc bằng 0.' },
          { status: 400 }
        );
      }
      menuItem.price = price;
    }

    if (body.description !== undefined) {
      const description = typeof body.description === 'string' ? body.description.trim() : '';
      if (!description) {
        return NextResponse.json(
          { success: false, message: 'Mô tả món ăn không được để trống.' },
          { status: 400 }
        );
      }
      menuItem.description = description;
    }

    if (body.imageUrl !== undefined) {
      const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
      if (!imageUrl) {
        return NextResponse.json(
          { success: false, message: 'Đường dẫn hình ảnh không được để trống.' },
          { status: 400 }
        );
      }
      menuItem.imageUrl = imageUrl;
    }

    if (body.category !== undefined) {
      const category = typeof body.category === 'string' ? body.category.trim() : '';
      if (!category || !isMenuCategory(category)) {
        return NextResponse.json(
          {
            success: false,
            message: 'Danh mục món ăn không hợp lệ (Khai vị, Món chính, Đồ uống, Tráng miệng).',
          },
          { status: 400 }
        );
      }
      menuItem.category = category;
    }

    if (body.isAvailable !== undefined) {
      if (typeof body.isAvailable !== 'boolean') {
        return NextResponse.json(
          { success: false, message: 'Trạng thái phục vụ (isAvailable) phải là giá trị boolean.' },
          { status: 400 }
        );
      }
      menuItem.isAvailable = body.isAvailable;
    }

    if (body.isPreOrderOnly !== undefined) {
      if (typeof body.isPreOrderOnly !== 'boolean') {
        return NextResponse.json(
          { success: false, message: 'Cờ đặt trước (isPreOrderOnly) phải là giá trị boolean.' },
          { status: 400 }
        );
      }
      menuItem.isPreOrderOnly = body.isPreOrderOnly;
    }

    if (body.preparationNote !== undefined) {
      if (typeof body.preparationNote !== 'string') {
        return NextResponse.json(
          { success: false, message: 'Ghi chú chế biến (preparationNote) phải là chuỗi ký tự.' },
          { status: 400 }
        );
      }
      menuItem.preparationNote = body.preparationNote.trim();
    }

    await menuItem.save();

    return NextResponse.json(
      {
        success: true,
        message: `Đã cập nhật món "${menuItem.name}" thành công.`,
        data: menuItem,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi API PUT /api/menu/[id]:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi máy chủ khi cập nhật món ăn.',
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireRole(request, ['admin']);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    const { id } = await context.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'ID món ăn không hợp lệ.' },
        { status: 400 }
      );
    }

    await connectDB();

    const deletedItem = await MenuItem.findByIdAndDelete(id).lean();
    if (!deletedItem) {
      return NextResponse.json(
        { success: false, message: `Không tìm thấy món ăn với ID: ${id}` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Đã xóa món "${deletedItem.name}" khỏi thực đơn.`,
        data: deletedItem,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi API DELETE /api/menu/[id]:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi máy chủ khi xóa món ăn.',
        error: message,
      },
      { status: 500 }
    );
  }
}
