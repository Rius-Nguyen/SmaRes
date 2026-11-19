import { NextResponse } from 'next/server';
import { getAuthCookieOptions } from '@/app/lib/auth';

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: 'Đăng xuất thành công!' },
    { status: 200 }
  );

  // Xóa HttpOnly auth cookie với đầy đủ thuộc tính khớp lúc set
  response.cookies.set({
    ...getAuthCookieOptions(0),
    value: '',
    expires: new Date(0),
  });

  return response;
}
