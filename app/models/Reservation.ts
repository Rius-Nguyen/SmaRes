import { Schema, model, models, Model, Types } from 'mongoose';

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';

export interface IReservation {
  _id?: Types.ObjectId | string;
  userId?: Types.ObjectId | string | null;
  tableId: Types.ObjectId | string;

  // Thời gian & Thông tin liên hệ (hỗ trợ cả chuẩn camelCase và legacy API fields)
  reservationDate?: Date;
  date?: string;
  timeSlot?: string;
  time?: string;
  guests: number;
  contactPhone?: string;
  phone?: string;
  note?: string;
  bookingCode: string;

  // Trạng thái đơn đặt bàn
  status: ReservationStatus;

  // [TK-125] Đặt cọc & Thanh toán (tương thích ngược, default an toàn)
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
    reservationDate: {
      type: Date,
      default: null,
    },
    date: {
      type: String,
      trim: true,
    },
    timeSlot: {
      type: String,
      trim: true,
    },
    time: {
      type: String,
      trim: true,
    },
    guests: {
      type: Number,
      required: [true, 'Vui lòng nhập số lượng khách'],
      min: [1, 'Số lượng khách tối thiểu là 1'],
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    bookingCode: {
      type: String,
      required: [true, 'Vui lòng tạo mã đặt bàn'],
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'cancelled', 'completed'],
        message: 'Trạng thái đặt bàn không hợp lệ: {VALUE}',
      },
      default: 'confirmed',
      index: true,
    },
    depositAmount: {
      type: Number,
      default: 0,
      min: [0, 'Tiền cọc không được nhỏ hơn 0'],
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['UNPAID', 'PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED'],
        message: 'Trạng thái thanh toán không hợp lệ: {VALUE}',
      },
      default: 'UNPAID',
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

// Tối ưu tra cứu bàn theo ngày, giờ và trạng thái
ReservationSchema.index({ date: 1, time: 1, status: 1 });
ReservationSchema.index({ reservationDate: 1, timeSlot: 1, status: 1 });

const Reservation: Model<IReservation> =
  models.Reservation || model<IReservation>('Reservation', ReservationSchema);

export default Reservation;
