import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
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
import {
  emitRealtimeEvent,
  REALTIME_EVENT_TYPES,
} from '@/app/lib/realtimeBus';

const VALID_SPICY_LEVELS: readonly string[] = Object.values(SpicyLevel);
const VALID_DRINK_LEVELS: readonly string[] = Object.values(DrinkLevel);

const CLOSED_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
]);

function isSpicyLevel(value: string): value is SpicyLevel {
  return VALID_SPICY_LEVELS.includes(value);
}

function isDrinkLevel(value: string): value is DrinkLevel {
  return VALID_DRINK_LEVELS.includes(value);
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

function isSameCustomization(
  a?: IOrderItemCustomization,
  b?: IOrderItemCustomization
): boolean {
  const normA = normalizeCustomizations(a);
  const normB = normalizeCustomizations(b);
  return (
    normA.spicyLevel === normB.spicyLevel &&
    (normA.iceLevel ?? '') === (normB.iceLevel ?? '') &&
    (normA.sweetnessLevel ?? '') === (normB.sweetnessLevel ?? '') &&
    (normA.allergyNotes ?? '') === (normB.allergyNotes ?? '')
  );
}

function recalculateTotalAmount(items: IOrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export async function POST(request: NextRequest) {
  try {
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
        { success: false, message: 'Dữ liệu gọi thêm món không hợp lệ.' },
        { status: 400 }
      );
    }

    const body = rawBody as Record<string, unknown>;
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Danh sách món gọi thêm phải có ít nhất 1 món.' },
        { status: 400 }
      );
    }

    // 1. Xác thực món & lấy đơn giá chuẩn từ MenuItem
    const incomingItems: IOrderItem[] = [];
    for (const rawItem of body.items) {
      if (typeof rawItem !== 'object' || rawItem === null) {
        return NextResponse.json(
          { success: false, message: 'Thông tin món gọi thêm không hợp lệ.' },
          { status: 400 }
        );
      }

      const item = rawItem as Record<string, unknown>;
      const rawMenuItemId = item.menuItemId ?? item.foodId ?? item._id ?? item.id;
      const menuItemId = typeof rawMenuItemId === 'string' ? rawMenuItemId.trim() : '';

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
          { success: false, message: 'Số lượng món gọi thêm phải tối thiểu là 1.' },
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

      incomingItems.push({
        menuItemId: new mongoose.Types.ObjectId(menuItemId),
        name: menuItem.name,
        price: menuItem.price,
        quantity,
        customizations: normalizeCustomizations(item.customizations),
      });
    }

    // 2. Xác định Order ID hiện tại của bàn
    const rawOrderId =
      typeof body.orderId === 'string'
        ? body.orderId.trim()
        : typeof body.order_id === 'string'
        ? body.order_id.trim()
        : '';

    const rawTableNumber = body.tableNumber ?? body.table_number;
    let tableNumber =
      typeof rawTableNumber === 'string' && rawTableNumber.trim()
        ? rawTableNumber.trim().toUpperCase()
        : '';

    const rawTableId =
      typeof body.tableId === 'string' && mongoose.Types.ObjectId.isValid(body.tableId.trim())
        ? body.tableId.trim()
        : '';

    if (rawTableId && !tableNumber) {
      const tableDoc = await Table.findById(rawTableId).select('tableNumber').lean();
      if (tableDoc?.tableNumber) {
        tableNumber = tableDoc.tableNumber;
      }
    }

    let targetOrder = null;

    if (rawOrderId) {
      targetOrder = mongoose.Types.ObjectId.isValid(rawOrderId)
        ? await Order.findById(rawOrderId)
        : await Order.findOne({ orderCode: rawOrderId.toUpperCase() });
    } else if (rawTableId || tableNumber) {
      const tableFilter: Record<string, unknown> = {
        status: { $nin: Array.from(CLOSED_ORDER_STATUSES) },
      };
      if (rawTableId && tableNumber) {
        tableFilter.$or = [{ tableId: rawTableId }, { tableNumber }];
      } else if (rawTableId) {
        tableFilter.tableId = rawTableId;
      } else {
        tableFilter.tableNumber = tableNumber;
      }

      targetOrder = await Order.findOne(tableFilter).sort({ createdAt: -1 });
    }

    if (!targetOrder) {
      return NextResponse.json(
        {
          success: false,
          message: 'Không tìm thấy đơn hàng đang hoạt động của bàn để gộp món.',
        },
        { status: 404 }
      );
    }

    if (CLOSED_ORDER_STATUSES.has(targetOrder.status)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Đơn hàng hiện tại đã hoàn tất hoặc đã hủy, không thể gọi thêm món.',
        },
        { status: 400 }
      );
    }

    // 3. Gộp món vào cùng Order ID hiện tại
    const currentItems: IOrderItem[] = Array.isArray(targetOrder.items)
      ? [...targetOrder.items]
      : [];

    let mergedCount = 0;
    let addedNewLines = 0;

    for (const incoming of incomingItems) {
      const existingIndex = currentItems.findIndex(
        (existing) =>
          String(existing.menuItemId) === String(incoming.menuItemId) &&
          isSameCustomization(existing.customizations, incoming.customizations)
      );

      if (existingIndex >= 0) {
        currentItems[existingIndex].quantity += incoming.quantity;
        currentItems[existingIndex].price = incoming.price;
        mergedCount += 1;
      } else {
        currentItems.push(incoming);
        addedNewLines += 1;
      }
    }

    const extraNotes = typeof body.notes === 'string' ? body.notes.trim() : '';
    if (extraNotes) {
      targetOrder.notes = targetOrder.notes
        ? `${targetOrder.notes} | Gọi thêm: ${extraNotes}`
        : `Gọi thêm: ${extraNotes}`;
    }

    targetOrder.items = currentItems;
    targetOrder.totalAmount = recalculateTotalAmount(currentItems);
    await targetOrder.save();

    // 4. Bắn tín hiệu cập nhật món gọi thêm về màn hình Nhân viên / Bếp
    const addedItemsSummary = incomingItems.map((item) => ({
      menuItemId: String(item.menuItemId),
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    try {
      emitRealtimeEvent({
        type: REALTIME_EVENT_TYPES.ORDER_STATUS_UPDATED,
        orderId: String(targetOrder._id),
        orderCode: targetOrder.orderCode,
        tableNumber: targetOrder.tableNumber || undefined,
        status: targetOrder.status,
        totalAmount: targetOrder.totalAmount,
        isAddon: true,
        mergedCount,
        addedNewLines,
        addedItems: addedItemsSummary,
      });
    } catch (sseError: unknown) {
      console.error('Lỗi phát sự kiện SSE khi gộp món gọi thêm:', sseError);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Đã gộp món gọi thêm vào đơn hàng hiện tại thành công',
        orderId: String(targetOrder._id),
        orderCode: targetOrder.orderCode,
        totalAmount: targetOrder.totalAmount,
        totalPrice: targetOrder.totalAmount,
        mergedCount,
        addedNewLines,
        addedItems: addedItemsSummary,
        order: targetOrder,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi API POST /api/orders/add-items:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi server khi gộp món gọi thêm',
        error: message,
      },
      { status: 500 }
    );
  }
}