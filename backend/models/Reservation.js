const mongoose = require('mongoose');

const ReservationStatus = {
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

const reservationSchema = new mongoose.Schema(
  {
    table_id: {
      type: mongoose.Schema.Types.ObjectId,
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

const Reservation =
  (mongoose.models && mongoose.models.Reservation) ||
  mongoose.model('Reservation', reservationSchema);

Reservation.ReservationStatus = ReservationStatus;

module.exports = Reservation;
