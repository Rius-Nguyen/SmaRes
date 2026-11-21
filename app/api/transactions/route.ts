import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import crypto from 'crypto';
import connectDB from '@/app/lib/db';
import Transaction, {
  PaymentProvider,
  TransactionStatus,
} from '@/app/models/Transaction';
import Reservation, { PaymentStatus } from '@/app/models/Reservation';
import Table from '@/app/models/Table';
import Order, { OrderStatus } from '@/app/models/Order';
import {
  STANDARD_DEPOSIT_AMOUNT,
  calculateDepositAmount,
  computeVerifiedPreOrderTotal,
  parsePreOrderItems,
} from '@/app/lib/payments/depositCalculator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get('reservationId');
    const userId = searchParams.get('userId');
    const transactionRef = searchParams.get('transactionRef');
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    // 1. Kiểm tra reservationId nếu có truyền
    if (reservationId) {
      if (Types.ObjectId.isValid(reservationId)) {
        filter.reservationId = new Types.ObjectId(reservationId);
      } else {
        // Thử tìm theo bookingCode
        const matchedReservation = await Reservation.findOne({
          bookingCode: reservationId.trim(),
        }).select('_id');

        if (!matchedReservation) {
          return NextResponse.json(
            {
              success: false,
              message: 'Tham số reservationId không đúng định dạng ObjectId hoặc không tìm thấy bookingCode.',
              error: 'INVALID_RESERVATION_ID',
            },
            { status: 400 }
          );
        }
        filter.reservationId = matchedReservation._id;
      }
    }

    // 2. Kiểm tra userId nếu có truyền
    if (userId) {
      if (!Types.ObjectId.isValid(userId)) {
        return NextResponse.json(
          {
            success: false,
            message: 'Tham số userId không đúng định dạng ObjectId.',
            error: 'INVALID_USER_ID',
          },
          { status: 400 }
        );
      }
      filter.userId = new Types.ObjectId(userId);
    }

    // 3. Tra cứu nhanh theo mã tham chiếu transactionRef
    if (transactionRef) {
      filter.transactionRef = transactionRef.trim();
    }

    // 4. Lọc theo trạng thái giao dịch
    if (status) {
      const validStatuses: readonly string[] = Object.values(TransactionStatus);
      const upperStatus = status.toUpperCase();
      if (!validStatuses.includes(upperStatus)) {
        return NextResponse.json(
          {
            success: false,
            message: `Trạng thái status không hợp lệ. Cho phép: ${validStatuses.join(', ')}`,
            error: 'INVALID_STATUS',
          },
          { status: 400 }
        );
      }
      filter.status = upperStatus;
    }

    // 5. Lọc theo cổng thanh toán
    if (provider) {
      const validProviders: readonly string[] = Object.values(PaymentProvider);
      const upperProvider = provider.toUpperCase();
      if (!validProviders.includes(upperProvider)) {
        return NextResponse.json(
          {
            success: false,
            message: `Cổng thanh toán provider không hợp lệ. Cho phép: ${validProviders.join(', ')}`,
            error: 'INVALID_PROVIDER',
          },
          { status: 400 }
        );
      }
      filter.provider = upperProvider;
    }

    // 6. Thực hiện truy vấn danh sách (loại bỏ rawResponse để đảm bảo an toàn bảo mật)
    const [total, transactions] = await Promise.all([
      Transaction.countDocuments(filter),
      Transaction.find(filter)
        .select('-rawResponse')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'reservationId',
          select: 'bookingCode date time guests status tableId',
        })
        .lean(),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: 'Lấy danh sách giao dịch thành công.',
        data: transactions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Lỗi khi truy vấn danh sách giao dịch:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi hệ thống khi tải danh sách giao dịch.',
        error: error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const rawBody = await request.json().catch(() => ({}));
    const body =
      typeof rawBody === 'object' && rawBody !== null
        ? (rawBody as Record<string, unknown>)
        : {};
    const reservationId =
      typeof body.reservationId === 'string' ? body.reservationId.trim() : '';
    const amount = body.amount;
    const provider = typeof body.provider === 'string' ? body.provider : 'BANK_QR';
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const preOrderItems = parsePreOrderItems(body.preOrderItems);

    if (!reservationId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Vui lòng cung cấp reservationId của đơn đặt bàn.',
          error: 'MISSING_RESERVATION_ID',
        },
        { status: 400 }
      );
    }

    if (
      amount !== undefined &&
      (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Vui lòng cung cấp số tiền đặt cọc hợp lệ (lớn hơn 0).',
          error: 'INVALID_AMOUNT',
        },
        { status: 400 }
      );
    }

    // 1. Tìm đơn đặt bàn tương ứng (theo ObjectId hoặc bookingCode)
    let reservation = null;
    if (Types.ObjectId.isValid(reservationId)) {
      reservation = await Reservation.findById(reservationId);
    }
    if (!reservation) {
      reservation = await Reservation.findOne({
        bookingCode: String(reservationId).trim(),
      });
    }

    if (!reservation) {
      return NextResponse.json(
        {
          success: false,
          message: 'Không tìm thấy thông tin đơn đặt bàn tương ứng.',
          error: 'RESERVATION_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // 1b. Tính lại tổng tiền cọc phía Server theo BR-RES-07 (không tin amount do client gửi)
    const table = reservation.tableId
      ? await Table.findById(reservation.tableId)
          .select('_id tableNumber capacity zoneName')
          .lean()
      : null;

    let preOrderTotal = 0;
    if (preOrderItems.length > 0) {
      preOrderTotal = await computeVerifiedPreOrderTotal(preOrderItems);
    } else if (reservation.phone) {
      const lookbackWindow = new Date(Date.now() - 30 * 60 * 1000);
      const pendingOrder = await Order.findOne({
        tableNumber: (table?.tableNumber || reservation.tableNumber || '').toUpperCase(),
        phone: reservation.phone,
        status: OrderStatus.PENDING,
        createdAt: { $gte: lookbackWindow },
      })
        .select('totalAmount')
        .sort({ createdAt: -1 })
        .lean();

      if (
        pendingOrder &&
        typeof pendingOrder.totalAmount === 'number' &&
        Number.isFinite(pendingOrder.totalAmount) &&
        pendingOrder.totalAmount > 0
      ) {
        preOrderTotal = Math.round(pendingOrder.totalAmount);
      }
    }

    const depositCalc = calculateDepositAmount({
      tableNumber: table?.tableNumber || reservation.tableNumber,
      zoneName: table?.zoneName,
      capacity: table?.capacity,
      guests: reservation.guests,
      preOrderTotal,
    });
    const verifiedAmount = Math.max(STANDARD_DEPOSIT_AMOUNT, depositCalc.amount);

    // 2. Tạo mã transactionRef duy nhất
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const transactionRef = `TXN_DEP_${Date.now()}_${randomHex}`;

    // 3. Thời gian hết hạn thanh toán cọc là 10 phút
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 4. Tạo bản ghi Transaction
    const validProviders: readonly string[] = Object.values(PaymentProvider);
    const upperProvider = String(provider).toUpperCase();
    const validProvider: PaymentProvider = validProviders.includes(upperProvider)
      ? (upperProvider as PaymentProvider)
      : PaymentProvider.BANK_QR;

    const newTransaction = await Transaction.create({
      reservationId: reservation._id,
      userId: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : reservation.userId || null,
      amount: verifiedAmount,
      provider: validProvider,
      status: TransactionStatus.PENDING,
      transactionRef: transactionRef,
      expiresAt: expiresAt,
    });

    // 5. Cập nhật Reservation: depositAmount, paymentStatus = 'PENDING', holdExpiresAt = expiresAt
    reservation.depositAmount = verifiedAmount;
    reservation.paymentStatus = PaymentStatus.PENDING;
    reservation.holdExpiresAt = expiresAt;
    await reservation.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Tạo giao dịch đặt cọc thành công.',
        data: {
          id: newTransaction._id,
          reservationId: newTransaction.reservationId,
          amount: verifiedAmount,
          baseTableDeposit: depositCalc.baseTableDeposit,
          preOrderDeposit: depositCalc.preOrderDeposit,
          preOrderTotal: depositCalc.preOrderTotal,
          depositTier: depositCalc.depositTier,
          provider: newTransaction.provider,
          status: newTransaction.status,
          transactionRef: newTransaction.transactionRef,
          expiresAt: newTransaction.expiresAt,
          createdAt: newTransaction.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Lỗi khi tạo giao dịch đặt cọc:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi hệ thống khi tạo giao dịch đặt cọc.',
        error: error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
