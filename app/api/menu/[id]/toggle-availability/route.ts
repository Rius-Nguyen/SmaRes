import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import MenuItem from '@/app/models/MenuItem';

// ==========================================
// PATCH: Bật / Tắt 'Hết món nhanh' (TK-163)
// ==========================================
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Thiếu ID món ăn' },
        { status: 400 }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body rỗng -> Tự động đảo ngược trạng thái
    }

    await connectDB();

    // 1. Tìm món ăn trong MongoDB
    let menuItem = await MenuItem.findById(id);

    if (!menuItem) {
      return NextResponse.json(
        { success: false, message: `Không tìm thấy món ăn với ID: ${id}` },
        { status: 404 }
      );
    }

    // 2. Xác định trạng thái mới
    const newStatus =
      typeof body.is_available === 'boolean'
        ? body.is_available
        : typeof body.isAvailable === 'boolean'
        ? body.isAvailable
        : !menuItem.isAvailable;

    menuItem.isAvailable = newStatus;
    menuItem.is_available = newStatus;
    await menuItem.save();

    return NextResponse.json({
      success: true,
      message: `Đã ${newStatus ? 'BẬT (Còn món)' : 'TẮT (Hết món)'} cho món: ${menuItem.name}`,
      data: {
        _id: menuItem._id,
        name: menuItem.name,
        isAvailable: menuItem.isAvailable,
        is_available: menuItem.is_available,
      },
    });
  } catch (error: any) {
    console.error('Lỗi khi bật/tắt trạng thái món ăn:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi máy chủ khi cập nhật trạng thái món',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
