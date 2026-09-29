import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// 1. Tái sử dụng/Định nghĩa Model User
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

// 3. Xử lý POST request đăng nhập
export async function POST(request) {
    try {
        await connectDB();

        const body = await request.json();
        const { email, password } = body;

        // Validate đầu vào
        if (!email || !password) {
            return NextResponse.json(
                { success: false, message: "Vui lòng nhập đầy đủ email và mật khẩu." },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Tìm user theo email
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Email hoặc mật khẩu không chính xác." },
                { status: 401 }
            );
        }

        // So khớp mật khẩu bằng bcrypt.compare
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return NextResponse.json(
                { success: false, message: "Email hoặc mật khẩu không chính xác." },
                { status: 401 }
            );
        }

        // Tạo JWT Token với secret key từ .env
        const secretKey = process.env.JWT_SECRET || 'KhoaBaoMat_SmaRes_2026_@!#';
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            secretKey,
            { expiresIn: '1d' }
        );

        // Trả về HTTP 200 OK theo đúng spec yêu cầu
        return NextResponse.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Lỗi khi đăng nhập:", error);
        return NextResponse.json(
            { success: false, message: "Lỗi hệ thống server." },
            { status: 500 }
        );
    }
}