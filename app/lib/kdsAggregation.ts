// =========================================================================
// THUẬT TOÁN TỰ ĐỘNG GOM MÓN CHẾ BIẾN CHO BẾP KDS (TK-164)
// =========================================================================

export interface OrderItemCustomization {
  spicy_level?: string;
  ice_level?: string;
  sweetness_level?: string;
  allergy_notes?: string;
}

export interface KDSOrderItem {
  _id?: string;
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
  tableNumber?: string;
  tableId?: string;
  phone?: string;
  items: KDSOrderItem[];
  totalAmount?: number;
  totalPrice?: number;
  status: 'PENDING' | 'COOKING' | 'COMPLETED' | 'CANCELLED' | 'Pending' | 'Cooking' | 'Completed' | 'Cancelled';
  notes?: string;
  createdAt: string | Date;
}

export interface TableItemBreakdown {
  orderId: string;
  tableNumber: string;
  quantity: number;
  customizations?: OrderItemCustomization;
}

export interface AggregatedKitchenDish {
  dishKey: string;
  dishName: string;
  foodId?: string;
  imageUrl?: string;
  category?: string;
  totalQuantity: number;
  tableBreakdown: TableItemBreakdown[];
  oldestOrderTime: Date;
  status: 'PENDING' | 'COOKING';
  breakdownSummary: string; // Chuỗi hiển thị dạng: "(Bàn 2: 2, Bàn 5: 1)"
  customizationSummary: string[]; // Tóm tắt các yêu cầu đặc biệt (mức cay, dị ứng...)
}

/**
 * Thuật toán gom nhóm tất cả các món giống nhau đang chờ nấu (PENDING hoặc COOKING)
 * từ tất cả các đơn bàn khác nhau để đầu bếp nấu cùng lúc nhiều phần (Batch Cooking).
 */
export function groupKitchenDishes(orders: KDSOrder[]): AggregatedKitchenDish[] {
  const activeOrders = orders.filter((order) => {
    const s = String(order.status).toUpperCase();
    return s === 'PENDING' || s === 'COOKING';
  });

  const dishMap = new Map<string, {
    dishKey: string;
    dishName: string;
    foodId?: string;
    imageUrl?: string;
    category?: string;
    totalQuantity: number;
    tableBreakdown: TableItemBreakdown[];
    oldestOrderTime: Date;
    hasCooking: boolean;
  }>();

  for (const order of activeOrders) {
    const tableNumber = String(order.tableNumber || order.tableId || 'Mang về');
    const orderCreatedAt = new Date(order.createdAt || Date.now());
    const isOrderCooking = String(order.status).toUpperCase() === 'COOKING';

    for (const item of order.items) {
      if (!item.name || item.quantity <= 0) continue;

      // Định danh món theo tên (chuẩn hóa) hoặc foodId
      const dishKey = item.foodId || item.name.toLowerCase().trim();

      const existing = dishMap.get(dishKey);

      if (!existing) {
        dishMap.set(dishKey, {
          dishKey,
          dishName: item.name,
          foodId: item.foodId,
          imageUrl: item.imageUrl,
          category: item.category,
          totalQuantity: item.quantity,
          tableBreakdown: [
            {
              orderId: order._id,
              tableNumber,
              quantity: item.quantity,
              customizations: item.customizations,
            },
          ],
          oldestOrderTime: orderCreatedAt,
          hasCooking: isOrderCooking,
        });
      } else {
        existing.totalQuantity += item.quantity;
        existing.tableBreakdown.push({
          orderId: order._id,
          tableNumber,
          quantity: item.quantity,
          customizations: item.customizations,
        });

        if (orderCreatedAt < existing.oldestOrderTime) {
          existing.oldestOrderTime = orderCreatedAt;
        }

        if (isOrderCooking) {
          existing.hasCooking = true;
        }
      }
    }
  }

  // Chuyển Map thành mảng kết quả và format chuỗi tổng hợp
  const result: AggregatedKitchenDish[] = Array.from(dishMap.values()).map((entry) => {
    // 1. Gom nhóm theo số bàn để tạo chuỗi rút gọn "(Bàn 2: 2, Bàn 5: 1)"
    const tableCountMap = new Map<string, number>();
    for (const b of entry.tableBreakdown) {
      tableCountMap.set(
        b.tableNumber,
        (tableCountMap.get(b.tableNumber) || 0) + b.quantity
      );
    }

    const tableParts: string[] = [];
    tableCountMap.forEach((qty, tbl) => {
      tableParts.push(`Bàn ${tbl}: ${qty}`);
    });
    const breakdownSummary = `(${tableParts.join(', ')})`;

    // 2. Trích xuất ghi chú tùy biến (độ cay, lượng đá/ngọt, dị ứng)
    const customizationSummary: string[] = [];
    for (const b of entry.tableBreakdown) {
      if (!b.customizations) continue;
      const notes: string[] = [];
      const { spicy_level, ice_level, sweetness_level, allergy_notes } = b.customizations;

      if (spicy_level && spicy_level !== 'NONE') {
        const spiceMap: Record<string, string> = {
          MILD: 'Cay nhẹ',
          MEDIUM: 'Cay vừa',
          HOT: 'Cay nhiều',
        };
        notes.push(`🌶️ ${spiceMap[spicy_level] || spicy_level}`);
      }
      if (ice_level && ice_level !== '100%') {
        notes.push(`🧊 ${ice_level} đá`);
      }
      if (sweetness_level && sweetness_level !== '100%') {
        notes.push(`🍯 ${sweetness_level} ngọt`);
      }
      if (allergy_notes && allergy_notes.trim() !== '') {
        notes.push(`⚠️ ${allergy_notes.trim()}`);
      }

      if (notes.length > 0) {
        customizationSummary.push(`Bàn ${b.tableNumber}: ${notes.join(' • ')}`);
      }
    }

    return {
      dishKey: entry.dishKey,
      dishName: entry.dishName,
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

  // Sắp xếp: Ưu tiên món đang COOKING trước, sau đó sắp xếp theo thời gian chờ lâu nhất
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
  const diff = Date.now() - new Date(time).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}
