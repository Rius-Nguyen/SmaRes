import {
  TABLE_STATUS,
  type TableStatusValue,
  normalizeTableStatus,
} from '@/app/lib/tableStateMachine';

export interface TableQrActivityMeta {
  isActive: boolean;
  normalizedStatus: TableStatusValue;
  activityLabel: 'Đang hoạt động' | 'Không hoạt động';
  statusLabel: string;
  hint: string;
}

/**
 * Returns true when a table is currently seated and ready to accept QR orders without login.
 */
export function isTableQrActive(status: string): boolean {
  return normalizeTableStatus(status) === TABLE_STATUS.SEATED;
}

/**
 * Summarizes whether a table QR is active (SEATED) or inactive (AVAILABLE/RESERVED/CLEANING).
 */
export function getTableQrActivityMeta(status: TableStatusValue | string): TableQrActivityMeta {
  const normalizedStatus = normalizeTableStatus(status) ?? TABLE_STATUS.AVAILABLE;

  switch (normalizedStatus) {
    case TABLE_STATUS.SEATED:
      return {
        isActive: true,
        normalizedStatus,
        activityLabel: 'Đang hoạt động',
        statusLabel: 'Đang phục vụ (SEATED)',
        hint: 'Khách tại bàn quét mã QR này để gọi món trực tiếp không cần đăng nhập.',
      };
    case TABLE_STATUS.RESERVED:
      return {
        isActive: false,
        normalizedStatus,
        activityLabel: 'Không hoạt động',
        statusLabel: 'Đã đặt trước (RESERVED)',
        hint: 'Chưa làm thủ tục Check-in — quét QR lúc này sẽ khóa gọi món cho đến khi mở bàn.',
      };
    case TABLE_STATUS.CLEANING:
      return {
        isActive: false,
        normalizedStatus,
        activityLabel: 'Không hoạt động',
        statusLabel: 'Đang dọn dẹp (CLEANING)',
        hint: 'Bàn đang thu dọn — tạm khóa gọi món qua mã QR.',
      };
    case TABLE_STATUS.AVAILABLE:
    default:
      return {
        isActive: false,
        normalizedStatus,
        activityLabel: 'Không hoạt động',
        statusLabel: 'Bàn trống (AVAILABLE)',
        hint: 'Bàn chưa mở phiên phục vụ — hãy Check-in bàn trước khi khách quét đặt món.',
      };
  }
}

/**
 * Normalizes an optional origin/base URL before constructing printable table QR links.
 */
export function normalizeQrBaseUrl(rawBaseUrl?: string | null): string {
  if (!rawBaseUrl) {
    return '';
  }
  const trimmed = rawBaseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return '';
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const isLocalHostOrIp = /^(localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3})(:\d+)?$/i.test(trimmed);
  return `${isLocalHostOrIp ? 'http' : 'https'}://${trimmed}`;
}

/**
 * Builds the permanent printable table menu URL scanned by dining guests without requiring login.
 */
export function buildPrintableTableQrUrl(
  tableNumber: string,
  baseUrl?: string | null
): string {
  const normalizedTable = tableNumber.trim().toUpperCase();
  const path = `/table-menu?table=${encodeURIComponent(normalizedTable)}`;
  const normalizedBase = normalizeQrBaseUrl(baseUrl);
  return normalizedBase ? `${normalizedBase}${path}` : path;
}
