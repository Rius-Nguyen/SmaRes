import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/db';
import MenuItem from '@/app/models/MenuItem';
import { requireRole } from '@/app/lib/auth';

interface ToggleAvailabilityBody {
  isAvailable?: unknown;
  is_available?: unknown;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireRole(request, ['staff', 'admin']);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    const { id } = await context.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'ID món ăn không hợp lệ' },
        { status: 400 }
      );
    }

    let rawBody: unknown = {};
    try {
      rawBody = await request.json();
    } catch {
      rawBody = {};
    }

    const body: ToggleAvailabilityBody =
      typeof rawBody === 'object' && rawBody !== null
        ? (rawBody as ToggleAvailabilityBody)
        : {};

    await connectDB();

    const menuItem = await MenuItem.findById(id);
    if (!menuItem) {
      return NextResponse.json(
        { success: false, message: `Không tìm thấy món ăn với ID: ${id}` },
        { status: 404 }
      );
    }

    const newStatus =
      typeof body.isAvailable === 'boolean'
        ? body.isAvailable
        : typeof body.is_available === 'boolean'
          ? body.is_available
          : !menuItem.isAvailable;

    menuItem.isAvailable = newStatus;
    await menuItem.save();

    return NextResponse.json(
      {
        success: true,
        message: `Đã ${newStatus ? 'BẬT (Còn món)' : 'TẮT (Hết món)'} cho món: ${menuItem.name}`,
        data: {
          _id: menuItem._id,
          name: menuItem.name,
          isAvailable: menuItem.isAvailable,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi khi bật/tắt trạng thái món ăn:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi máy chủ khi cập nhật trạng thái món',
        error: message,
      },
      { status: 500 }
    );
  }
}
