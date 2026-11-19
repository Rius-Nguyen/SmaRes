import { NextRequest, NextResponse } from 'next/server';
import { verifyVnpaySignature } from '@/app/lib/payments/vnpay';
import { processPaymentIpn } from '@/app/lib/payments/processIpn';
import { PaymentProvider } from '@/app/models/Transaction';

export const dynamic = 'force-dynamic';

/**
 * Webhook / IPN từ VNPay Sandbox (GET).
 * Luôn trả về HTTP 200 kèm cặp { RspCode, Message } đúng bảng mã VNPay.
 */
export async function GET(request: NextRequest) {
  try {
    const params: Record<string, string> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const isValidSig = verifyVnpaySignature(params);
    if (!isValidSig) {
      return NextResponse.json(
        { RspCode: '97', Message: 'Invalid signature' },
        { status: 200 }
      );
    }

    const transactionRef = (params.vnp_TxnRef || '').trim();
    if (!transactionRef) {
      return NextResponse.json(
        { RspCode: '01', Message: 'Order not found' },
        { status: 200 }
      );
    }

    const receivedAmount = Number(params.vnp_Amount) / 100;
    const responseCode = params.vnp_ResponseCode;
    const transactionStatus = params.vnp_TransactionStatus;
    const isSuccess =
      responseCode === '00' && (!transactionStatus || transactionStatus === '00');
    const providerTransactionNo = params.vnp_TransactionNo
      ? String(params.vnp_TransactionNo)
      : null;

    const result = await processPaymentIpn({
      provider: PaymentProvider.VNPAY,
      transactionRef,
      receivedAmount,
      isSuccess,
      providerTransactionNo,
      rawResponse: params,
    });

    switch (result.outcome) {
      case 'PAID':
      case 'FAILED_UPDATED':
        return NextResponse.json(
          { RspCode: '00', Message: 'Confirm Success' },
          { status: 200 }
        );
      case 'NOT_FOUND':
        return NextResponse.json(
          { RspCode: '01', Message: 'Order not found' },
          { status: 200 }
        );
      case 'ALREADY_PROCESSED':
        return NextResponse.json(
          { RspCode: '02', Message: 'Order already confirmed' },
          { status: 200 }
        );
      case 'AMOUNT_MISMATCH':
        return NextResponse.json(
          { RspCode: '04', Message: 'Invalid amount' },
          { status: 200 }
        );
      default:
        return NextResponse.json(
          { RspCode: '99', Message: 'Unknown error' },
          { status: 200 }
        );
    }
  } catch (error: unknown) {
    console.error('Lỗi xử lý VNPay IPN:', error);
    return NextResponse.json(
      { RspCode: '99', Message: 'Unknown error' },
      { status: 200 }
    );
  }
}
