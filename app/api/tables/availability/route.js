import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/db';

// 1. Khai báo Schema Table & Reservation
const tableSchema = new mongoose.Schema({
    tableNumber: { type: Number, required: true, unique: true },
    capacity: { type: Number, required: true },
    location: { type: String, default: 'Indoor' }
});

const reservationSchema = new mongoose.Schema({
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
    date: { type: String, required: true }, // Định dạng: YYYY-MM-DD
    time: { type: String, required: true }, // Định dạng: HH:mm
    status: { type: String, default: 'confirmed' } // 'confirmed', 'cancelled', 'completed'
});

const Table = mongoose.models.Table || mongoose.model('Table', tableSchema);
const Reservation = mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);

// 3. Xử lý GET request kiểm tra bàn trống
export async function GET(request) {
    try {
        await connectDB();

        // Đọc Query Params từ URL (VD: ?date=2026-10-01&time=18:00&guests=4)
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const time = searchParams.get('time');
        const guests = parseInt(searchParams.get('guests')) || 1;

        // Validate dữ liệu truyền vào
        if (!date || !time) {
            return NextResponse.json(
                { success: false, message: "Vui lòng cung cấp đầy đủ tham số ?date=YYYY-MM-DD&time=HH:mm" },
                { status: 400 }
            );
        }

        // Lấy tất cả các bàn đáp ứng đủ sức chứa số lượng khách
        const tables = await Table.find({ capacity: { $gte: guests } });

        // Tìm các đơn đặt bàn trùng ngày, trùng giờ và trạng thái không phải hủy ('cancelled')
        const bookedReservations = await Reservation.find({
            date: date,
            time: time,
            status: { $ne: 'cancelled' }
        });

        // Tạo mảng danh sách ID của các bàn đã bị đặt
        const bookedTableIds = bookedReservations.map(res => res.tableId.toString());

        // Ghép thêm trường isAvailable: true/false cho từng bàn
        const availabilityList = tables.map(table => {
            const isBooked = bookedTableIds.includes(table._id.toString());
            return {
                id: table._id,
                tableNumber: table.tableNumber,
                capacity: table.capacity,
                location: table.location,
                isAvailable: !isBooked // true nếu chưa bị đặt, false nếu đã bị đặt
            };
        });

        return NextResponse.json({
            success: true,
            query: { date, time, guests },
            tables: availabilityList
        }, { status: 200 });

    } catch (error) {
        console.error("Lỗi khi kiểm tra bàn trống:", error);
        return NextResponse.json(
            { success: false, message: "Lỗi hệ thống server." },
            { status: 500 }
        );
    }
}