import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/db';
import MenuItem from '@/app/models/MenuItem';
import { requireRole } from '@/app/lib/auth';
import { validateUpdateMenuPayload } from '@/app/lib/menuValidation';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'ID món ăn không hợp lệ.' },
        { status: 400 }
      );
    }

    await connectDB();

    const menuItem = await MenuItem.findById(id).lean();
    if (!menuItem) {
      return NextResponse.json(
        { success: false, message: `Không tìm thấy món ăn với ID: ${id}` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Lấy thông tin món ăn thành công.',
        data: menuItem,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi API GET /api/menu/[id]:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi máy chủ khi lấy thông tin món ăn.',
        error: message,
      },
      { status: 500 }
    );
  }
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

    const validation = validateUpdateMenuPayload(rawBody);
    if (!validation.ok) {
      return NextResponse.json(
        { success: false, message: validation.message },
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

    const updates = validation.data;
    if (updates.name !== undefined) menuItem.name = updates.name;
    if (updates.price !== undefined) menuItem.price = updates.price;
    if (updates.description !== undefined) menuItem.description = updates.description;
    if (updates.imageUrl !== undefined) menuItem.imageUrl = updates.imageUrl;
    if (updates.category !== undefined) menuItem.category = updates.category;
    if (updates.isAvailable !== undefined) menuItem.isAvailable = updates.isAvailable;
    if (updates.isPreOrderOnly !== undefined) menuItem.isPreOrderOnly = updates.isPreOrderOnly;
    if (updates.preparationNote !== undefined) menuItem.preparationNote = updates.preparationNote;

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
