import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import {
  validateTableQrAccessService,
  type ValidateQrAccessPayload,
} from '@/app/lib/validateTableQrAccess';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    let rawBody: unknown = {};
    try {
      rawBody = await request.json();
    } catch {
      rawBody = {};
    }

    const payload: ValidateQrAccessPayload =
      typeof rawBody === 'object' && rawBody !== null
        ? (rawBody as ValidateQrAccessPayload)
        : {};

    const result = await validateTableQrAccessService(payload);
    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (error: unknown) {
    console.error('Lỗi POST /api/v1/tables/validate-qr-access:', error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Đã xảy ra lỗi hệ thống khi kiểm tra tính hợp lệ của bàn ăn.';

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message,
      },
      { status: 500 }
    );
  }
}
