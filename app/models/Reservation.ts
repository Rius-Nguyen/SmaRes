import { Schema, model, models, Model, Types } from 'mongoose';

export const ReservationStatus = {
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type ReservationStatus = (typeof ReservationStatus)[keyof typeof ReservationStatus];

export const PaymentStatus = {
  UNPAID: 'UNPAID',
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export interface IReservation {
  _id?: string;
  userId?: Types.ObjectId | string | null;
  tableId: Types.ObjectId | string;
  tableNumber: string;
  customerName: string;
  customerEmail?: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  note?: string;
  bookingCode: string;
  status: ReservationStatus;
  checkInTime?: Date | null;
  depositAmount?: number;
  paymentStatus?: PaymentStatus;
  holdExpiresAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
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
    customerName: {
      type: String,
      trim: true,
      default: 'Khách tại bàn',
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Vui lòng nhập số điện thoại liên hệ'],
      trim: true,
    },
    date: {
      type: String,
      required: [true, 'Vui lòng chọn ngày đặt bàn'],
      trim: true,
    },
    time: {
      type: String,
      required: [true, 'Vui lòng chọn khung giờ đặt bàn'],
      trim: true,
    },
    guests: {
      type: Number,
      required: [true, 'Vui lòng nhập số lượng khách'],
      min: [1, 'Số lượng khách tối thiểu là 1'],
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    bookingCode: {
      type: String,
      required: [true, 'Vui lòng tạo mã đặt bàn'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: Object.values(ReservationStatus),
      default: ReservationStatus.CONFIRMED,
      index: true,
    },
    checkInTime: {
      type: Date,
      default: null,
    },
    depositAmount: {
      type: Number,
      default: 0,
      min: [0, 'Tiền cọc không được nhỏ hơn 0'],
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.UNPAID,
      index: true,
    },
    holdExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'reservations',
  }
);

ReservationSchema.index(
  { tableId: 1, date: 1, time: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          ReservationStatus.CONFIRMED,
          ReservationStatus.CHECKED_IN,
          ReservationStatus.COMPLETED,
        ],
      },
    },
    name: 'uniq_active_table_slot',
  }
);

const Reservation: Model<IReservation> =
  models.Reservation || model<IReservation>('Reservation', ReservationSchema);

export default Reservation;
