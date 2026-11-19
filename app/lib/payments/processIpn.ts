import connectDB from '@/app/lib/db';
import Transaction, {
  TransactionStatus,
  type PaymentProvider,
} from '@/app/models/Transaction';
import Reservation, {
  PaymentStatus,
  ReservationStatus,
} from '@/app/models/Reservation';
import Table, { TableStatus } from '@/app/models/Table';
import User from '@/app/models/User';
import { TableLockReleaseReason } from '@/app/models/TableLock';
import { releaseTableLock } from '@/app/lib/tableLockService';
import { sendReservationConfirmationEmail } from '@/app/lib/email/reservationConfirmationEmail';

export interface ProcessPaymentIpnInput {
  provider: Extract<PaymentProvider, 'VNPAY' | 'MOMO'>;
  transactionRef: string;
  receivedAmount: number;
  isSuccess: boolean;
  providerTransactionNo?: string | null;
  rawResponse: Record<string, unknown>;
}

export type ProcessPaymentIpnOutcome =
  | 'PAID'
  | 'FAILED_UPDATED'
  | 'ALREADY_PROCESSED'
  | 'NOT_FOUND'
  | 'AMOUNT_MISMATCH';

export interface ProcessPaymentIpnResult {
  outcome: ProcessPaymentIpnOutcome;
  message: string;
  transactionId?: string;
  reservationId?: string;
  previousStatus?: string;
  currentStatus?: string;
}

const SENSITIVE_FIELD_PATTERNS = [
  'cardnumber',
  'card_number',
  'cardpan',
  'cvv',
  'cvc',
  'pin',
  'password',
  'bankpassword',
];

/**
 * Loại bỏ các trường thẻ/CVV/mật khẩu (BR-OPS-04) trước khi lưu rawResponse đối soát
 */
export function sanitizeGatewayRawResponse(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELD_PATTERNS.some((pattern) =>
      lowerKey.includes(pattern)
    );
    if (!isSensitive) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Xử lý nghiệp vụ IPN/Webhook dùng chung cho VNPay & MoMo (Idempotent + Atomic Update).
 */
export async function processPaymentIpn(
  input: ProcessPaymentIpnInput
): Promise<ProcessPaymentIpnResult> {
  await connectDB();

  const existing = await Transaction.findOne({
    transactionRef: input.transactionRef,
  }).lean();

  if (!existing || existing.provider !== input.provider) {
    return {
      outcome: 'NOT_FOUND',
      message: 'Order not found',
    };
  }

  // Đối chiếu chặt chẽ số tiền nhận từ cổng thanh toán với số tiền gốc trong DB
  if (
    !Number.isFinite(input.receivedAmount) ||
    Math.round(input.receivedAmount) !== Math.round(existing.amount)
  ) {
    return {
      outcome: 'AMOUNT_MISMATCH',
      transactionId: String(existing._id),
      reservationId: String(existing.reservationId),
      message: 'Invalid amount',
    };
  }

  // Idempotency pre-check
  if (existing.status !== TransactionStatus.PENDING) {
    return {
      outcome: 'ALREADY_PROCESSED',
      transactionId: String(existing._id),
      reservationId: String(existing.reservationId),
      previousStatus: existing.status,
      currentStatus: existing.status,
      message: 'Order already confirmed',
    };
  }

  const nextStatus = input.isSuccess
    ? TransactionStatus.PAID
    : TransactionStatus.FAILED;

  // Atomic conditional update: chỉ cập nhật khi Transaction đang ở PENDING
  const updatedTx = await Transaction.findOneAndUpdate(
    {
      transactionRef: input.transactionRef,
      status: TransactionStatus.PENDING,
    },
    {
      $set: {
        status: nextStatus,
        providerTransactionNo: input.providerTransactionNo || null,
        rawResponse: sanitizeGatewayRawResponse(input.rawResponse),
      },
    },
    { returnDocument: 'after' }
  );

  if (!updatedTx) {
    return {
      outcome: 'ALREADY_PROCESSED',
      transactionId: String(existing._id),
      reservationId: String(existing.reservationId),
      previousStatus: existing.status,
      currentStatus: existing.status,
      message: 'Order already confirmed',
    };
  }

  if (input.isSuccess) {
    const updatedReservation = await Reservation.findByIdAndUpdate(
      updatedTx.reservationId,
      {
        $set: {
          paymentStatus: PaymentStatus.PAID,
          status: ReservationStatus.CONFIRMED,
          depositAmount: updatedTx.amount,
          holdExpiresAt: null,
        },
      },
      { returnDocument: 'after' }
    );

    if (updatedReservation?.tableId) {
      await Table.findOneAndUpdate(
        {
          _id: String(updatedReservation.tableId),
          status: TableStatus.AVAILABLE,
        },
        {
          $set: { status: TableStatus.RESERVED },
        }
      );

      // Giải phóng khóa phiên tạm thời sau khi đã chốt đơn thành công
      await releaseTableLock({
        reservationId: String(updatedReservation._id),
        tableId: String(updatedReservation.tableId),
        date: updatedReservation.date,
        time: updatedReservation.time,
        force: true,
        reason: TableLockReleaseReason.PAYMENT_PAID,
      });

      // Kích hoạt email xác nhận đặt bàn bất đồng bộ (BR-RES-05)
      let recipientEmail = updatedReservation.customerEmail || '';
      if (!recipientEmail && updatedReservation.userId) {
        const ownerUser = await User.findById(updatedReservation.userId)
          .select('email')
          .lean();
        if (ownerUser?.email) {
          recipientEmail = ownerUser.email;
        }
      }

      void sendReservationConfirmationEmail({
        toEmail: recipientEmail,
        customerName: updatedReservation.customerName || 'Quý khách',
        phone: updatedReservation.phone,
        bookingCode: updatedReservation.bookingCode,
        tableNumber: updatedReservation.tableNumber,
        date: updatedReservation.date,
        time: updatedReservation.time,
        guests: updatedReservation.guests,
        depositAmount: updatedTx.amount,
        transactionRef: updatedTx.transactionRef,
        provider: updatedTx.provider,
      }).catch(() => {});
    }

    return {
      outcome: 'PAID',
      transactionId: String(updatedTx._id),
      reservationId: String(updatedTx.reservationId),
      previousStatus: TransactionStatus.PENDING,
      currentStatus: TransactionStatus.PAID,
      message: 'Confirm Success',
    };
  }

  // Nếu thanh toán thất bại/hủy: gọi logic giải phóng bàn từ TK-130
  await releaseTableLock({
    reservationId: String(updatedTx.reservationId),
    force: true,
    reason: TableLockReleaseReason.PAYMENT_FAILED,
  });

  return {
    outcome: 'FAILED_UPDATED',
    transactionId: String(updatedTx._id),
    reservationId: String(updatedTx.reservationId),
    previousStatus: TransactionStatus.PENDING,
    currentStatus: TransactionStatus.FAILED,
    message: 'Confirm Success',
  };
}
