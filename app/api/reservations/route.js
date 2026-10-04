import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'crypto';
import connectDB from '@/app/lib/db';

// 1. Khai báo Schema Reservation
const reservationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
    bookingCode: { type: String, required: true, unique: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:mm
    guests: { type: Number, required: true },
    phone: { type: String, required: true },
    note: { type: String, default: '' },
    status: { type: String, default: 'confirmed' }
}, { timestamps: true });

const Reservation = mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);

// 3. Xử lý POST request tạo đơn đặt bàn
export async function POST(request) {
    try {
        await connectDB();

        // Đọc thông tin người dùng từ JWT Token (nếu có đăng nhập)
        let userId = null;
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const secretKey = process.env.JWT_SECRET || 'KhoaBaoMat_SmaRes_2026_@!#';
            try {
                const decoded = jwt.verify(token, secretKey);
                userId = decoded.userId;
            } catch (err) {
                // Token không hợp lệ thì không lưu userId
            }
        }

        const body = await request.json();
        const { tableId, date, time, guests, phone, note } = body;

        // Validate đầu vào
        if (!tableId || !date || !time || !guests || !phone) {
            return NextResponse.json(
                { success: false, message: "Vui lòng nhập đầy đủ: tableId, date, time, guests, phone." },
                { status: 400 }
            );
        }

        // Logic 1: Kiểm tra lại xem bàn có trống vào ngày và giờ đó không
        const existingReservation = await Reservation.findOne({
            tableId: tableId,
            date: date,
            time: time,
            status: { $ne: 'cancelled' }
        });

        if (existingReservation) {
            return NextResponse.json(
                { success: false, message: "Bàn này đã có người đặt vào khung giờ đã chọn!" },
                { status: 409 }
            );
        }

        // Logic 2: Sinh mã bookingCode duy nhất (VD: RES-A1B2C3)
        const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
        const bookingCode = `RES-${randomString}`;

        // Logic 3: Lưu đơn mới với trạng thái 'confirmed'
        const newReservation = await Reservation.create({
            userId: userId,
            tableId: tableId,
            bookingCode: bookingCode,
            date: date,
            time: time,
            guests: guests,
            phone: phone,
            note: note || '',
            status: 'confirmed'
        });

        // Trả về mã 201 Created kèm thông tin đơn vừa tạo
        return NextResponse.json({
            success: true,
            message: "Tạo đơn đặt bàn thành công!",
            data: {
                id: newReservation._id,
                bookingCode: newReservation.bookingCode,
                tableId: newReservation.tableId,
                date: newReservation.date,
                time: newReservation.time,
                guests: newReservation.guests,
                phone: newReservation.phone,
                note: newReservation.note,
                status: newReservation.status,
                createdAt: newReservation.createdAt
            }
        }, { status: 201 });

    } catch (error) {
        console.error("Lỗi khi tạo đơn đặt bàn:", error);
        return NextResponse.json(
            { success: false, message: "Lỗi hệ thống server." },
            { status: 500 }
        );
    }
}