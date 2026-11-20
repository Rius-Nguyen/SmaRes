import crypto from 'node:crypto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn<() => Promise<void>>(),
  getAuthUser: vi.fn(),
  acquireTableLock: vi.fn(),
  releaseTableLock: vi.fn(),
  releaseExpiredLocksAndHolds: vi.fn(),
  sendReservationConfirmationEmail: vi.fn(),
  menuItemFind: vi.fn(),
  orderFindOne: vi.fn(),
  reservationFindById: vi.fn(),
  reservationFindOne: vi.fn(),
  reservationFindByIdAndUpdate: vi.fn(),
  tableFindById: vi.fn(),
  tableFindOneAndUpdate: vi.fn(),
  transactionFindOne: vi.fn(),
  transactionCreate: vi.fn(),
  transactionFindByIdAndUpdate: vi.fn(),
  transactionFindOneAndUpdate: vi.fn(),
  userFindById: vi.fn(),
}));

vi.mock('@/app/lib/db', () => ({
  default: mocks.connectDB,
  connectDB: mocks.connectDB,
}));

vi.mock('@/app/lib/auth', () => ({
  getAuthUser: mocks.getAuthUser,
}));

vi.mock('@/app/lib/tableLockService', () => ({
  acquireTableLock: mocks.acquireTableLock,
  releaseTableLock: mocks.releaseTableLock,
  releaseExpiredLocksAndHolds: mocks.releaseExpiredLocksAndHolds,
}));

vi.mock('@/app/lib/email/reservationConfirmationEmail', () => ({
  sendReservationConfirmationEmail: mocks.sendReservationConfirmationEmail,
}));

vi.mock('@/app/models/MenuItem', () => ({
  default: {
    find: mocks.menuItemFind,
  },
}));

vi.mock('@/app/models/Table', () => ({
  TableStatus: {
    AVAILABLE: 'AVAILABLE',
    RESERVED: 'RESERVED',
    SEATED: 'SEATED',
    CLEANING: 'CLEANING',
  } as const,
  default: {
    findById: mocks.tableFindById,
    findOneAndUpdate: mocks.tableFindOneAndUpdate,
  },
}));

vi.mock('@/app/models/Reservation', () => ({
  ReservationStatus: {
    CONFIRMED: 'CONFIRMED',
    CHECKED_IN: 'CHECKED_IN',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  } as const,
  PaymentStatus: {
    UNPAID: 'UNPAID',
    PENDING: 'PENDING',
    PAID: 'PAID',
    FAILED: 'FAILED',
    EXPIRED: 'EXPIRED',
    REFUNDED: 'REFUNDED',
  } as const,
  default: {
    findById: mocks.reservationFindById,
    findOne: mocks.reservationFindOne,
    findByIdAndUpdate: mocks.reservationFindByIdAndUpdate,
  },
}));

vi.mock('@/app/models/Transaction', () => ({
  PaymentProvider: {
    VNPAY: 'VNPAY',
    MOMO: 'MOMO',
    BANK_QR: 'BANK_QR',
  } as const,
  TransactionStatus: {
    PENDING: 'PENDING',
    PAID: 'PAID',
    FAILED: 'FAILED',
    EXPIRED: 'EXPIRED',
    REFUNDED: 'REFUNDED',
  } as const,
  default: {
    findOne: mocks.transactionFindOne,
    create: mocks.transactionCreate,
    findByIdAndUpdate: mocks.transactionFindByIdAndUpdate,
    findOneAndUpdate: mocks.transactionFindOneAndUpdate,
  },
}));

vi.mock('@/app/models/Order', () => ({
  OrderStatus: {
    PENDING: 'PENDING',
    COOKING: 'COOKING',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  },
  default: {
    findOne: mocks.orderFindOne,
  },
}));

vi.mock('@/app/models/User', () => ({
  default: {
    findById: mocks.userFindById,
  },
}));

import {
  STANDARD_DEPOSIT_AMOUNT,
  VIP_BASE_DEPOSIT_AMOUNT,
  DepositTier,
  calculateDepositAmount,
  computeVerifiedPreOrderTotal,
  isVipOrLargeTable,
} from '@/app/lib/payments/depositCalculator';
import {
  buildVnpaySignData,
  createVnpayPaymentUrl,
  formatVnpayDate,
  verifyVnpaySignature,
} from '@/app/lib/payments/vnpay';
import { createMomoPayment, verifyMomoSignature } from '@/app/lib/payments/momo';
import { sanitizeGatewayRawResponse } from '@/app/lib/payments/processIpn';
import { POST as createPaymentPost } from '@/app/api/payments/create/route';
import { POST as transactionsPost } from '@/app/api/transactions/route';
import { GET as vnpayIpnGet } from '@/app/api/payments/vnpay-ipn/route';
import { POST as momoIpnPost } from '@/app/api/payments/momo-ipn/route';
import { GET as paymentStatusGet } from '@/app/api/payments/status/route';

const TABLE_ID = '6717a01a1e0011a100000101';
const RESERVATION_ID = '6717a01a1e0011a100000201';
const TRANSACTION_ID = '6717a01a1e0011a100000501';
const USER_ID = '6717a01a1e0011a100000301';
const MENU_ITEM_ID = '6717a01a1e0011a100000601';

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

function mockSelectLean<T>(fnMock: ReturnType<typeof vi.fn>, value: T) {
  const lean = vi.fn().mockResolvedValue(value);
  const select = vi.fn().mockReturnValue({ lean });
  fnMock.mockReturnValue({ select, lean });
  return { select, lean };
}

function mockLeanDirect<T>(fnMock: ReturnType<typeof vi.fn>, value: T) {
  const lean = vi.fn().mockResolvedValue(value);
  const select = vi.fn().mockReturnValue({ lean });
  fnMock.mockReturnValue({ lean, select });
  return { lean, select };
}

function signVnpayParams(
  params: Record<string, string | number>,
  secret = process.env.VNPAY_HASH_SECRET ?? ''
): Record<string, string> {
  const signData = buildVnpaySignData(params);
  const hash = crypto
    .createHmac('sha512', secret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(params)) {
    out[key] = String(val);
  }
  out.vnp_SecureHash = hash;
  return out;
}

function signMomoIpnPayload(
  payload: Record<string, unknown>,
  accessKey = process.env.MOMO_ACCESS_KEY ?? '',
  secretKey = process.env.MOMO_SECRET_KEY ?? ''
): Record<string, unknown> {
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

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');

  return { ...payload, signature };
}

describe('TK-126 & TK-127: Deposit Calc, VNPay/MoMo Sandbox, IPN & Status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://smares.test';
    process.env.VNPAY_TMN_CODE = 'TESTTMNCODE';
    process.env.VNPAY_HASH_SECRET = 'TEST_VNPAY_SECRET_KEY_123456';
    process.env.VNPAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    delete process.env.VNPAY_RETURN_URL;
    process.env.MOMO_PARTNER_CODE = 'MOMOTEST';
    process.env.MOMO_ACCESS_KEY = 'MOMO_TEST_ACCESS';
    process.env.MOMO_SECRET_KEY = 'MOMO_TEST_SECRET_123456';
    process.env.MOMO_ENDPOINT = 'https://test-payment.momo.vn/v2/gateway/api/create';
    delete process.env.MOMO_REDIRECT_URL;
    delete process.env.MOMO_IPN_URL;

    mocks.connectDB.mockResolvedValue(undefined);
    mocks.getAuthUser.mockReturnValue(null);
    mocks.sendReservationConfirmationEmail.mockResolvedValue({ sent: false, skipped: true });
    mocks.releaseTableLock.mockResolvedValue({ released: true, forbidden: false });
    mocks.releaseExpiredLocksAndHolds.mockResolvedValue({
      expiredLocksCount: 0,
      expiredTransactionsCount: 0,
      expiredReservationsCount: 0,
    });
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it('calculates deposit amount strictly according to BR-RES-07', async () => {
    expect(isVipOrLargeTable({ tableNumber: 'B02', zoneName: 'Khu Trung Tâm', capacity: 4, guests: 4 })).toBe(false);
    expect(isVipOrLargeTable({ tableNumber: 'V01', zoneName: 'Khu VIP', capacity: 4, guests: 2 })).toBe(true);
    expect(isVipOrLargeTable({ tableNumber: 'B10', zoneName: 'Khu Trung Tâm', capacity: 8, guests: 6 })).toBe(true);

    const stdNoPreOrder = calculateDepositAmount({
      tableNumber: 'B02',
      zoneName: 'Khu Trung Tâm',
      capacity: 4,
      guests: 4,
      preOrderTotal: 0,
    });
    expect(stdNoPreOrder.baseTableDeposit).toBe(100_000);
    expect(stdNoPreOrder.preOrderDeposit).toBe(0);
    expect(stdNoPreOrder.amount).toBe(STANDARD_DEPOSIT_AMOUNT);
    expect(stdNoPreOrder.depositTier).toBe(DepositTier.STANDARD);

    // Ví dụ kiểm chứng BR-RES-07: Bàn 04 tiêu chuẩn + thực đơn 390.000đ = 100.000đ + 195.000đ = 295.000đ
    const stdExamplePreOrder = calculateDepositAmount({
      tableNumber: 'B04',
      zoneName: 'Khu Trung Tâm',
      capacity: 4,
      guests: 4,
      preOrderTotal: 390_000,
    });
    expect(stdExamplePreOrder.baseTableDeposit).toBe(100_000);
    expect(stdExamplePreOrder.preOrderDeposit).toBe(195_000);
    expect(stdExamplePreOrder.amount).toBe(295_000);
    expect(stdExamplePreOrder.depositTier).toBe(DepositTier.STANDARD);

    const stdLargePreOrder = calculateDepositAmount({
      tableNumber: 'B02',
      zoneName: 'Khu Trung Tâm',
      capacity: 4,
      guests: 4,
      preOrderTotal: 1_500_000,
    });
    expect(stdLargePreOrder.baseTableDeposit).toBe(100_000);
    expect(stdLargePreOrder.preOrderDeposit).toBe(750_000);
    expect(stdLargePreOrder.amount).toBe(850_000);
    expect(stdLargePreOrder.depositTier).toBe(DepositTier.STANDARD);

    const vipNoPreOrder = calculateDepositAmount({
      tableNumber: 'V01',
      zoneName: 'Phòng VIP 1',
      capacity: 6,
      guests: 6,
      preOrderTotal: 0,
    });
    expect(vipNoPreOrder.baseTableDeposit).toBe(300_000);
    expect(vipNoPreOrder.preOrderDeposit).toBe(0);
    expect(vipNoPreOrder.amount).toBe(VIP_BASE_DEPOSIT_AMOUNT);
    expect(vipNoPreOrder.depositTier).toBe(DepositTier.VIP_OR_LARGE);

    const vipSmallPreOrder = calculateDepositAmount({
      tableNumber: 'V01',
      zoneName: 'Phòng VIP 1',
      capacity: 8,
      guests: 8,
      preOrderTotal: 500_000,
    });
    expect(vipSmallPreOrder.baseTableDeposit).toBe(300_000);
    expect(vipSmallPreOrder.preOrderDeposit).toBe(250_000);
    expect(vipSmallPreOrder.amount).toBe(550_000);

    const vipLargePreOrder = calculateDepositAmount({
      tableNumber: 'V01',
      zoneName: 'Phòng VIP 1',
      capacity: 8,
      guests: 8,
      preOrderTotal: 3_500_000,
    });
    expect(vipLargePreOrder.baseTableDeposit).toBe(300_000);
    expect(vipLargePreOrder.preOrderDeposit).toBe(1_750_000);
    expect(vipLargePreOrder.amount).toBe(2_050_000);

    // Server tra cứu giá gốc MenuItem, không tin client
    mockSelectLean(mocks.menuItemFind, [{ _id: MENU_ITEM_ID, price: 250_000 }]);
    const verifiedTotal = await computeVerifiedPreOrderTotal([
      { menuItemId: MENU_ITEM_ID, quantity: 3 },
    ]);
    expect(verifiedTotal).toBe(750_000);
  });

  it('POST /api/transactions enforces server-side BR-RES-07 calculation for BANK_QR', async () => {
    const reservationSave = vi.fn().mockResolvedValue(undefined);
    mocks.reservationFindById.mockResolvedValue({
      _id: RESERVATION_ID,
      tableId: '507f1f77bcf86cd799439021',
      tableNumber: 'B04',
      guests: 4,
      phone: '0901234567',
      customerName: 'Nguyen Van A',
      status: 'PENDING',
      depositAmount: 0,
      save: reservationSave,
    });
    mockSelectLean(mocks.tableFindById, {
      _id: '507f1f77bcf86cd799439021',
      tableNumber: 'B04',
      zoneName: 'Khu Trung Tâm',
      capacity: 4,
    });
    mockSelectLean(mocks.menuItemFind, [{ _id: MENU_ITEM_ID, price: 195_000 }]);
    mocks.transactionCreate.mockImplementation(async (doc: Record<string, unknown>) => ({
      _id: TRANSACTION_ID,
      createdAt: new Date('2026-11-21T10:00:00.000Z'),
      ...doc,
    }));

    // Client cố tình truyền amount: 1000 -> server phải bỏ qua & tính 100.000 + 50% * 390.000 = 295.000
    const req = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationId: RESERVATION_ID,
        provider: 'BANK_QR',
        amount: 1000,
        preOrderItems: [{ menuItemId: MENU_ITEM_ID, quantity: 2 }],
      }),
    });

    const res = await transactionsPost(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.baseTableDeposit).toBe(100_000);
    expect(body.data.preOrderDeposit).toBe(195_000);
    expect(body.data.preOrderTotal).toBe(390_000);
    expect(body.data.amount).toBe(295_000);
    expect(body.data.depositTier).toBe(DepositTier.STANDARD);
    expect(mocks.transactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 295_000,
        provider: 'BANK_QR',
      }),
    );
    expect(reservationSave).toHaveBeenCalled();
  });

  it('generates and verifies VNPay HMAC-SHA512 URL with Vietnam UTC+7 timestamps', () => {
    // 2026-11-19T17:05:09.000Z => 2026-11-20 00:05:09 GMT+7
    expect(formatVnpayDate(new Date('2026-11-19T17:05:09.000Z'))).toBe('20261120000509');

    const vnpResult = createVnpayPaymentUrl({
      transactionRef: 'VNP_TEST_001',
      amount: 300_000,
      orderInfo: 'Thanh toán cọc bàn V01',
      ipAddr: '::ffff:10.0.0.5',
    });

    const url = new URL(vnpResult.paymentUrl);
    expect(url.searchParams.get('vnp_Amount')).toBe('30000000');
    expect(url.searchParams.get('vnp_ReturnUrl')).toBe('https://smares.test/payment/result');
    expect(url.searchParams.get('vnp_IpAddr')).toBe('10.0.0.5');

    const paramsObj = Object.fromEntries(url.searchParams.entries());
    expect(verifyVnpaySignature(paramsObj)).toBe(true);
    expect(verifyVnpaySignature({ ...paramsObj, vnp_Amount: '1000000' })).toBe(false);
  });

  it('generates MoMo captureWallet HMAC-SHA256 request and verifies IPN signature', async () => {
    let capturedBody: Record<string, unknown> = {};
    globalThis.fetch = vi.fn(async (_url, init) => {
      capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          resultCode: 0,
          message: 'Successful.',
          payUrl: 'https://test-payment.momo.vn/v2/gateway/pay?t=mock',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    const momoRes = await createMomoPayment({
      transactionRef: 'MOMO_TEST_001',
      amount: 300_000,
      orderInfo: 'Thanh toan coc V01',
    });

    expect(momoRes.payUrl).toBe('https://test-payment.momo.vn/v2/gateway/pay?t=mock');
    expect(capturedBody.redirectUrl).toBe('https://smares.test/payment/result');
    expect(capturedBody.ipnUrl).toBe('https://smares.test/api/payments/momo-ipn');
    expect(capturedBody.amount).toBe(300_000);
    expect(String(capturedBody.signature)).toMatch(/^[a-f0-9]{64}$/);

    const validIpn = signMomoIpnPayload({
      partnerCode: 'MOMOTEST',
      orderId: 'MOMO_TEST_001',
      requestId: 'MOMO_TEST_001',
      amount: 300_000,
      orderInfo: 'Thanh toan coc V01',
      orderType: 'momo_wallet',
      transId: '998877',
      resultCode: 0,
      message: 'Successful.',
      payType: 'qr',
      responseTime: 1700000000000,
      extraData: '',
    });

    expect(verifyMomoSignature(validIpn)).toBe(true);
    expect(verifyMomoSignature({ ...validIpn, amount: 100 })).toBe(false);
  });

  it('POST /api/payments/create acquires lock, ignores forged client amount, and enforces 409 lock conflicts', async () => {
    const expiresAtIso = new Date(Date.now() + 600_000).toISOString();

    mocks.reservationFindById.mockResolvedValue({
      _id: RESERVATION_ID,
      userId: USER_ID,
      tableId: TABLE_ID,
      tableNumber: 'V01',
      bookingCode: 'RES-VIP001',
      date: '2026-12-25',
      time: '19:00',
      guests: 6,
      status: 'CONFIRMED',
      paymentStatus: 'UNPAID',
    });
    mockSelectLean(mocks.tableFindById, {
      _id: TABLE_ID,
      tableNumber: 'V01',
      capacity: 8,
      zoneName: 'Phòng VIP 1',
      status: 'AVAILABLE',
    });
    mocks.acquireTableLock.mockResolvedValue({
      acquired: true,
      renewed: false,
      lock: {
        lockId: 'lock_1',
        lockKey: `${TABLE_ID}:2026-12-25:19:00`,
        tableId: TABLE_ID,
        tableNumber: 'V01',
        date: '2026-12-25',
        time: '19:00',
        sessionId: 'sess_123',
        reservationId: RESERVATION_ID,
        expiresAt: expiresAtIso,
        ttlSeconds: 600,
      },
    });
    mockSelectLean(mocks.menuItemFind, [{ _id: MENU_ITEM_ID, price: 2_000_000 }]);
    mocks.transactionCreate.mockImplementation(async (doc: Record<string, unknown>) => ({
      _id: TRANSACTION_ID,
      ...doc,
    }));
    mocks.transactionFindByIdAndUpdate.mockResolvedValue({});
    mocks.reservationFindByIdAndUpdate.mockResolvedValue({});

    // Client cố tình truyền amount: 1000 -> server phải bỏ qua & tính 300.000 + 50% của 2.000.000 = 1.300.000
    const req = new NextRequest('http://localhost:3000/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationId: RESERVATION_ID,
        provider: 'VNPAY',
        amount: 1000,
        preOrderItems: [{ menuItemId: MENU_ITEM_ID, quantity: 1 }],
      }),
    });

    const res = await createPaymentPost(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.baseTableDeposit).toBe(300_000);
    expect(body.data.preOrderDeposit).toBe(1_000_000);
    expect(body.data.amount).toBe(1_300_000);
    expect(body.data.depositTier).toBe(DepositTier.VIP_OR_LARGE);
    expect(body.data.paymentUrl).toContain('vnp_Amount=130000000');
    expect(body.data.sessionId).toBe('sess_123');

    // Trường hợp lock bị user khác giữ -> trả HTTP 409 Conflict
    mocks.acquireTableLock.mockResolvedValueOnce({
      acquired: false,
      conflictReason: 'TABLE_LOCKED',
      lockedUntil: new Date(expiresAtIso),
      message: 'Bàn này đang được khách hàng khác giữ chỗ thanh toán.',
    });
    const conflictReq = new NextRequest('http://localhost:3000/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationId: RESERVATION_ID, provider: 'VNPAY' }),
    });
    const conflictRes = await createPaymentPost(conflictReq);
    expect(conflictRes.status).toBe(409);

    // Trường hợp thiếu env Sandbox -> trả HTTP 400
    process.env.VNPAY_HASH_SECRET = 'YOUR_VNPAY_HASH_SECRET';
    const noConfigRes = await createPaymentPost(conflictReq);
    expect(noConfigRes.status).toBe(400);
  });

  it('handles VNPay IPN: 00 (PAID + email + lock release + BR-OPS-04 scrub), 02 (idempotency), 97, 04, 01, 24', async () => {
    // 1. Thành công (00)
    mockLeanDirect(mocks.transactionFindOne, {
      _id: TRANSACTION_ID,
      reservationId: RESERVATION_ID,
      amount: 100_000,
      provider: 'VNPAY',
      status: 'PENDING',
      transactionRef: 'VNP_TX_001',
    });
    mocks.transactionFindOneAndUpdate.mockResolvedValue({
      _id: TRANSACTION_ID,
      reservationId: RESERVATION_ID,
      amount: 100_000,
      provider: 'VNPAY',
      status: 'PAID',
      transactionRef: 'VNP_TX_001',
      providerTransactionNo: '14556677',
    });
    mocks.reservationFindByIdAndUpdate.mockResolvedValue({
      _id: RESERVATION_ID,
      userId: USER_ID,
      tableId: TABLE_ID,
      tableNumber: 'B01',
      customerName: 'Trần Văn A',
      customerEmail: 'khach@smares.vn',
      phone: '0901234567',
      bookingCode: 'RES-B01ABC',
      date: '2026-12-25',
      time: '19:00',
      guests: 4,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
    });
    mocks.tableFindOneAndUpdate.mockResolvedValue({ _id: TABLE_ID, status: 'RESERVED' });

    const okQuery = signVnpayParams({
      vnp_TmnCode: 'TESTTMNCODE',
      vnp_Amount: 100_000 * 100,
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TransactionNo: '14556677',
      vnp_TxnRef: 'VNP_TX_001',
    });
    const okRes = await vnpayIpnGet(
      new NextRequest(`http://localhost:3000/api/payments/vnpay-ipn?${new URLSearchParams(okQuery).toString()}`)
    );
    expect(okRes.status).toBe(200);
    expect(await okRes.json()).toEqual({ RspCode: '00', Message: 'Confirm Success' });
    expect(mocks.tableFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: TABLE_ID, status: 'AVAILABLE' },
      { $set: { status: 'RESERVED' } }
    );
    expect(mocks.releaseTableLock).toHaveBeenCalledWith(
      expect.objectContaining({
        reservationId: RESERVATION_ID,
        tableId: TABLE_ID,
        force: true,
        reason: 'PAYMENT_PAID',
      })
    );
    expect(mocks.sendReservationConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: 'khach@smares.vn',
        bookingCode: 'RES-B01ABC',
        depositAmount: 100_000,
      })
    );

    // Kiểm tra BR-OPS-04: lọc bỏ cardNumber/cvv/password khỏi rawResponse
    const scrubbed = sanitizeGatewayRawResponse({
      vnp_TxnRef: 'VNP_TX_001',
      cardNumber: '411111******1111',
      cvv: '123',
      bankPassword: 'secret',
    });
    expect(scrubbed).toEqual({ vnp_TxnRef: 'VNP_TX_001' });

    // 2. Idempotency (02): VNPay gọi lại giao dịch đã PAID
    mockLeanDirect(mocks.transactionFindOne, {
      _id: TRANSACTION_ID,
      reservationId: RESERVATION_ID,
      amount: 100_000,
      provider: 'VNPAY',
      status: 'PAID',
      transactionRef: 'VNP_TX_001',
    });
    const replayRes = await vnpayIpnGet(
      new NextRequest(`http://localhost:3000/api/payments/vnpay-ipn?${new URLSearchParams(okQuery).toString()}`)
    );
    expect(await replayRes.json()).toEqual({ RspCode: '02', Message: 'Order already confirmed' });

    // 3. Sai chữ ký (97)
    const badSigRes = await vnpayIpnGet(
      new NextRequest('http://localhost:3000/api/payments/vnpay-ipn?vnp_TxnRef=VNP_TX_001&vnp_Amount=10000000&vnp_ResponseCode=00&vnp_SecureHash=bad')
    );
    expect(await badSigRes.json()).toEqual({ RspCode: '97', Message: 'Invalid signature' });

    // 4. Sai số tiền (04)
    mockLeanDirect(mocks.transactionFindOne, {
      _id: TRANSACTION_ID,
      reservationId: RESERVATION_ID,
      amount: 100_000,
      provider: 'VNPAY',
      status: 'PENDING',
      transactionRef: 'VNP_TX_001',
    });
    const wrongAmtQuery = signVnpayParams({
      vnp_TmnCode: 'TESTTMNCODE',
      vnp_Amount: 50_000 * 100,
      vnp_ResponseCode: '00',
      vnp_TxnRef: 'VNP_TX_001',
    });
    const wrongAmtRes = await vnpayIpnGet(
      new NextRequest(`http://localhost:3000/api/payments/vnpay-ipn?${new URLSearchParams(wrongAmtQuery).toString()}`)
    );
    expect(await wrongAmtRes.json()).toEqual({ RspCode: '04', Message: 'Invalid amount' });

    // 5. Không tìm thấy giao dịch (01)
    mockLeanDirect(mocks.transactionFindOne, null);
    const notFoundRes = await vnpayIpnGet(
      new NextRequest(`http://localhost:3000/api/payments/vnpay-ipn?${new URLSearchParams(okQuery).toString()}`)
    );
    expect(await notFoundRes.json()).toEqual({ RspCode: '01', Message: 'Order not found' });

    // 6. Khách hủy / FAILED (24) -> giải phóng bàn TK-130
    vi.clearAllMocks();
    mocks.connectDB.mockResolvedValue(undefined);
    mocks.releaseTableLock.mockResolvedValue({ released: true, forbidden: false });
    mockLeanDirect(mocks.transactionFindOne, {
      _id: TRANSACTION_ID,
      reservationId: RESERVATION_ID,
      amount: 100_000,
      provider: 'VNPAY',
      status: 'PENDING',
      transactionRef: 'VNP_TX_FAIL',
    });
    mocks.transactionFindOneAndUpdate.mockResolvedValue({
      _id: TRANSACTION_ID,
      reservationId: RESERVATION_ID,
      amount: 100_000,
      provider: 'VNPAY',
      status: 'FAILED',
      transactionRef: 'VNP_TX_FAIL',
    });

    const failQuery = signVnpayParams({
      vnp_TmnCode: 'TESTTMNCODE',
      vnp_Amount: 100_000 * 100,
      vnp_ResponseCode: '24',
      vnp_TransactionStatus: '02',
      vnp_TxnRef: 'VNP_TX_FAIL',
    });
    const failRes = await vnpayIpnGet(
      new NextRequest(`http://localhost:3000/api/payments/vnpay-ipn?${new URLSearchParams(failQuery).toString()}`)
    );
    expect(await failRes.json()).toEqual({ RspCode: '00', Message: 'Confirm Success' });
    expect(mocks.releaseTableLock).toHaveBeenCalledWith({
      reservationId: RESERVATION_ID,
      force: true,
      reason: 'PAYMENT_FAILED',
    });
  });

  it('handles MoMo IPN: PAID (204), idempotent replay (204), invalid sig (400), amount mismatch (400), FAILED (204)', async () => {
    mockLeanDirect(mocks.transactionFindOne, {
      _id: TRANSACTION_ID,
      reservationId: RESERVATION_ID,
      amount: 300_000,
      provider: 'MOMO',
      status: 'PENDING',
      transactionRef: 'MOMO_TX_001',
    });
    mocks.transactionFindOneAndUpdate.mockResolvedValue({
      _id: TRANSACTION_ID,
      reservationId: RESERVATION_ID,
      amount: 300_000,
      provider: 'MOMO',
      status: 'PAID',
      transactionRef: 'MOMO_TX_001',
      providerTransactionNo: '334455',
    });
    mocks.reservationFindByIdAndUpdate.mockResolvedValue({
      _id: RESERVATION_ID,
      userId: USER_ID,
      tableId: TABLE_ID,
      tableNumber: 'V01',
      customerName: 'Nguyễn Thị B',
      phone: '0909998888',
      bookingCode: 'RES-V01',
      date: '2026-12-26',
      time: '19:30',
      guests: 6,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
    });
    mockSelectLean(mocks.userFindById, { email: 'user@smares.vn' });

    const okPayload = signMomoIpnPayload({
      partnerCode: 'MOMOTEST',
      orderId: 'MOMO_TX_001',
      requestId: 'MOMO_TX_001',
      amount: 300_000,
      orderInfo: 'Thanh toan coc V01',
      orderType: 'momo_wallet',
      transId: '334455',
      resultCode: 0,
      message: 'Successful.',
      payType: 'qr',
      responseTime: 1700000000000,
      extraData: '',
    });

    const okRes = await momoIpnPost(
      new NextRequest('http://localhost:3000/api/payments/momo-ipn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(okPayload),
      })
    );
    expect(okRes.status).toBe(204);
    expect(mocks.releaseTableLock).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: RESERVATION_ID, reason: 'PAYMENT_PAID' })
    );

    // Idempotent repeat -> vẫn HTTP 204 và không ghi đè
    mockLeanDirect(mocks.transactionFindOne, {
      _id: TRANSACTION_ID,
      reservationId: RESERVATION_ID,
      amount: 300_000,
      provider: 'MOMO',
      status: 'PAID',
      transactionRef: 'MOMO_TX_001',
    });
    const replayRes = await momoIpnPost(
      new NextRequest('http://localhost:3000/api/payments/momo-ipn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(okPayload),
      })
    );
    expect(replayRes.status).toBe(204);

    // Sai chữ ký -> 400
    const badSigRes = await momoIpnPost(
      new NextRequest('http://localhost:3000/api/payments/momo-ipn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...okPayload, signature: 'invalid' }),
      })
    );
    expect(badSigRes.status).toBe(400);

    // Sai số tiền -> 400
    mockLeanDirect(mocks.transactionFindOne, {
      _id: TRANSACTION_ID,
      reservationId: RESERVATION_ID,
      amount: 300_000,
      provider: 'MOMO',
      status: 'PENDING',
      transactionRef: 'MOMO_TX_001',
    });
    const wrongAmtPayload = signMomoIpnPayload({ ...okPayload, amount: 150_000 });
    const wrongAmtRes = await momoIpnPost(
      new NextRequest('http://localhost:3000/api/payments/momo-ipn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wrongAmtPayload),
      })
    );
    expect(wrongAmtRes.status).toBe(400);

    // Thanh toán bị hủy (resultCode: 1006) -> 204 & giải phóng bàn TK-130
    mocks.transactionFindOneAndUpdate.mockResolvedValue({
      _id: TRANSACTION_ID,
      reservationId: RESERVATION_ID,
      amount: 300_000,
      provider: 'MOMO',
      status: 'FAILED',
      transactionRef: 'MOMO_TX_001',
    });
    const cancelPayload = signMomoIpnPayload({
      ...okPayload,
      resultCode: 1006,
      message: 'User cancelled',
    });
    const cancelRes = await momoIpnPost(
      new NextRequest('http://localhost:3000/api/payments/momo-ipn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cancelPayload),
      })
    );
    expect(cancelRes.status).toBe(204);
    expect(mocks.releaseTableLock).toHaveBeenCalledWith({
      reservationId: RESERVATION_ID,
      force: true,
      reason: 'PAYMENT_FAILED',
    });
  });

  it('GET /api/payments/status returns PAID without leaking rawResponse and rejects bad signature', async () => {
    const futureExpiry = new Date(Date.now() + 300_000);
    mockSelectLean(mocks.transactionFindOne, {
      _id: TRANSACTION_ID,
      reservationId: RESERVATION_ID,
      amount: 100_000,
      provider: 'VNPAY',
      status: 'PAID',
      transactionRef: 'VNP_TX_OK',
      providerTransactionNo: '14556677',
      lockSessionId: 'sess_123',
      expiresAt: futureExpiry,
      createdAt: new Date(),
    });
    mockLeanDirect(mocks.reservationFindById, {
      _id: RESERVATION_ID,
      bookingCode: 'RES-B01ABC',
      tableId: TABLE_ID,
      tableNumber: 'B01',
      date: '2026-12-25',
      time: '19:00',
      guests: 4,
      customerName: 'Trần Văn A',
      phone: '0901234567',
      status: 'CONFIRMED',
      depositAmount: 100_000,
      paymentStatus: 'PAID',
    });
    mockSelectLean(mocks.tableFindById, { tableNumber: 'B01' });

    const okQuery = signVnpayParams({
      vnp_TmnCode: 'TESTTMNCODE',
      vnp_Amount: 100_000 * 100,
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: 'VNP_TX_OK',
    });

    const okRes = await paymentStatusGet(
      new NextRequest(`http://localhost:3000/api/payments/status?${new URLSearchParams(okQuery).toString()}`)
    );
    const okBody = await okRes.json();

    expect(okRes.status).toBe(200);
    expect(okBody.success).toBe(true);
    expect(okBody.data.signatureValid).toBe(true);
    expect(okBody.data.effectiveStatus).toBe('PAID');
    expect(okBody.data.transaction.rawResponse).toBeUndefined();
    expect(okBody.data.reservation.bookingCode).toBe('RES-B01ABC');

    // Sai chữ ký -> 400
    const badRes = await paymentStatusGet(
      new NextRequest('http://localhost:3000/api/payments/status?vnp_TxnRef=VNP_TX_OK&vnp_ResponseCode=00&vnp_SecureHash=tampered')
    );
    const badBody = await badRes.json();
    expect(badRes.status).toBe(400);
    expect(badBody.data.signatureValid).toBe(false);
  });
});
