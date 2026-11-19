// =========================================================================
// THUẬT TOÁN TỰ ĐỘNG GOM MÓN CHẾ BIẾN CHO BẾP KDS (TK-164)
// =========================================================================

export const KDS_ORDER_STATUS = {
  PENDING: 'PENDING',
  COOKING: 'COOKING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type KdsOrderStatus = (typeof KDS_ORDER_STATUS)[keyof typeof KDS_ORDER_STATUS];

export interface OrderItemCustomization {
  spicyLevel?: string;
  iceLevel?: string;
  sweetnessLevel?: string;
  allergyNotes?: string;
  spicy_level?: string;
  ice_level?: string;
  sweetness_level?: string;
  allergy_notes?: string;
}

export interface NormalizedOrderItemCustomization {
  spicyLevel: string;
  iceLevel?: string;
  sweetnessLevel?: string;
  allergyNotes: string;
}

export interface KDSOrderItem {
  _id?: string;
  menuItemId?: string;
  foodId?: string;
  name: string;
  quantity: number;
  price?: number;
  imageUrl?: string;
  category?: string;
  customizations?: OrderItemCustomization;
}

export interface KDSOrder {
  _id: string;
  orderCode?: string;
  tableNumber?: string;
  tableId?: string;
  phone?: string;
  items: KDSOrderItem[];
  totalAmount?: number;
  totalPrice?: number;
  status: KdsOrderStatus | string;
  notes?: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface TableItemBreakdown {
  orderId: string;
  orderCode?: string;
  tableNumber: string;
  quantity: number;
  status: 'PENDING' | 'COOKING';
  customizations?: OrderItemCustomization;
}

export interface AggregatedKitchenDish {
  dishKey: string;
  dishName: string;
  menuItemId?: string;
  foodId?: string;
  imageUrl?: string;
  category?: string;
  totalQuantity: number;
  tableBreakdown: TableItemBreakdown[];
  oldestOrderTime: Date;
  status: 'PENDING' | 'COOKING';
  breakdownSummary: string;
  customizationSummary: string[];
}

const SPICE_LABEL_MAP: Record<string, string> = {
  MILD: 'Cay nhẹ',
  MEDIUM: 'Cay vừa',
  HOT: 'Cay nhiều',
};

export function normalizeOrderStatus(status?: string | null): KdsOrderStatus {
  const upper = String(status ?? '').trim().toUpperCase();
  if (upper === KDS_ORDER_STATUS.COOKING || upper === 'PREPARING') {
    return KDS_ORDER_STATUS.COOKING;
  }
  if (upper === KDS_ORDER_STATUS.COMPLETED) {
    return KDS_ORDER_STATUS.COMPLETED;
  }
  if (upper === KDS_ORDER_STATUS.CANCELLED) {
    return KDS_ORDER_STATUS.CANCELLED;
  }
  return KDS_ORDER_STATUS.PENDING;
}

export function normalizeOrderCustomization(
  raw?: OrderItemCustomization | null
): NormalizedOrderItemCustomization {
  if (!raw) {
    return {
      spicyLevel: 'NONE',
      allergyNotes: '',
    };
  }

  const rawSpicy = raw.spicyLevel ?? raw.spicy_level ?? 'NONE';
  const rawIce = raw.iceLevel ?? raw.ice_level ?? '';
  const rawSweetness = raw.sweetnessLevel ?? raw.sweetness_level ?? '';
  const rawAllergy = raw.allergyNotes ?? raw.allergy_notes ?? '';

  const spicyLevel = String(rawSpicy).trim().toUpperCase() || 'NONE';
  const iceLevel = String(rawIce).trim() || undefined;
  const sweetnessLevel = String(rawSweetness).trim() || undefined;
  const allergyNotes = String(rawAllergy).trim();

  return {
    spicyLevel,
    iceLevel,
    sweetnessLevel,
    allergyNotes,
  };
}

export function formatCustomizationLabels(
  raw?: OrderItemCustomization | null,
  options?: { includeDefaultLevels?: boolean }
): string[] {
  const normalized = normalizeOrderCustomization(raw);
  const labels: string[] = [];
  const includeDefault = options?.includeDefaultLevels === true;

  if (normalized.spicyLevel && normalized.spicyLevel !== 'NONE') {
    labels.push(`Độ cay: ${SPICE_LABEL_MAP[normalized.spicyLevel] || normalized.spicyLevel}`);
  }
  if (normalized.iceLevel && (includeDefault || normalized.iceLevel !== '100%')) {
    labels.push(`Đá: ${normalized.iceLevel}`);
  }
  if (normalized.sweetnessLevel && (includeDefault || normalized.sweetnessLevel !== '100%')) {
    labels.push(`Ngọt: ${normalized.sweetnessLevel}`);
  }
  if (normalized.allergyNotes) {
    labels.push(`Lưu ý: ${normalized.allergyNotes}`);
  }

  return labels;
}

function formatTableLabel(tableNumber: string): string {
  const trimmed = tableNumber.trim();
  if (!trimmed || trimmed === 'Mang về') {
    return 'Mang về';
  }
  return /^bàn\s+/i.test(trimmed) ? trimmed : `Bàn ${trimmed}`;
}

/**
 * Thuật toán gom nhóm tất cả các món giống nhau đang chờ nấu (PENDING hoặc COOKING)
 * từ tất cả các đơn bàn khác nhau để đầu bếp nấu cùng lúc nhiều phần (Batch Cooking).
 */
export function groupKitchenDishes(orders: KDSOrder[]): AggregatedKitchenDish[] {
  const activeOrders = orders.filter((order) => {
    const normalized = normalizeOrderStatus(order.status);
    return normalized === KDS_ORDER_STATUS.PENDING || normalized === KDS_ORDER_STATUS.COOKING;
  });

  const dishMap = new Map<
    string,
    {
      dishKey: string;
      dishName: string;
      menuItemId?: string;
      foodId?: string;
      imageUrl?: string;
      category?: string;
      totalQuantity: number;
      tableBreakdown: TableItemBreakdown[];
      oldestOrderTime: Date;
      hasCooking: boolean;
    }
  >();

  for (const order of activeOrders) {
    const rawTable = String(order.tableNumber || order.tableId || '').trim();
    const tableNumber = rawTable || 'Mang về';
    const parsedTime = new Date(order.createdAt || Date.now());
    const orderCreatedAt = Number.isNaN(parsedTime.getTime()) ? new Date() : parsedTime;
    const orderStatus = normalizeOrderStatus(order.status);
    const activeStatus: 'PENDING' | 'COOKING' =
      orderStatus === KDS_ORDER_STATUS.COOKING ? 'COOKING' : 'PENDING';

    for (const item of order.items) {
      if (!item.name || item.quantity <= 0) continue;

      const dishKey = String(item.menuItemId || item.foodId || item.name.toLowerCase().trim());
      const menuItemIdStr = item.menuItemId ? String(item.menuItemId) : undefined;
      const foodIdStr = item.foodId ? String(item.foodId) : undefined;
      const existing = dishMap.get(dishKey);

      const breakdownEntry: TableItemBreakdown = {
        orderId: order._id,
        orderCode: order.orderCode,
        tableNumber,
        quantity: item.quantity,
        status: activeStatus,
        customizations: item.customizations,
      };

      if (!existing) {
        dishMap.set(dishKey, {
          dishKey,
          dishName: item.name,
          menuItemId: menuItemIdStr,
          foodId: foodIdStr,
          imageUrl: item.imageUrl,
          category: item.category,
          totalQuantity: item.quantity,
          tableBreakdown: [breakdownEntry],
          oldestOrderTime: orderCreatedAt,
          hasCooking: activeStatus === 'COOKING',
        });
      } else {
        existing.totalQuantity += item.quantity;
        existing.tableBreakdown.push(breakdownEntry);

        if (!existing.menuItemId && menuItemIdStr) {
          existing.menuItemId = menuItemIdStr;
        }
        if (!existing.foodId && foodIdStr) {
          existing.foodId = foodIdStr;
        }
        if (orderCreatedAt < existing.oldestOrderTime) {
          existing.oldestOrderTime = orderCreatedAt;
        }
        if (activeStatus === 'COOKING') {
          existing.hasCooking = true;
        }
      }
    }
  }

  const result: AggregatedKitchenDish[] = Array.from(dishMap.values()).map((entry) => {
    const tableCountMap = new Map<string, number>();
    for (const b of entry.tableBreakdown) {
      tableCountMap.set(b.tableNumber, (tableCountMap.get(b.tableNumber) || 0) + b.quantity);
    }

    const tableParts: string[] = [];
    tableCountMap.forEach((qty, tbl) => {
      tableParts.push(`${formatTableLabel(tbl)}: ${qty}`);
    });
    const breakdownSummary = `(${tableParts.join(', ')})`;

    const customizationSummary: string[] = [];
    for (const b of entry.tableBreakdown) {
      const notes = formatCustomizationLabels(b.customizations, { includeDefaultLevels: false });
      if (notes.length > 0) {
        customizationSummary.push(`${formatTableLabel(b.tableNumber)}: ${notes.join(' • ')}`);
      }
    }

    return {
      dishKey: entry.dishKey,
      dishName: entry.dishName,
      menuItemId: entry.menuItemId,
      foodId: entry.foodId,
      imageUrl: entry.imageUrl,
      category: entry.category,
      totalQuantity: entry.totalQuantity,
      tableBreakdown: entry.tableBreakdown,
      oldestOrderTime: entry.oldestOrderTime,
      status: entry.hasCooking ? 'COOKING' : 'PENDING',
      breakdownSummary,
      customizationSummary,
    };
  });

  // Ưu tiên món đang COOKING trước, sau đó sắp xếp theo thời gian chờ lâu nhất
  result.sort((a, b) => {
    if (a.status === 'COOKING' && b.status !== 'COOKING') return -1;
    if (a.status !== 'COOKING' && b.status === 'COOKING') return 1;
    return a.oldestOrderTime.getTime() - b.oldestOrderTime.getTime();
  });

  return result;
}

/**
 * Tính số phút đã trôi qua kể từ khi gọi món
 */
export function getWaitMinutes(time: string | Date): number {
  const timestamp = new Date(time).getTime();
  if (Number.isNaN(timestamp)) return 0;
  const diff = Date.now() - timestamp;
  return Math.max(0, Math.floor(diff / 60000));
}
