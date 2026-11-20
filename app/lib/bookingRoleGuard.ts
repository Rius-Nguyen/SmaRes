import { NextResponse, type NextRequest } from 'next/server';
import { getAuthUser, type AuthPayload } from '@/app/lib/auth';

/**
 * Prevents admin accounts from creating table locks, reservations, or booking payment sessions
 * while permitting guests, customers, and staff.
 */
export function checkBookingAccess(request: Request | NextRequest): {
  user: AuthPayload | null;
  errorResponse?: NextResponse;
} {
  let user: AuthPayload | null = null;
  try {
    user = getAuthUser(request);
  } catch {
    user = null;
  }

  if (user?.role === 'admin') {
    return {
      user,
      errorResponse: NextResponse.json(
        {
          success: false,
          message: 'Tài khoản Quản trị viên (Admin) không sử dụng chức năng đặt bàn.',
          error: 'ADMIN_BOOKING_FORBIDDEN',
        },
        { status: 403 }
      ),
    };
  }

  return { user };
}
