import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'crypto';
import connectDB from '@/app/lib/db';
import Table from '@/app/models/Table';

export const dynamic = 'force-dynamic';

// 1. Khai báo Schema Reservation
const reservationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
    tableNumber: { type: String, trim: true },
    bookingCode: { type: String, required: true, unique: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:mm
    guests: { type: Number, required: true },
    phone: { type: String, required: true },
    note: { type: String, default: '' },
    status: { type: String, default: 'confirmed' },
    depositAmount: { type: Number, default: 0 },
    paymentStatus: { type: String, default: 'UNPAID' }
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

        // Bước 1: Tra cứu bàn ăn an toàn, tránh lỗi CastError nếu tableId là chuỗi số bàn (VD: "B05")
        let table = null;
        const trimmedTableId = typeof tableId === 'string' ? tableId.trim() : String(tableId);

        try {
            if (mongoose.Types.ObjectId.isValid(trimmedTableId)) {
                table = await Table.findById(trimmedTableId);
            }
            if (!table) {
                table = await Table.findOne({
                    $or: [
                        { tableNumber: trimmedTableId },
                        { table_number: trimmedTableId },
                        { tableNumber: trimmedTableId.toUpperCase() },
                        { table_number: trimmedTableId.toUpperCase() }
                    ]
                });
            }
        } catch (tableErr) {
            console.error("Lỗi khi tra cứu bàn:", tableErr);
        }

        // Nếu bàn chưa tồn tại trong collection tables, tự động khởi tạo để có ObjectId thực tế
        if (!table) {
            try {
                const upperTableNum = trimmedTableId.toUpperCase();
                table = await Table.create({
                    tableNumber: upperTableNum,
                    table_number: upperTableNum,
                    capacity: Number(guests) || 4,
                    status: 'available',
                    zone_name: upperTableNum.startsWith('V')
                        ? 'Khu VIP'
                        : upperTableNum.startsWith('W')
                        ? 'Khu Cửa Sổ'
                        : 'Khu Vực Chính',
                    qr_token: `TK-${upperTableNum}-${Date.now().toString(36).toUpperCase()}`
                });
            } catch (createTableErr) {
                // Nếu bị lỗi do bàn đã được tạo song song, query lại
                table = await Table.findOne({
                    $or: [
                        { tableNumber: trimmedTableId.toUpperCase() },
                        { table_number: trimmedTableId.toUpperCase() }
                    ]
                });
            }
        }

        // Đảm bảo luôn có ObjectId hợp lệ để tránh CastError ở Reservation model
        const resolvedTableObjectId = table?._id || (mongoose.Types.ObjectId.isValid(trimmedTableId) ? new mongoose.Types.ObjectId(trimmedTableId) : new mongoose.Types.ObjectId());
        const resolvedTableNumber = table?.tableNumber || table?.table_number || trimmedTableId;
        const resolvedQrToken = table?.qr_token || `TK-${resolvedTableNumber}-${Date.now().toString(36).toUpperCase()}`;

        // Bước 2: Kiểm tra lại xem bàn có trống vào ngày và giờ đó không (dùng resolvedTableObjectId)
        const existingReservation = await Reservation.findOne({
            tableId: resolvedTableObjectId,
            date: date,
            time: time,
            status: { $ne: 'cancelled' }
        });

        if (existingReservation) {
            return NextResponse.json(
                { success: false, message: `Bàn ${resolvedTableNumber} đã có người đặt vào khung giờ đã chọn!` },
                { status: 409 }
            );
        }

        // Bước 3: Sinh mã bookingCode duy nhất (VD: RES-A1B2C3)
        const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
        const bookingCode = `RES-${randomString}`;

        // Bước 4: Lưu đơn mới với resolvedTableObjectId
        const newReservation = await Reservation.create({
            userId: userId,
            tableId: resolvedTableObjectId,
            tableNumber: resolvedTableNumber,
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
                tableNumber: resolvedTableNumber,
                qr_token: resolvedQrToken,
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
            { success: false, message: error?.message || "Lỗi hệ thống server." },
            { status: 500 }
        );
    }
}

// 4. Xử lý GET request lấy danh sách lịch sử đặt bàn (TK-125)
export async function GET(request) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const userId = searchParams.get('userId');
        const phone = searchParams.get('phone');

        // Đọc userId từ JWT token nếu có trong Authorization header
        let authUserId = null;
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const secretKey = process.env.JWT_SECRET || 'KhoaBaoMat_SmaRes_2026_@!#';
            try {
                const decoded = jwt.verify(token, secretKey);
                authUserId = decoded.userId;
            } catch (err) {}
        }

        const filter = {};

        // Lọc theo trạng thái đặt bàn
        if (status && status !== 'Tất cả') {
            if (status === 'Sắp tới') {
                filter.status = { $in: ['confirmed', 'pending'] };
            } else if (status === 'Đã hoàn thành') {
                filter.status = 'completed';
            } else if (status === 'Đã hủy') {
                filter.status = 'cancelled';
            } else {
                filter.status = status;
            }
        }

        const targetUserId = userId || authUserId;
        if (targetUserId && mongoose.Types.ObjectId.isValid(targetUserId)) {
            filter.userId = new mongoose.Types.ObjectId(targetUserId);
        }

        if (phone) {
            filter.phone = phone.trim();
        }

        const reservations = await Reservation.find(filter)
            .sort({ createdAt: -1 })
            .populate('tableId', 'tableNumber table_number zone_name')
            .lean();

        const formatted = reservations.map((r) => {
            const tableObj = r.tableId;
            const tNumber =
                r.tableNumber ||
                tableObj?.tableNumber ||
                tableObj?.table_number ||
                'B05';

            return {
                id: r._id.toString(),
                _id: r._id.toString(),
                bookingCode: r.bookingCode,
                date: r.date || (r.reservationDate ? new Date(r.reservationDate).toISOString().split('T')[0] : ''),
                time: r.time || r.timeSlot || '19:00',
                tableNumber: tNumber,
                guests: r.guests || 2,
                phone: r.phone || r.contactPhone || '',
                note: r.note || '',
                status: r.status,
                depositAmount: r.depositAmount || 0,
                paymentStatus: r.paymentStatus || 'UNPAID',
                createdAt: r.createdAt,
            };
        });

        return NextResponse.json(
            {
                success: true,
                message: 'Lấy danh sách đơn đặt bàn thành công.',
                data: formatted,
            },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                },
            }
        );
    } catch (error) {
        console.error('Lỗi khi tải danh sách đặt bàn:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Lỗi hệ thống khi tải lịch sử đặt bàn.',
                error: error?.message,
            },
            { status: 500 }
        );
    }
}