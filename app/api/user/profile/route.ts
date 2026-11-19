import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import { requireAuth } from '@/app/lib/auth';

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    await connectDB();

    const user = await User.findById(auth.user.userId).select('-password');
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
