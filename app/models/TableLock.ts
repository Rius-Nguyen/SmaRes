import { Schema, model, models, Model, Types } from 'mongoose';

export const TABLE_LOCK_TTL_SECONDS = 600;
export const TABLE_LOCK_TTL_MS = TABLE_LOCK_TTL_SECONDS * 1000;

export const TableLockReleaseReason = {
  PAYMENT_PAID: 'PAYMENT_PAID',
  USER_CANCELLED: 'USER_CANCELLED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  EXPIRED: 'EXPIRED',
} as const;

export type TableLockReleaseReason =
  (typeof TableLockReleaseReason)[keyof typeof TableLockReleaseReason];

export interface ITableLock {
  _id?: Types.ObjectId | string;
  lockKey: string;
  tableId: Types.ObjectId | string;
  tableNumber: string;
  date: string;
  time: string;
  sessionId: string;
  userId?: Types.ObjectId | string | null;
  reservationId?: Types.ObjectId | string | null;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const TableLockSchema = new Schema<ITableLock>(
  {
    lockKey: {
      type: String,
      required: [true, 'Vui lòng cung cấp khóa phiên bàn (lockKey)'],
      unique: true,
      trim: true,
    },
    tableId: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      required: [true, 'Vui lòng cung cấp ID bàn'],
      index: true,
    },
    tableNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    date: {
      type: String,
      required: [true, 'Vui lòng cung cấp ngày giữ bàn'],
      trim: true,
    },
    time: {
      type: String,
      required: [true, 'Vui lòng cung cấp khung giờ giữ bàn'],
      trim: true,
    },
    sessionId: {
      type: String,
      required: [true, 'Vui lòng cung cấp mã phiên giữ bàn (sessionId)'],
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Vui lòng cung cấp thời gian hết hạn khóa bàn (expiresAt)'],
    },
  },
  {
    timestamps: true,
    collection: 'table_locks',
  }
);

// MongoDB TTL Index: tự động xóa bản ghi ngay khi quá expiresAt
TableLockSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'ttl_table_lock_expires_at' }
);

// Tối ưu truy vấn khóa bàn còn hiệu lực theo ngày và khung giờ
TableLockSchema.index(
  { date: 1, time: 1, expiresAt: 1 },
  { name: 'idx_table_lock_slot_expiry' }
);

const TableLock: Model<ITableLock> =
  models.TableLock || model<ITableLock>('TableLock', TableLockSchema);

export default TableLock;
