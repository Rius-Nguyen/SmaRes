import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

// 1. Khởi tạo Schema & Model cho User (Mongoose)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, required: true, trim: true },
    role: { type: String, default: 'customer' },
}, { timestamps: true });

// Tránh lỗi nạp lại model trùng lặp trong Next.js (Hot Reload)
const User = mongoose.models.User || mongoose.model('User', userSchema);

// 2. Hàm hỗ trợ kết nối MongoDB
async function connectDB() {
    if (mongoose.connection.readyState >= 1) return;
    if (!process.env.MONGODB_URI) {
        throw new Error('Chưa cấu hình MONGODB_URI trong .env');
    }
    await mongoose.connect(process.env.MONGODB_URI);
}

// 3. Next.js Route Handler - Xử lý POST request
export async function POST(request) {
    try {
        await connectDB();

        const body = await request.json();
        const { name, email, password, phone } = body;

        // Validate dữ liệu đầu vào
        if (!name || !email || !password || !phone) {
            return NextResponse.json(
                { success: false, message: "Vui lòng nhập đầy đủ thông tin: name, email, password, phone." },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();
        const trimmedPhone = phone.trim();

        // Kiểm tra Email đã tồn tại chưa
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return NextResponse.json(
                { success: false, message: "Email đã tồn tại trong hệ thống." },
                { status: 409 }
            );
        }

        // Băm mật khẩu bằng bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);

        // Tạo người dùng mới trong MongoDB
        const newUser = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            phone: trimmedPhone,
        });

        // Trả về kết quả thành công
        return NextResponse.json(
            {
                success: true,
                message: "Đăng ký tài khoản thành công!",
                data: {
                    id: newUser._id,
                    name: newUser.name,
                    email: newUser.email,
                    phone: newUser.phone,
                    role: newUser.role,
                    createdAt: newUser.createdAt,
                },
            },
            { status: 201 }
        );

    } catch (error) {
        console.error("Lỗi khi đăng ký:", error);
        return NextResponse.json(
            { success: false, message: "Lỗi hệ thống server." },
            { status: 500 }
        );
    }
}