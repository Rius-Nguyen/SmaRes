import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import { releaseExpiredLocksAndHolds } from '@/app/lib/tableLockService';
import { verifyVnpaySignature, getVnpayResponseMessage } from '@/app/lib/payments/vnpay';
import { verifyMomoSignature, getMomoResultMessage } from '@/app/lib/payments/momo';
import Transaction, {
  PaymentProvider,
  TransactionStatus,
} from '@/app/models/Transaction';
import Reservation, { PaymentStatus } from '@/app/models/Reservation';
import Table from '@/app/models/Table';

export const dynamic = 'force-dynamic';

/**
 * Kiểm tra trạng thái giao dịch cho màn hình kết quả thanh toán (TK-133).
 * Hỗ trợ xác thực chữ ký Return URL của VNPay / MoMo hoặc truy vấn trực tiếp theo transactionRef.
 * Luôn ưu tiên trạng thái thực tế trong DB (được IPN cập nhật) và tuyệt đối loại bỏ rawResponse.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    let provider: PaymentProvider | undefined;
    let transactionRef = '';
    let signatureValid = true;
    let gatewaySuccess = false;
    let gatewayCode = '';
    let gatewayMessage = '';

    if (params.vnp_TxnRef) {
      provider = PaymentProvider.VNPAY;
      transactionRef = params.vnp_TxnRef.trim();
      signatureValid = verifyVnpaySignature(params);
      gatewayCode = params.vnp_ResponseCode || '';
      const txStatus = params.vnp_TransactionStatus;
      gatewaySuccess = gatewayCode === '00' && (!txStatus || txStatus === '00');
      gatewayMessage = getVnpayResponseMessage(gatewayCode);
    } else if (params.orderId) {
      provider = PaymentProvider.MOMO;
      transactionRef = params.orderId.trim();
      signatureValid = verifyMomoSignature(params);
      gatewayCode = params.resultCode ?? '';
      gatewaySuccess = Number(gatewayCode) === 0;
      gatewayMessage =
        params.message && params.message.trim().length > 0 && !gatewaySuccess
          ? `${getMomoResultMessage(gatewayCode)} (${params.message})`
          : getMomoResultMessage(gatewayCode);
    } else if (params.transactionRef) {
      transactionRef = params.transactionRef.trim();
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Thiếu tham số mã giao dịch (transactionRef, vnp_TxnRef hoặc orderId).',
          error: 'MISSING_PAYMENT_PARAMS',
        },
        { status: 400 }
      );
    }

    if (!signatureValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Chữ ký phản hồi từ cổng thanh toán không hợp lệ hoặc dữ liệu đã bị thay đổi.',
          error: 'INVALID_SIGNATURE',
          data: {
            signatureValid: false,
            provider,
          },
        },
        { status: 400 }
      );
    }

    await connectDB();

    const now = new Date();
    let transaction = await Transaction.findOne({ transactionRef })
      .select('-rawResponse')
      .lean();

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          message: 'Không tìm thấy giao dịch tương ứng trong hệ thống.',
          error: 'TRANSACTION_NOT_FOUND',
          data: {
            signatureValid: true,
            provider,
          },
        },
        { status: 404 }
      );
    }

    // Nếu giao dịch đang PENDING nhưng đã quá hạn 10 phút -> kích hoạt dọn hold hết hạn (TK-130)
    const txExpiresAt =
      transaction.expiresAt instanceof Date
        ? transaction.expiresAt
        : new Date(transaction.expiresAt);
    if (
      transaction.status === TransactionStatus.PENDING &&
      txExpiresAt.getTime() <= now.getTime()
    ) {
      await releaseExpiredLocksAndHolds({ now });
      const refreshed = await Transaction.findOne({ transactionRef })
        .select('-rawResponse')
        .lean();
      if (refreshed) {
        transaction = refreshed;
      }
    }

    const reservation = await Reservation.findById(transaction.reservationId).lean();

    let tableNumber = reservation?.tableNumber || '';
    if (reservation?.tableId) {
      const tableDoc = await Table.findById(reservation.tableId)
        .select('tableNumber')
        .lean();
      if (tableDoc?.tableNumber) {
        tableNumber = tableDoc.tableNumber;
      }
    }

    let effectiveStatus: 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED';
    if (
      transaction.status === TransactionStatus.PAID ||
      reservation?.paymentStatus === PaymentStatus.PAID
    ) {
      effectiveStatus = 'PAID';
    } else if (
      transaction.status === TransactionStatus.EXPIRED ||
      reservation?.paymentStatus === PaymentStatus.EXPIRED
    ) {
      effectiveStatus = 'EXPIRED';
    } else if (
      transaction.status === TransactionStatus.FAILED ||
      reservation?.paymentStatus === PaymentStatus.FAILED ||
      (provider && !gatewaySuccess && transaction.status === TransactionStatus.PENDING)
    ) {
      effectiveStatus = 'FAILED';
    } else {
      effectiveStatus = 'PENDING';
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          signatureValid: true,
          provider: provider ?? transaction.provider,
          effectiveStatus,
          gatewaySuccess: provider ? gatewaySuccess : effectiveStatus === 'PAID',
          gatewayCode,
          gatewayMessage:
            gatewayMessage ||
            (effectiveStatus === 'PAID'
              ? 'Giao dịch đặt cọc đã hoàn tất.'
              : effectiveStatus === 'EXPIRED'
                ? 'Phiên thanh toán giữ bàn (10 phút) đã hết hạn.'
                : effectiveStatus === 'FAILED'
                  ? 'Giao dịch thanh toán không thành công.'
                  : 'Đang chờ cổng thanh toán xác nhận IPN.'),
          transaction: {
            id: String(transaction._id),
            transactionRef: transaction.transactionRef,
            amount: transaction.amount,
            provider: transaction.provider,
            status: transaction.status,
            providerTransactionNo: transaction.providerTransactionNo || null,
            lockSessionId: transaction.lockSessionId || null,
            expiresAt: txExpiresAt.toISOString(),
            createdAt: transaction.createdAt,
          },
          reservation: reservation
            ? {
                id: String(reservation._id),
                bookingCode: reservation.bookingCode,
                tableId: reservation.tableId ? String(reservation.tableId) : '',
                tableNumber,
                date: reservation.date,
                time: reservation.time,
                guests: reservation.guests,
                customerName: reservation.customerName,
                phone: reservation.phone,
                note: reservation.note || '',
                status: reservation.status,
                depositAmount: reservation.depositAmount ?? transaction.amount,
                paymentStatus: reservation.paymentStatus ?? PaymentStatus.UNPAID,
              }
            : null,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Lỗi khi kiểm tra trạng thái giao dịch:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi hệ thống khi kiểm tra trạng thái thanh toán.',
        error: error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
