import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import { signAuthToken, getAuthCookieOptions } from '@/app/lib/auth';
import {
  ACCOUNT_LOCK_DURATION_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  getRemainingLockMinutes,
  isAccountLocked,
} from '@/app/lib/passwordSecurity';

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password } = body;

    // 1. Kiểm tra đầu vào
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập đầy đủ email và mật khẩu.' },
        { status: 400 }
      );
    }

    const normalizedInput = email.toLowerCase().trim();
    const targetEmail = normalizedInput === 'admin' ? 'admin@smares.com' : normalizedInput;

    // 2. Tìm người dùng theo email hoặc tên tài khoản (username)
    let user = await User.findOne({ email: targetEmail });
    if (!user && normalizedInput !== targetEmail) {
      user = await User.findOne({ email: normalizedInput });
    }
    if (!user && !normalizedInput.includes('@')) {
      user = await User.findOne({ username: normalizedInput });
    }
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Email hoặc mật khẩu không chính xác.' },
        { status: 401 }
      );
    }

    // 3. Kiểm tra trạng thái tạm khóa tài khoản (10 phút nếu sai quá 5 lần liên tiếp)
    const now = new Date();
    if (user.lockUntil && isAccountLocked(user.lockUntil, now)) {
      const remainingMinutes = getRemainingLockMinutes(user.lockUntil, now);
      return NextResponse.json(
        {
          success: false,
          message: `Tài khoản đang bị tạm khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút.`,
        },
        { status: 423 }
      );
    }

    // Nếu đã hết thời gian khóa trước đó thì đặt lại bộ đếm
    if (user.lockUntil && !isAccountLocked(user.lockUntil, now)) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
    }

    // 4. So khớp mật khẩu đã băm bằng phương thức comparePassword của User model
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      const nextFailedAttempts = (user.failedLoginAttempts ?? 0) + 1;
      user.failedLoginAttempts = nextFailedAttempts;

      if (nextFailedAttempts > MAX_FAILED_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS);
        await user.save();
        return NextResponse.json(
          {
            success: false,
            message: 'Bạn đã đăng nhập sai quá 5 lần liên tiếp. Tài khoản bị tạm khóa trong 10 phút.',
          },
          { status: 423 }
        );
      }

      await user.save();
      return NextResponse.json(
        { success: false, message: 'Email hoặc mật khẩu không chính xác.' },
        { status: 401 }
      );
    }

    // 5. Đăng nhập thành công -> reset bộ đếm sai và xóa lockUntil
    if ((user.failedLoginAttempts ?? 0) > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    // 6. Tạo JWT Token
    const token = signAuthToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // 7. Trả về thông tin người dùng và gắn token vào HttpOnly Cookie
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