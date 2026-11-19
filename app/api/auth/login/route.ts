import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import { signAuthToken, getAuthCookieOptions } from '@/app/lib/auth';

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

    const normalizedInput = email.toLowerCase().trim();
    const targetEmail = normalizedInput === 'admin' ? 'admin@smares.com' : normalizedInput;

    // 2. Tìm người dùng theo email (hỗ trợ nhập 'admin' hoặc email đầy đủ)
    let user = await User.findOne({ email: targetEmail });
    if (!user && normalizedInput !== targetEmail) {
      user = await User.findOne({ email: normalizedInput });
    }
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
    const token = signAuthToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // 5. Trả về thông tin người dùng và gắn token vào HttpOnly Cookie
    const response = NextResponse.json(
      {
        success: true,
        message: 'Đăng nhập thành công!',
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

    response.cookies.set({
      ...getAuthCookieOptions(),
      value: token,
    });

    return response;
  } catch (error: unknown) {
    console.error('Lỗi khi đăng nhập:', error);
    const errorMessage = error instanceof Error ? error.message : 'Lỗi hệ thống server.';
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
