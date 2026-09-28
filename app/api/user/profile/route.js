import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// 1. Tái sử dụng Schema User
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    role: { type: String, default: 'customer' }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// 2. Hàm kết nối MongoDB Atlas
async function connectDB() {
    if (mongoose.connection.readyState >= 1) return;
    if (!process.env.MONGODB_URI) {
        throw new Error('Chưa cấu hình MONGODB_URI trong file .env');
    }
    await mongoose.connect(process.env.MONGODB_URI);
}

// 3. Xử lý GET request xem profile người dùng
export async function GET(request) {
    try {
        await connectDB();

        // Lấy chuỗi Token từ Authorization Header (dạng: "Bearer <token>")
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, message: "Yêu cầu cung cấp Token xác thực (Unauthorized)." },
                { status: 401 }
            );
        }

        const token = authHeader.split(' ')[1];
        const secretKey = process.env.JWT_SECRET || 'KhoaBaoMat_SmaRes_2026_@!#';

        // Xác thực Token
        let decoded;
        try {
            decoded = jwt.verify(token, secretKey);
        } catch (err) {
            return NextResponse.json(
                { success: false, message: "Token không hợp lệ hoặc đã hết hạn." },
                { status: 401 }
            );
        }

        // Lấy thông tin user từ DB và loại bỏ trường password (.select('-password'))
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Không tìm thấy thông tin người dùng." },
                { status: 404 }
            );
        }

        // Trả về thông tin cá nhân hiện tại
        return NextResponse.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                createdAt: user.createdAt
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Lỗi khi lấy thông tin profile:", error);
        return NextResponse.json(
            { success: false, message: "Lỗi hệ thống server." },
            { status: 500 }
        );
    }
}