import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export async function GET(request: Request) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu cung cấp Token xác thực (Unauthorized).' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const secretKey = process.env.JWT_SECRET || 'KhoaBaoMat_SmaRes_2026_@!#';

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, secretKey) as JwtPayload;
    } catch {
      return NextResponse.json(
        { success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' },
        { status: 401 }
      );
    }

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy thông tin người dùng.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi khi lấy thông tin profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Lỗi hệ thống server.';
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
