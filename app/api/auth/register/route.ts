import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();
    const { name, email, password, phone } = body;

    // 1. Kiểm tra đầu vào bắt buộc
    if (!name || !email || !password || !phone) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập đầy đủ: họ tên, email, mật khẩu và số điện thoại.' },
        { status: 400 }
      );
    }

    // 2. Validate định dạng email và độ dài mật khẩu
    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, message: 'Định dạng email không hợp lệ.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự.' },
        { status: 400 }
      );
    }

    // 3. Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.' },
        { status: 409 }
      );
    }

    // 4. Tạo người dùng mới (Password tự động được băm bằng bcrypt trong pre('save') của User Model, SĐT giữ nguyên)
    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: password,
      phone: phone.trim(),
    });

    await newUser.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Đăng ký tài khoản thành công!',
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
  } catch (error: unknown) {
    console.error('Lỗi khi đăng ký:', error);
    const errorMessage = error instanceof Error ? error.message : 'Lỗi hệ thống server.';
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
