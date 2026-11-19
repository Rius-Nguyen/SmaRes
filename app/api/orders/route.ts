import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import crypto from 'crypto';
import connectDB from '@/app/lib/db';
import Order, {
  OrderStatus,
  SpicyLevel,
  DrinkLevel,
  type IOrderItem,
  type IOrderItemCustomization,
} from '@/app/models/Order';
import MenuItem from '@/app/models/MenuItem';
import Table from '@/app/models/Table';
import { getAuthUser, requireAuth, requireRole } from '@/app/lib/auth';

const VALID_ORDER_STATUSES: readonly string[] = Object.values(OrderStatus);
const VALID_SPICY_LEVELS: readonly string[] = Object.values(SpicyLevel);
const VALID_DRINK_LEVELS: readonly string[] = Object.values(DrinkLevel);

function isOrderStatus(value: string): value is OrderStatus {
  return VALID_ORDER_STATUSES.includes(value);
}

function isSpicyLevel(value: string): value is SpicyLevel {
  return VALID_SPICY_LEVELS.includes(value);
}

function isDrinkLevel(value: string): value is DrinkLevel {
  return VALID_DRINK_LEVELS.includes(value);
}

function isMongoDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}

function normalizeCustomizations(raw: unknown): IOrderItemCustomization {
  if (typeof raw !== 'object' || raw === null) {
    return {
      spicyLevel: SpicyLevel.NONE,
      allergyNotes: '',
    };
  }

  const record = raw as Record<string, unknown>;
  const rawSpicy = record.spicyLevel ?? record.spicy_level;
  const rawIce = record.iceLevel ?? record.ice_level;
  const rawSweetness = record.sweetnessLevel ?? record.sweetness_level;
  const rawAllergy = record.allergyNotes ?? record.allergy_notes;

  const spicyCandidate = typeof rawSpicy === 'string' ? rawSpicy.trim().toUpperCase() : '';
  const iceCandidate = typeof rawIce === 'string' ? rawIce.trim() : '';
  const sweetnessCandidate = typeof rawSweetness === 'string' ? rawSweetness.trim() : '';

  const result: IOrderItemCustomization = {
    spicyLevel: isSpicyLevel(spicyCandidate) ? spicyCandidate : SpicyLevel.NONE,
    allergyNotes: typeof rawAllergy === 'string' ? rawAllergy.trim() : '',
  };

  if (isDrinkLevel(iceCandidate)) {
    result.iceLevel = iceCandidate;
  }

  if (isDrinkLevel(sweetnessCandidate)) {
    result.sweetnessLevel = sweetnessCandidate;
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get('status')?.trim() ?? '';

    const filter: { status?: OrderStatus; userId?: string } = {};
    if (rawStatus) {
      const normalizedStatus = rawStatus.toUpperCase();
      if (!isOrderStatus(normalizedStatus)) {
        return NextResponse.json(
          { success: false, message: 'Trạng thái đơn hàng không hợp lệ.' },
          { status: 400 }
        );
      }
      filter.status = normalizedStatus;
    }

    const isStaffOrAdmin = auth.user.role === 'staff' || auth.user.role === 'admin';
    if (!isStaffOrAdmin) {
      filter.userId = auth.user.userId;
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();

    return NextResponse.json(
      {
        success: true,
        orders,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi API GET /api/orders:', error);
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ khi tải đơn hàng';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const user = getAuthUser(request);

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
        { success: false, message: 'Dữ liệu đơn hàng không hợp lệ.' },
        { status: 400 }
      );
    }

    const body = rawBody as Record<string, unknown>;
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Đơn hàng phải chứa ít nhất 1 món ăn.' },
        { status: 400 }
      );
    }

    const resolvedItems: IOrderItem[] = [];
    let totalAmount = 0;

    for (const rawItem of body.items) {
      if (typeof rawItem !== 'object' || rawItem === null) {
        return NextResponse.json(
          { success: false, message: 'Thông tin món ăn trong đơn không hợp lệ.' },
          { status: 400 }
        );
      }

      const item = rawItem as Record<string, unknown>;
      const rawMenuItemId = item.menuItemId ?? item.foodId ?? item._id ?? item.id;
      const menuItemId =
        typeof rawMenuItemId === 'string'
          ? rawMenuItemId.trim()
          : '';

      if (!menuItemId || !mongoose.Types.ObjectId.isValid(menuItemId)) {
        return NextResponse.json(
          { success: false, message: 'Mã món ăn (menuItemId) không hợp lệ.' },
          { status: 400 }
        );
      }

      const rawQty = item.quantity ?? 1;
      const quantity =
        typeof rawQty === 'number'
          ? Math.floor(rawQty)
          : Number.parseInt(String(rawQty), 10);

      if (!Number.isFinite(quantity) || quantity < 1) {
        return NextResponse.json(
          { success: false, message: 'Số lượng món ăn phải tối thiểu là 1.' },
          { status: 400 }
        );
      }

      const menuItem = await MenuItem.findById(menuItemId).lean();
      if (!menuItem) {
        return NextResponse.json(
          { success: false, message: `Không tìm thấy món ăn với ID: ${menuItemId}` },
          { status: 404 }
        );
      }

      if (menuItem.isAvailable !== true) {
        return NextResponse.json(
          { success: false, message: `Món ${menuItem.name} hiện đang tạm hết` },
          { status: 400 }
        );
      }

      const serverPrice = menuItem.price;
      totalAmount += serverPrice * quantity;

      resolvedItems.push({
        menuItemId: menuItem._id ?? menuItemId,
        name: menuItem.name,
        price: serverPrice,
        quantity,
        customizations: normalizeCustomizations(item.customizations),
      });
    }

    const rawTableNumber = body.tableNumber ?? body.table_number;
    let tableNumber =
      typeof rawTableNumber === 'string' && rawTableNumber.trim()
        ? rawTableNumber.trim().toUpperCase()
        : '';

    let tableId: mongoose.Types.ObjectId | string | null = null;
    if (typeof body.tableId === 'string' && mongoose.Types.ObjectId.isValid(body.tableId.trim())) {
      const tableDoc = await Table.findById(body.tableId.trim()).select('_id tableNumber').lean();
      if (tableDoc) {
        tableId = tableDoc._id ?? body.tableId.trim();
        if (!tableNumber) {
          tableNumber = tableDoc.tableNumber;
        }
      }
    } else if (tableNumber) {
      const tableDoc = await Table.findOne({ tableNumber }).select('_id').lean();
      if (tableDoc?._id) {
        tableId = tableDoc._id;
      }
    }

    const rawOrderCode =
      typeof body.orderCode === 'string' ? body.orderCode.trim().toUpperCase() : '';
    const orderCode =
      rawOrderCode || `ORD${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

    const created = await Order.create({
      orderCode,
      userId: user?.userId ?? null,
      tableId,
      tableNumber,
      phone,
      items: resolvedItems,
      totalAmount,
      status: OrderStatus.PENDING,
      notes,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Tạo đơn hàng thành công',
        orderId: String(created._id),
        orderCode: created.orderCode,
        totalAmount: created.totalAmount,
        totalPrice: created.totalAmount,
        order: created,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (isMongoDuplicateKeyError(error)) {
      return NextResponse.json(
        { success: false, message: 'Mã đơn hàng đã tồn tại.' },
        { status: 409 }
      );
    }

    console.error('Lỗi API POST /api/orders:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi server khi khởi tạo đơn hàng',
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = requireRole(request, ['staff', 'admin']);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    await connectDB();

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
        { success: false, message: 'Dữ liệu cập nhật không hợp lệ.' },
        { status: 400 }
      );
    }

    const body = rawBody as Record<string, unknown>;
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const rawStatus = typeof body.status === 'string' ? body.status.trim().toUpperCase() : '';

    if (!orderId || !rawStatus || !isOrderStatus(rawStatus)) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng cung cấp orderId và status hợp lệ.' },
        { status: 400 }
      );
    }

    const order = mongoose.Types.ObjectId.isValid(orderId)
      ? await Order.findById(orderId)
      : await Order.findOne({ orderCode: orderId.toUpperCase() });

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy đơn hàng.' },
        { status: 404 }
      );
    }

    order.status = rawStatus;
    await order.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Đồng bộ trạng thái đơn hàng thành công',
        order,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi API PATCH /api/orders:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi cập nhật trạng thái',
        error: message,
      },
      { status: 500 }
    );
  }
}
