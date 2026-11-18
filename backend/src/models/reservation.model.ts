import mongoose, { Schema, Document, Model } from 'mongoose';

// ==========================================
// 1. Enums & Interface cho Đặt bàn (TK-142)
// ==========================================
export enum ReservationStatus {
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface IReservation extends Document {
  table_id: mongoose.Types.ObjectId;
  table_number: string;
  customer_name: string;
  customer_phone: string;
  reservation_date?: Date;
  time_slot?: string;
  guests?: number;
  status: ReservationStatus;
  check_in_time?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// 2. Mongoose Schema
// ==========================================
export const reservationSchema = new Schema<IReservation>(
  {
    table_id: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      required: [true, 'Vui lòng cung cấp ID bàn'],
      index: true,
    },
    table_number: {
      type: String,
      required: [true, 'Vui lòng cung cấp số bàn'],
      trim: true,
      uppercase: true,
      index: true,
    },
    customer_name: {
      type: String,
      required: [true, 'Vui lòng nhập tên khách hàng'],
      trim: true,
      default: 'Khách tại bàn',
    },
    customer_phone: {
      type: String,
      required: [true, 'Vui lòng nhập số điện thoại khách'],
      trim: true,
      default: '0000000000',
    },
    reservation_date: {
      type: Date,
      default: Date.now,
    },
    time_slot: {
      type: String,
      trim: true,
      default: '',
    },
    guests: {
      type: Number,
      min: 1,
      default: 2,
    },
    status: {
      type: String,
      enum: Object.values(ReservationStatus),
      default: ReservationStatus.CONFIRMED,
      index: true,
    },
    check_in_time: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'reservations',
  }
);

const Reservation: Model<IReservation> =
  (mongoose.models && mongoose.models.Reservation) ||
  mongoose.model<IReservation>('Reservation', reservationSchema);

export default Reservation;
