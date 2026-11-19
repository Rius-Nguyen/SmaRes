import { NextRequest, NextResponse } from 'next/server';
import { verifyMomoSignature } from '@/app/lib/payments/momo';
import { processPaymentIpn } from '@/app/lib/payments/processIpn';
import { PaymentProvider } from '@/app/models/Transaction';

export const dynamic = 'force-dynamic';

/**
 * Webhook / IPN từ MoMo Sandbox v2 (POST JSON).
 * Trả HTTP 204 No Content khi xử lý thành công hoặc idempotent để MoMo dừng retry.
 */
export async function POST(request: NextRequest) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    if (typeof rawBody !== 'object' || rawBody === null) {
      return NextResponse.json(
        { success: false, message: 'Invalid payload' },
        { status: 400 }
      );
    }

    const body = rawBody as Record<string, unknown>;

    const isValidSig = verifyMomoSignature(body);
    if (!isValidSig) {
      return NextResponse.json(
        { success: false, message: 'Invalid signature' },
        { status: 400 }
      );
    }

    const transactionRef = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    if (!transactionRef) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const receivedAmount = Number(body.amount);
    const isSuccess = Number(body.resultCode) === 0;
    const providerTransactionNo =
      body.transId !== undefined &&
      body.transId !== null &&
      String(body.transId).trim() !== ''
        ? String(body.transId)
        : null;

    const result = await processPaymentIpn({
      provider: PaymentProvider.MOMO,
      transactionRef,
      receivedAmount,
      isSuccess,
      providerTransactionNo,
      rawResponse: body,
    });

    switch (result.outcome) {
      case 'PAID':
      case 'FAILED_UPDATED':
      case 'ALREADY_PROCESSED':
        return new NextResponse(null, { status: 204 });
      case 'NOT_FOUND':
        return NextResponse.json(
          { success: false, message: 'Order not found' },
          { status: 404 }
        );
      case 'AMOUNT_MISMATCH':
        return NextResponse.json(
          { success: false, message: 'Invalid amount' },
          { status: 400 }
        );
      default:
        return NextResponse.json(
          { success: false, message: 'Internal server error' },
          { status: 500 }
        );
    }
  } catch (error: unknown) {
    console.error('Lỗi xử lý MoMo IPN:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
