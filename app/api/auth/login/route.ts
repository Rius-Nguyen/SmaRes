import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password } = body;

    // 1. Kiểm tra đầu vào
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập đầy đủ email và mật khẩu.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Tìm người dùng theo email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Email hoặc mật khẩu không chính xác.' },
        { status: 401 }
      );
    }

    // 3. So khớp mật khẩu đã băm bằng phương thức comparePassword của User model
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return NextResponse.json(
        { success: false, message: 'Email hoặc mật khẩu không chính xác.' },
        { status: 401 }
      );
    }

    // 4. Tạo JWT Token
    const secretKey = process.env.JWT_SECRET || 'KhoaBaoMat_SmaRes_2026_@!#';
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      secretKey,
      { expiresIn: '1d' }
    );

    // 5. Trả về token và thông tin người dùng
    return NextResponse.json(
      {
        success: true,
        message: 'Đăng nhập thành công!',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi khi đăng nhập:', error);
    const errorMessage = error instanceof Error ? error.message : 'Lỗi hệ thống server.';
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
