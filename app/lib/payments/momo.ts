import crypto from 'node:crypto';
import { getMomoConfig, PaymentGatewayError } from './config';

export interface CreateMomoPaymentInput {
  transactionRef: string;
  amount: number;
  orderInfo: string;
  extraData?: string;
  requestType?: string;
}

export interface CreateMomoPaymentResult {
  payUrl: string;
  deeplink?: string;
  qrCodeUrl?: string;
  requestId: string;
  rawResponse: Record<string, unknown>;
}

/**
 * Khởi tạo phiên thanh toán qua MoMo Payment Gateway v2 (/v2/gateway/api/create)
 */
export async function createMomoPayment(
  input: CreateMomoPaymentInput
): Promise<CreateMomoPaymentResult> {
  const config = getMomoConfig();

  const amount = Math.round(input.amount);
  const orderId = input.transactionRef;
  const requestId = input.transactionRef;
  const extraData = input.extraData ?? '';
  const requestType = input.requestType ?? 'captureWallet';
  const orderInfo = input.orderInfo || `Thanh toan coc SmaRes ${orderId}`;

  // Đúng thứ tự alphabet theo tài liệu MoMo Payment Gateway v2
  const rawSignature =
    `accessKey=${config.accessKey}` +
    `&amount=${amount}` +
    `&extraData=${extraData}` +
    `&ipnUrl=${config.ipnUrl}` +
    `&orderId=${orderId}` +
    `&orderInfo=${orderInfo}` +
    `&partnerCode=${config.partnerCode}` +
    `&redirectUrl=${config.redirectUrl}` +
    `&requestId=${requestId}` +
    `&requestType=${requestType}`;

  const signature = crypto
    .createHmac('sha256', config.secretKey)
    .update(rawSignature)
    .digest('hex');

  const requestBody = {
    partnerCode: config.partnerCode,
    partnerName: 'SmaRes Restaurant',
    storeId: 'SmaResStore',
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl: config.redirectUrl,
    ipnUrl: config.ipnUrl,
    lang: 'vi',
    extraData,
    requestType,
    signature,
  };

  let response: Response;
  try {
    response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    throw new PaymentGatewayError(
      'MOMO',
      err instanceof Error ? `Không thể kết nối tới cổng MoMo: ${err.message}` : 'Lỗi kết nối cổng MoMo.'
    );
  }

  let data: Record<string, unknown>;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new PaymentGatewayError(
      'MOMO',
      `Cổng MoMo trả về dữ liệu không hợp lệ (HTTP ${response.status}).`,
      response.status
    );
  }

  if (
    !response.ok ||
    Number(data.resultCode) !== 0 ||
    typeof data.payUrl !== 'string' ||
    !data.payUrl
  ) {
    const gatewayMsg =
      typeof data.message === 'string' && data.message.trim().length > 0
        ? data.message
        : `Lỗi từ cổng MoMo (resultCode: ${String(data.resultCode ?? response.status)})`;
    throw new PaymentGatewayError(
      'MOMO',
      gatewayMsg,
      data.resultCode as string | number,
      data
    );
  }

  return {
    payUrl: data.payUrl,
    deeplink: typeof data.deeplink === 'string' ? data.deeplink : undefined,
    qrCodeUrl: typeof data.qrCodeUrl === 'string' ? data.qrCodeUrl : undefined,
    requestId,
    rawResponse: data,
  };
}

/**
 * Xác thực chữ ký IPN / Redirect Callback của MoMo v2 bằng timingSafeEqual
 */
export function verifyMomoSignature(
  payload: Record<string, unknown>,
  override?: { accessKey: string; secretKey: string }
): boolean {
  const receivedSignature = payload.signature;
  if (typeof receivedSignature !== 'string' || receivedSignature.trim().length === 0) {
    return false;
  }

  let accessKey = override?.accessKey;
  let secretKey = override?.secretKey;

  if (!accessKey || !secretKey) {
    try {
      const config = getMomoConfig();
      accessKey = config.accessKey;
      secretKey = config.secretKey;
    } catch {
      return false;
    }
  }

  const rawSignature =
    `accessKey=${accessKey}` +
    `&amount=${payload.amount ?? ''}` +
    `&extraData=${payload.extraData ?? ''}` +
    `&message=${payload.message ?? ''}` +
    `&orderId=${payload.orderId ?? ''}` +
    `&orderInfo=${payload.orderInfo ?? ''}` +
    `&orderType=${payload.orderType ?? ''}` +
    `&partnerCode=${payload.partnerCode ?? ''}` +
    `&payType=${payload.payType ?? ''}` +
    `&requestId=${payload.requestId ?? ''}` +
    `&responseTime=${payload.responseTime ?? ''}` +
    `&resultCode=${payload.resultCode ?? ''}` +
    `&transId=${payload.transId ?? ''}`;

  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSignature.toLowerCase(), 'utf-8');
  const receivedBuf = Buffer.from(receivedSignature.trim().toLowerCase(), 'utf-8');

  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

const MOMO_RESULT_MESSAGES: Record<string, string> = {
  '0': 'Giao dịch thành công.',
  '1000': 'Giao dịch đã được khởi tạo, chờ người dùng xác nhận thanh toán.',
  '1001': 'Giao dịch thanh toán thất bại do tài khoản người dùng không đủ tiền.',
  '1002': 'Giao dịch bị từ chối do nhà phát hành tài khoản thanh toán.',
  '1003': 'Giao dịch đã bị hủy.',
  '1004': 'Giao dịch thất bại do số tiền thanh toán vượt quá hạn mức.',
  '1005': 'Giao dịch thất bại do URL hoặc QR code đã hết hạn.',
  '1006': 'Người dùng đã từ chối xác nhận thanh toán.',
  '1007': 'Giao dịch bị từ chối vì tài khoản người dùng đang bị khóa.',
  '7002': 'Giao dịch đang được xử lý bởi nhà cung cấp phương thức thanh toán.',
  '9000': 'Giao dịch đã được xác nhận thành công.',
};

export function getMomoResultMessage(resultCode?: number | string | null): string {
  if (resultCode === undefined || resultCode === null || resultCode === '') {
    return 'Không nhận được mã kết quả từ MoMo.';
  }
  const key = String(resultCode);
  return MOMO_RESULT_MESSAGES[key] || `Thanh toán MoMo không thành công (Mã lỗi: ${key}).`;
}
