export interface VnpayConfig {
  tmnCode: string;
  hashSecret: string;
  url: string;
  returnUrl: string;
  ipnUrl: string;
}

export interface MomoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  endpoint: string;
  redirectUrl: string;
  ipnUrl: string;
}

export class PaymentConfigError extends Error {
  readonly provider: 'VNPAY' | 'MOMO';
  readonly missingVars: readonly string[];

  constructor(provider: 'VNPAY' | 'MOMO', missingVars: readonly string[], message?: string) {
    super(
      message ||
        `Cấu hình cổng thanh toán ${provider} chưa đầy đủ. Thiếu hoặc chưa thiết lập: ${missingVars.join(', ')}.`
    );
    this.name = 'PaymentConfigError';
    this.provider = provider;
    this.missingVars = missingVars;
  }
}

export class PaymentGatewayError extends Error {
  readonly provider: 'VNPAY' | 'MOMO';
  readonly code?: string | number;
  readonly rawResponse?: Record<string, unknown>;

  constructor(
    provider: 'VNPAY' | 'MOMO',
    message: string,
    code?: string | number,
    rawResponse?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PaymentGatewayError';
    this.provider = provider;
    this.code = code;
    this.rawResponse = rawResponse;
  }
}

function isPlaceholder(value?: string): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return (
    trimmed.length === 0 ||
    trimmed.startsWith('YOUR_') ||
    trimmed.startsWith('replace-with-')
  );
}

export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return raw.trim().replace(/\/+$/, '');
}

export function getVnpayConfig(): VnpayConfig {
  const appUrl = getAppUrl();
  const tmnCode = (process.env.VNPAY_TMN_CODE || process.env.VNP_TMN_CODE || '').trim();
  const hashSecret = (
    process.env.VNPAY_HASH_SECRET ||
    process.env.VNP_HASH_SECRET ||
    ''
  ).trim();
  const url = (
    process.env.VNPAY_URL ||
    process.env.VNP_URL ||
    'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
  ).trim();
  const returnUrl = (
    process.env.VNPAY_RETURN_URL ||
    process.env.VNP_RETURN_URL ||
    `${appUrl}/payment/result`
  ).trim();
  const ipnUrl = (
    process.env.VNPAY_IPN_URL ||
    process.env.VNP_IPN_URL ||
    `${appUrl}/api/payments/vnpay-ipn`
  ).trim();

  const missingVars: string[] = [];
  if (isPlaceholder(tmnCode)) missingVars.push('VNPAY_TMN_CODE');
  if (isPlaceholder(hashSecret)) missingVars.push('VNPAY_HASH_SECRET');

  if (missingVars.length > 0) {
    throw new PaymentConfigError('VNPAY', missingVars);
  }

  return {
    tmnCode,
    hashSecret,
    url,
    returnUrl,
    ipnUrl,
  };
}

export function getMomoConfig(): MomoConfig {
  const appUrl = getAppUrl();
  const partnerCode = (process.env.MOMO_PARTNER_CODE || '').trim();
  const accessKey = (process.env.MOMO_ACCESS_KEY || '').trim();
  const secretKey = (process.env.MOMO_SECRET_KEY || '').trim();
  const endpoint = (
    process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create'
  ).trim();
  const redirectUrl = (
    process.env.MOMO_REDIRECT_URL || `${appUrl}/payment/result`
  ).trim();
  const ipnUrl = (
    process.env.MOMO_IPN_URL || `${appUrl}/api/payments/momo-ipn`
  ).trim();

  const missingVars: string[] = [];
  if (isPlaceholder(partnerCode)) missingVars.push('MOMO_PARTNER_CODE');
  if (isPlaceholder(accessKey)) missingVars.push('MOMO_ACCESS_KEY');
  if (isPlaceholder(secretKey)) missingVars.push('MOMO_SECRET_KEY');

  if (missingVars.length > 0) {
    throw new PaymentConfigError('MOMO', missingVars);
  }

  return {
    partnerCode,
    accessKey,
    secretKey,
    endpoint,
    redirectUrl,
    ipnUrl,
  };
}

export function isVnpayConfigured(): boolean {
  try {
    getVnpayConfig();
    return true;
  } catch {
    return false;
  }
}

export function isMomoConfigured(): boolean {
  try {
    getMomoConfig();
    return true;
  } catch {
    return false;
  }
}
