import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/app/lib/db';
import { getAuthUser } from '@/app/lib/auth';
import { acquireTableLock } from '@/app/lib/tableLockService';
import {
  getVnpayConfig,
  getMomoConfig,
  PaymentConfigError,
  PaymentGatewayError,
} from '@/app/lib/payments/config';
import {
  calculateDepositAmount,
  computeVerifiedPreOrderTotal,
  type PreOrderItemInput,
} from '@/app/lib/payments/depositCalculator';
import { createVnpayPaymentUrl } from '@/app/lib/payments/vnpay';
import { createMomoPayment } from '@/app/lib/payments/momo';
import Reservation, {
  PaymentStatus,
  ReservationStatus,
} from '@/app/models/Reservation';
import Table from '@/app/models/Table';
import Transaction, {
  PaymentProvider,
  TransactionStatus,
} from '@/app/models/Transaction';

export const dynamic = 'force-dynamic';

function parsePreOrderItems(raw: unknown): PreOrderItemInput[] {
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

export async function POST(request: NextRequest) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu JSON không hợp lệ.', error: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    if (typeof rawBody !== 'object' || rawBody === null) {
      return NextResponse.json(
        { success: false, message: 'Payload yêu cầu không hợp lệ.', error: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    const body = rawBody as Record<string, unknown>;
    const rawReservationId =
      typeof body.reservationId === 'string' ? body.reservationId.trim() : '';
    const rawProvider =
      typeof body.provider === 'string' ? body.provider.trim().toUpperCase() : '';
    const rawSessionId =
      typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    const preOrderItems = parsePreOrderItems(body.preOrderItems);

    if (!rawReservationId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Vui lòng cung cấp reservationId hoặc mã đặt bàn.',
          error: 'MISSING_RESERVATION_ID',
        },
        { status: 400 }
      );
    }

    if (
      rawProvider !== PaymentProvider.VNPAY &&
      rawProvider !== PaymentProvider.MOMO
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Cổng thanh toán không hợp lệ. Chỉ hỗ trợ VNPAY hoặc MOMO.',
          error: 'INVALID_PROVIDER',
        },
        { status: 400 }
      );
    }

    const provider: 'VNPAY' | 'MOMO' = rawProvider;

    // Pre-validate biến môi trường Sandbox trước khi khóa bàn hoặc tạo bản ghi DB
    try {
      if (provider === PaymentProvider.VNPAY) {
        getVnpayConfig();
      } else {
        getMomoConfig();
      }
    } catch (configErr: unknown) {
      if (configErr instanceof PaymentConfigError) {
        return NextResponse.json(
          {
            success: false,
            message: configErr.message,
            error: 'PAYMENT_CONFIG_MISSING',
          },
          { status: 400 }
        );
      }
      throw configErr;
    }

    await connectDB();

    let reservation = null;
    if (Types.ObjectId.isValid(rawReservationId)) {
      reservation = await Reservation.findById(rawReservationId);
    }
    if (!reservation) {
      reservation = await Reservation.findOne({
        bookingCode: rawReservationId.toUpperCase(),
      });
    }

    if (!reservation) {
      return NextResponse.json(
        {
          success: false,
          message: 'Không tìm thấy đơn đặt bàn tương ứng.',
          error: 'RESERVATION_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      return NextResponse.json(
        {
          success: false,
          message: 'Đơn đặt bàn này đã bị hủy, không thể thanh toán cọc.',
          error: 'RESERVATION_CANCELLED',
        },
        { status: 400 }
      );
    }

    if (reservation.paymentStatus === PaymentStatus.PAID) {
      return NextResponse.json(
        {
          success: false,
          message: 'Đơn đặt bàn này đã hoàn tất thanh toán tiền cọc trước đó.',
          error: 'ALREADY_PAID',
        },
        { status: 409 }
      );
    }

    const table = await Table.findById(reservation.tableId)
      .select('_id tableNumber capacity zoneName status')
      .lean();

    if (!table) {
      return NextResponse.json(
        {
          success: false,
          message: 'Không tìm thấy thông tin bàn của đơn đặt bàn.',
          error: 'TABLE_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const authUser = getAuthUser(request);

    // 1. Xin / gia hạn Distributed Lock (TK-129) với TTL đúng 10 phút (600s)
    const lockResult = await acquireTableLock({
      tableId: String(table._id),
      tableNumber: table.tableNumber || reservation.tableNumber,
      date: reservation.date,
      time: reservation.time,
      sessionId: rawSessionId || undefined,
      userId: authUser?.userId ?? (reservation.userId ? String(reservation.userId) : null),
      reservationId: String(reservation._id),
    });

    if (!lockResult.acquired) {
      return NextResponse.json(
        {
          success: false,
          message: lockResult.message,
          error: lockResult.conflictReason,
          data: {
            lockedUntil: lockResult.lockedUntil
              ? lockResult.lockedUntil.toISOString()
              : null,
          },
        },
        { status: 409 }
      );
    }

    // 2. Tính số tiền đặt cọc hoàn toàn phía Server theo BR-RES-07 (tuyệt đối không tin client)
    const preOrderTotal = await computeVerifiedPreOrderTotal(preOrderItems);
    const depositCalc = calculateDepositAmount({
      tableNumber: table.tableNumber || reservation.tableNumber,
      zoneName: table.zoneName,
      capacity: table.capacity,
      guests: reservation.guests,
      preOrderTotal,
    });

    const prefix = provider === PaymentProvider.VNPAY ? 'VNP' : 'MOMO';
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const transactionRef = `${prefix}_${Date.now()}_${randomHex}`;
    const expiresAt = new Date(lockResult.lock.expiresAt);

    // 3. Tạo bản ghi Transaction PENDING (BR-OPS-04: không lưu số thẻ/CVV/mật khẩu)
    const transaction = await Transaction.create({
      reservationId: reservation._id,
      userId: authUser?.userId ?? reservation.userId ?? null,
      amount: depositCalc.amount,
      provider,
      status: TransactionStatus.PENDING,
      transactionRef,
      lockSessionId: lockResult.lock.sessionId,
      expiresAt,
    });

    const orderInfo = `Thanh toan tien coc dat ban ${reservation.bookingCode}`;
    let paymentUrl = '';

    try {
      if (provider === PaymentProvider.VNPAY) {
        const forwardedFor = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const clientIp =
          forwardedFor?.split(',')[0]?.trim() || realIp?.trim() || '127.0.0.1';

        const vnpResult = createVnpayPaymentUrl({
          transactionRef,
          amount: depositCalc.amount,
          orderInfo,
          ipAddr: clientIp,
          expireMinutes: 10,
        });
        paymentUrl = vnpResult.paymentUrl;
      } else {
        const momoResult = await createMomoPayment({
          transactionRef,
          amount: depositCalc.amount,
          orderInfo,
        });
        paymentUrl = momoResult.payUrl;
      }
    } catch (gatewayErr: unknown) {
      const errMessage =
        gatewayErr instanceof Error ? gatewayErr.message : 'Lỗi kết nối cổng thanh toán.';
      const rawErrorPayload: Record<string, unknown> = {
        error: errMessage,
      };
      if (gatewayErr instanceof PaymentGatewayError && gatewayErr.rawResponse) {
        rawErrorPayload.gateway = gatewayErr.rawResponse;
      }

      await Transaction.findByIdAndUpdate(transaction._id, {
        $set: {
          status: TransactionStatus.FAILED,
          rawResponse: rawErrorPayload,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: errMessage,
          error: 'PAYMENT_GATEWAY_ERROR',
        },
        { status: 502 }
      );
    }

    // 4. Lưu paymentUrl và cập nhật thông tin cọc trên Reservation
    await Promise.all([
      Transaction.findByIdAndUpdate(transaction._id, {
        $set: { paymentUrl },
      }),
      Reservation.findByIdAndUpdate(reservation._id, {
        $set: {
          depositAmount: depositCalc.amount,
          paymentStatus: PaymentStatus.PENDING,
          holdExpiresAt: expiresAt,
        },
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: `Khởi tạo liên kết thanh toán ${provider} thành công.`,
        data: {
          transactionId: String(transaction._id),
          transactionRef,
          provider,
          amount: depositCalc.amount,
          depositTier: depositCalc.depositTier,
          preOrderTotal: depositCalc.preOrderTotal,
          paymentUrl,
          sessionId: lockResult.lock.sessionId,
          expiresAt: expiresAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Lỗi hệ thống khi khởi tạo thanh toán cọc:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi hệ thống khi khởi tạo giao dịch thanh toán.',
        error: error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
