import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/db';

// 1. Tái sử dụng Schema Reservation
const reservationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
    bookingCode: { type: String, required: true },
    date: { type: String, required: true }, // Dạng 'YYYY-MM-DD'
    time: { type: String, required: true }, // Dạng 'HH:mm'
    guests: { type: Number, required: true },
    phone: { type: String, required: true },
    note: { type: String, default: '' },
    status: { type: String, default: 'confirmed' }
}, { timestamps: true });

const Reservation = mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);

// 3. Xử lý PATCH request hủy đơn đặt bàn
export async function PATCH(request, { params }) {
    try {
        await connectDB();

        const { id } = await params; // Lấy :id từ URL

        // Kiểm tra id có đúng định dạng ObjectId của MongoDB không
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: "Mã đơn đặt bàn (ID) không hợp lệ." },
                { status: 400 }
            );
        }

        // Tìm đơn đặt bàn theo ID
        const reservation = await Reservation.findById(id);

        if (!reservation) {
            return NextResponse.json(
                { success: false, message: "Không tìm thấy đơn đặt bàn." },
                { status: 404 }
            );
        }

        // Kiểm tra xem đơn đã bị hủy trước đó chưa
        if (reservation.status === 'cancelled') {
            return NextResponse.json(
                { success: false, message: "Đơn đặt bàn này đã được hủy từ trước." },
                { status: 400 }
            );
        }

        // LOGIC TÍNH THỜI GIAN: Tính khoảng cách giờ hẹn so với hiện tại
        const bookingDateTimeStr = `${reservation.date}T${reservation.time}:00`;
        const bookingTime = new Date(bookingDateTimeStr).getTime();
        const currentTime = new Date().getTime();

        // Chênh lệch thời gian tính bằng phút
        const diffInMinutes = (bookingTime - currentTime) / (1000 * 60);

        // Đơn đã qua thời gian hẹn
        if (diffInMinutes <= 0) {
            return NextResponse.json(
                { success: false, message: "Không thể hủy đơn đặt bàn đã qua thời gian hẹn." },
                { status: 400 }
            );
        }

        // Bắt buộc thời gian hẹn phải cách hiện tại > 60 phút
        if (diffInMinutes <= 60) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Chỉ được phép hủy đơn trước giờ hẹn ít nhất 60 phút."
                },
                { status: 400 }
            );
        }

        // Cập nhật trạng thái thành 'cancelled'
        reservation.status = 'cancelled';
        await reservation.save();

        return NextResponse.json({
            success: true,
            message: "Hủy đơn đặt bàn thành công!",
            data: {
                id: reservation._id,
                bookingCode: reservation.bookingCode,
                status: reservation.status,
                cancelledAt: new Date()
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Lỗi khi hủy đơn đặt bàn:", error);
        return NextResponse.json(
            { success: false, message: "Lỗi hệ thống server." },
            { status: 500 }
        );
    }
}