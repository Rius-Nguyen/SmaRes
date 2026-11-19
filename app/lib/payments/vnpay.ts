import crypto from 'node:crypto';
import { getVnpayConfig } from './config';

export interface CreateVnpayPaymentUrlInput {
  transactionRef: string;
  amount: number;
  orderInfo: string;
  ipAddr?: string;
  expireMinutes?: number;
  locale?: 'vn' | 'en';
  returnUrl?: string;
}

export interface CreateVnpayPaymentUrlResult {
  paymentUrl: string;
  createDate: string;
  expireDate: string;
}

/**
 * Định dạng thời gian YYYYMMDDHHmmss theo đúng múi giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7)
 */
export function formatVnpayDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  const hour = map.hour === '24' ? '00' : map.hour;
  return `${map.year}${map.month}${map.day}${hour}${map.minute}${map.second}`;
}

/**
 * Chuẩn hóa chuỗi nội dung thanh toán không dấu để tương thích tối đa với VNPay Sandbox
 */
export function sanitizeVnpayOrderInfo(orderInfo: string): string {
  return orderInfo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Chuẩn hóa IP client về IPv4 hợp lệ cho VNPay
 */
export function normalizeIpAddr(ip?: string | null): string {
  if (!ip) return '127.0.0.1';
  const cleaned = ip.trim().replace(/^::ffff:/i, '');
  if (!cleaned || cleaned === '::1' || cleaned.includes(':')) {
    return '127.0.0.1';
  }
  return cleaned;
}

/**
 * Sắp xếp tham số theo alphabet A-Z và URL-encode theo chuẩn VNPay (%20 -> +)
 */
export function sortVnpayParams(
  obj: Record<string, string | number | undefined | null>
): Record<string, string> {
  const keys = Object.keys(obj).filter(
    (key) => obj[key] !== undefined && obj[key] !== null && obj[key] !== ''
  );
  keys.sort();

  const sorted: Record<string, string> = {};
  for (const key of keys) {
    const encodedKey = encodeURIComponent(key);
    const encodedVal = encodeURIComponent(String(obj[key])).replace(/%20/g, '+');
    sorted[encodedKey] = encodedVal;
  }

  return sorted;
}

export function buildVnpaySignData(
  obj: Record<string, string | number | undefined | null>
): string {
  const sorted = sortVnpayParams(obj);
  return Object.entries(sorted)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

/**
 * Tạo đường dẫn thanh toán VNPay Sandbox v2.1.0 với chữ ký HMAC-SHA512
 */
export function createVnpayPaymentUrl(
  input: CreateVnpayPaymentUrlInput
): CreateVnpayPaymentUrlResult {
  const config = getVnpayConfig();
  const expireMinutes = input.expireMinutes ?? 10;

  const now = new Date();
  const expireAt = new Date(now.getTime() + expireMinutes * 60 * 1000);

  const createDate = formatVnpayDate(now);
  const expireDate = formatVnpayDate(expireAt);
  const vnpAmount = Math.round(input.amount * 100);
  const orderInfo =
    sanitizeVnpayOrderInfo(input.orderInfo) || `Thanh toan coc ${input.transactionRef}`;

  const vnpParams: Record<string, string | number> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: config.tmnCode,
    vnp_Locale: input.locale ?? 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: input.transactionRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: vnpAmount,
    vnp_ReturnUrl: input.returnUrl || config.returnUrl,
    vnp_IpAddr: normalizeIpAddr(input.ipAddr),
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  const signData = buildVnpaySignData(vnpParams);
  const secureHash = crypto
    .createHmac('sha512', config.hashSecret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  const paymentUrl = `${config.url}?${signData}&vnp_SecureHash=${secureHash}`;

  return {
    paymentUrl,
    createDate,
    expireDate,
  };
}

/**
 * Xác thực chữ ký phản hồi VNPay (IPN / Return URL) bằng crypto.timingSafeEqual
 */
export function verifyVnpaySignature(
  params: Record<string, string>,
  hashSecretOverride?: string
): boolean {
  const receivedHash = params.vnp_SecureHash;
  if (!receivedHash || typeof receivedHash !== 'string') {
    return false;
  }

  let secret = hashSecretOverride;
  if (!secret) {
    try {
      secret = getVnpayConfig().hashSecret;
    } catch {
      return false;
    }
  }

  const filteredParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (
      key.startsWith('vnp_') &&
      key !== 'vnp_SecureHash' &&
      key !== 'vnp_SecureHashType' &&
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      filteredParams[key] = String(value);
    }
  }

  const signData = buildVnpaySignData(filteredParams);
  const expectedHash = crypto
    .createHmac('sha512', secret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  const expectedBuf = Buffer.from(expectedHash.toLowerCase(), 'utf-8');
  const receivedBuf = Buffer.from(receivedHash.trim().toLowerCase(), 'utf-8');

  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

const VNPAY_RESPONSE_MESSAGES: Record<string, string> = {
  '00': 'Giao dịch thành công.',
  '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới giao dịch bất thường).',
  '09': 'Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
  '10': 'Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.',
  '11': 'Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
  '12': 'Thẻ/Tài khoản của khách hàng bị khóa.',
  '13': 'Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
  '24': 'Quý khách đã hủy giao dịch thanh toán.',
  '51': 'Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
  '65': 'Tài khoản của quý khách đã vượt quá hạn mức giao dịch trong ngày.',
  '75': 'Ngân hàng thanh toán đang bảo trì.',
  '79': 'Quý khách nhập sai mật khẩu thanh toán quá số lần quy định.',
  '99': 'Giao dịch không thành công hoặc có lỗi phát sinh từ cổng thanh toán.',
};

export function getVnpayResponseMessage(code?: string | null): string {
  if (!code) return 'Không nhận được mã phản hồi từ VNPay.';
  return VNPAY_RESPONSE_MESSAGES[code] || `Thanh toán VNPay không thành công (Mã lỗi: ${code}).`;
}
