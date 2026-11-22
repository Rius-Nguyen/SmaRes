import { Types } from 'mongoose';
import MenuItem from '@/app/models/MenuItem';

export {
  STANDARD_DEPOSIT_AMOUNT,
  VIP_BASE_DEPOSIT_AMOUNT,
  PRE_ORDER_DEPOSIT_RATE,
  LARGE_PARTY_CAPACITY_THRESHOLD,
  DepositTier,
  isVipOrLargeTable,
  calculateDepositAmount,
  type DepositClassificationInput,
  type CalculateDepositInput,
  type DepositCalculationResult,
} from './depositRules';

export interface PreOrderItemInput {
  menuItemId: string;
  quantity: number;
}

/**
 * Chuẩn hóa danh sách món đặt trước gửi lên từ Client.
 */
export function parsePreOrderItems(raw: unknown): PreOrderItemInput[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const items: PreOrderItemInput[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const menuItemId = typeof record.menuItemId === 'string' ? record.menuItemId.trim() : '';
    const quantity = Number(record.quantity);
    if (menuItemId && Number.isInteger(quantity) && quantity >= 1) {
      items.push({ menuItemId, quantity });
    }
  }
  return items;
}

export interface VerifiedPreOrderSummary {
  verifiedTotal: number;
  hasSpecialItems: boolean;
}

/**
 * Tra cứu đơn giá gốc & cờ món đặc quyền từ MenuItem phía Server.
 * Tuyệt đối không tin giá tiền do Client gửi lên.
 */
export async function inspectVerifiedPreOrder(
  preOrderItems?: ReadonlyArray<PreOrderItemInput>
): Promise<VerifiedPreOrderSummary> {
  if (!Array.isArray(preOrderItems) || preOrderItems.length === 0) {
    return { verifiedTotal: 0, hasSpecialItems: false };
  }

  const quantityById = new Map<string, number>();
  for (const item of preOrderItems) {
    if (!item || typeof item.menuItemId !== 'string') continue;
    const trimmedId = item.menuItemId.trim();
    if (!Types.ObjectId.isValid(trimmedId)) continue;
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1) continue;
    quantityById.set(trimmedId, (quantityById.get(trimmedId) ?? 0) + qty);
  }

  if (quantityById.size === 0) {
    return { verifiedTotal: 0, hasSpecialItems: false };
  }

  const validIds = Array.from(quantityById.keys());
  const menuItems = await MenuItem.find({
    _id: { $in: validIds },
    isAvailable: true,
  })
    .select('_id price isPreOrderOnly')
    .lean();

  let verifiedTotal = 0;
  let hasSpecialItems = false;
  for (const menuItem of menuItems) {
    const qty = quantityById.get(String(menuItem._id)) ?? 0;
    if (qty <= 0) continue;

    if ((menuItem as { isPreOrderOnly?: boolean }).isPreOrderOnly === true) {
      hasSpecialItems = true;
    }

    const unitPrice =
      typeof menuItem.price === 'number' && Number.isFinite(menuItem.price)
        ? menuItem.price
        : 0;
    if (unitPrice > 0) {
      verifiedTotal += unitPrice * qty;
    }
  }

  return {
    verifiedTotal: Math.round(verifiedTotal),
    hasSpecialItems,
  };
}

/**
 * Tra cứu đơn giá gốc từ MongoDB MenuItem để tính tổng tiền món đặt trước phía Server.
 * Tuyệt đối không tin giá tiền do Client gửi lên.
 */
export async function computeVerifiedPreOrderTotal(
  preOrderItems?: ReadonlyArray<PreOrderItemInput>
): Promise<number> {
  const { verifiedTotal } = await inspectVerifiedPreOrder(preOrderItems);
  return verifiedTotal;
}
