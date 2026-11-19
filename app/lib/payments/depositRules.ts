export const STANDARD_DEPOSIT_AMOUNT = 100_000;
export const VIP_BASE_DEPOSIT_AMOUNT = 300_000;
export const PRE_ORDER_DEPOSIT_RATE = 0.2;
export const LARGE_PARTY_CAPACITY_THRESHOLD = 6;

export const DepositTier = {
  STANDARD: 'STANDARD',
  VIP_OR_LARGE: 'VIP_OR_LARGE',
} as const;

export type DepositTier = (typeof DepositTier)[keyof typeof DepositTier];

export interface DepositClassificationInput {
  tableNumber?: string | null;
  zoneName?: string | null;
  capacity?: number | null;
  guests?: number | null;
}

export interface CalculateDepositInput extends DepositClassificationInput {
  preOrderTotal?: number | null;
}

export interface DepositCalculationResult {
  amount: number;
  depositTier: DepositTier;
  preOrderTotal: number;
}

/**
 * Xác định bàn thuộc nhóm Phòng VIP / Bàn tiệc lớn theo BR-RES-07.
 */
export function isVipOrLargeTable(input: DepositClassificationInput): boolean {
  const zoneLower = (input.zoneName ?? '').trim().toLowerCase();
  const tableUpper = (input.tableNumber ?? '').trim().toUpperCase();
  const capacity =
    typeof input.capacity === 'number' && Number.isFinite(input.capacity) ? input.capacity : 0;
  const guests =
    typeof input.guests === 'number' && Number.isFinite(input.guests) ? input.guests : 0;

  return (
    zoneLower.includes('vip') ||
    tableUpper.startsWith('V') ||
    capacity >= LARGE_PARTY_CAPACITY_THRESHOLD ||
    guests >= LARGE_PARTY_CAPACITY_THRESHOLD
  );
}

/**
 * Tính mức tiền đặt cọc chuẩn theo BR-RES-07 (dùng được ở cả Client Preview & Server).
 */
export function calculateDepositAmount(
  input: CalculateDepositInput
): DepositCalculationResult {
  const safePreOrderTotal =
    typeof input.preOrderTotal === 'number' &&
    Number.isFinite(input.preOrderTotal) &&
    input.preOrderTotal > 0
      ? Math.round(input.preOrderTotal)
      : 0;

  if (!isVipOrLargeTable(input)) {
    return {
      amount: STANDARD_DEPOSIT_AMOUNT,
      depositTier: DepositTier.STANDARD,
      preOrderTotal: safePreOrderTotal,
    };
  }

  const percentageAmount =
    safePreOrderTotal > 0 ? Math.round(safePreOrderTotal * PRE_ORDER_DEPOSIT_RATE) : 0;
  const amount = Math.max(VIP_BASE_DEPOSIT_AMOUNT, percentageAmount);

  return {
    amount,
    depositTier: DepositTier.VIP_OR_LARGE,
    preOrderTotal: safePreOrderTotal,
  };
}
