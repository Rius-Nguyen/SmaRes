/**
 * Format a numeric VND amount into Vietnamese locale currency string (e.g. `380.000đ`).
 */
export function formatMoney(val: number): string {
  const numericVal = Number(val || 0);
  const safeVal = Number.isFinite(numericVal) ? numericVal : 0;
  return `${safeVal.toLocaleString('vi-VN')}đ`;
}
