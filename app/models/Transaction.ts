import { Schema, model, models, Model, Types } from 'mongoose';

export const PaymentProvider = {
  VNPAY: 'VNPAY',
  MOMO: 'MOMO',
  BANK_QR: 'BANK_QR',
} as const;

export type PaymentProvider = (typeof PaymentProvider)[keyof typeof PaymentProvider];

export const TransactionStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED',
} as const;

export type TransactionStatus =
  (typeof TransactionStatus)[keyof typeof TransactionStatus];

export interface ITransaction {
  _id?: Types.ObjectId | string;
  reservationId: Types.ObjectId | string;
  userId?: Types.ObjectId | string | null;
  amount: number;
  provider: PaymentProvider;
  status: TransactionStatus;
  transactionRef: string;
  lockSessionId?: string | null;
  providerTransactionNo?: string | null;
  paymentUrl?: string | null;
  rawResponse?: Record<string, unknown> | null;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
      required: [true, 'Vui lòng cung cấp ID đơn đặt bàn'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Vui lòng nhập số tiền giao dịch'],
      min: [0, 'Số tiền giao dịch không được âm'],
    },
    provider: {
      type: String,
      enum: {
        values: Object.values(PaymentProvider),
        message: 'Cổng thanh toán không hợp lệ: {VALUE}',
      },
      required: [true, 'Vui lòng chọn cổng thanh toán (VNPAY, MOMO hoặc BANK_QR)'],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(TransactionStatus),
        message: 'Trạng thái giao dịch không hợp lệ: {VALUE}',
      },
      default: TransactionStatus.PENDING,
      index: true,
    },
    transactionRef: {
      type: String,
      required: [true, 'Vui lòng cung cấp mã tham chiếu giao dịch (transactionRef)'],
      unique: true,
      trim: true,
    },
    lockSessionId: {
      type: String,
      trim: true,
      default: null,
    },
    providerTransactionNo: {
      type: String,
      trim: true,
      default: null,
    },
    paymentUrl: {
      type: String,
      trim: true,
      default: null,
    },
    rawResponse: {
      type: Schema.Types.Mixed,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Vui lòng thiết lập thời gian hết hạn giao dịch (expiresAt)'],
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'transactions',
  }
);

// Tối ưu truy vấn lịch sử theo reservationId và ngày tạo
TransactionSchema.index({ reservationId: 1, createdAt: -1 });

const Transaction: Model<ITransaction> =
  models.Transaction || model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
