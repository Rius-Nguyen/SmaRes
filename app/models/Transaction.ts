import { Schema, model, models, Model, Types } from 'mongoose';

export type PaymentProvider = 'VNPAY' | 'MOMO' | 'BANK_QR';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';

export interface ITransaction {
  _id?: Types.ObjectId | string;
  reservationId: Types.ObjectId | string;
  userId?: Types.ObjectId | string | null;
  amount: number;
  provider: PaymentProvider;
  status: TransactionStatus;
  transactionRef: string;
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
        values: ['VNPAY', 'MOMO', 'BANK_QR'],
        message: 'Cổng thanh toán không hợp lệ: {VALUE}',
      },
      required: [true, 'Vui lòng chọn cổng thanh toán (VNPAY, MOMO hoặc BANK_QR)'],
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'SUCCESS', 'FAILED', 'EXPIRED'],
        message: 'Trạng thái giao dịch không hợp lệ: {VALUE}',
      },
      default: 'PENDING',
      index: true,
    },
    transactionRef: {
      type: String,
      required: [true, 'Vui lòng cung cấp mã tham chiếu giao dịch (transactionRef)'],
      unique: true,
      trim: true,
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
