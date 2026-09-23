import { Schema, model, models, Model, Types } from 'mongoose';

export interface IReservation {
  _id?: string;
  userId: Types.ObjectId | string;
  tableId: Types.ObjectId | string;
  reservationDate: Date;
  timeSlot: string;
  guests: number;
  contactPhone: string;
  bookingCode: string;
  status: 'confirmed' | 'cancelled';
  createdAt?: Date;
  updatedAt?: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Vui lòng cung cấp ID người dùng'],
    },
    tableId: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      required: [true, 'Vui lòng cung cấp ID bàn'],
    },
    reservationDate: {
      type: Date,
      required: [true, 'Vui lòng chọn ngày đặt bàn'],
    },
    timeSlot: {
      type: String,
      required: [true, 'Vui lòng chọn khung giờ đặt bàn'],
      trim: true,
    },
    guests: {
      type: Number,
      required: [true, 'Vui lòng nhập số lượng khách'],
      min: 1,
    },
    contactPhone: {
      type: String,
      required: [true, 'Vui lòng nhập số điện thoại liên hệ'],
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
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
    },
  },
  {
    timestamps: true,
    collection: 'reservations',
  }
);

const Reservation: Model<IReservation> =
  models.Reservation || model<IReservation>('Reservation', ReservationSchema);

export default Reservation;