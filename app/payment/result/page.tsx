"use client";

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/app/context/CartContext';
import { formatMoney } from '@/app/lib/format';

interface PaymentStatusData {
  signatureValid?: boolean;
  provider?: 'VNPAY' | 'MOMO' | 'BANK_QR';
  effectiveStatus: 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED';
  gatewaySuccess?: boolean;
  gatewayCode?: string;
  gatewayMessage?: string;
  transaction?: {
    id: string;
    transactionRef: string;
    amount: number;
    provider: 'VNPAY' | 'MOMO' | 'BANK_QR';
    status: string;
    providerTransactionNo?: string | null;
    expiresAt?: string;
  };
  reservation?: {
    id: string;
    bookingCode: string;
    tableId: string;
    tableNumber: string;
    date: string;
    time: string;
    guests: number;
    customerName: string;
    phone: string;
    note?: string;
    status: string;
    depositAmount: number;
    paymentStatus: string;
  } | null;
}

interface PaymentStatusApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: PaymentStatusData;
}

interface ViewResultState {
  effectiveStatus: 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED';
  message: string;
  data?: PaymentStatusData;
}

const MAX_IPN_POLLS = 3;
const POLL_INTERVAL_MS = 2000;

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const { setBookingInfo, clearCart } = useCart();

  const queryString = searchParams.toString();

  const [viewState, setViewState] = useState<ViewResultState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pollCount, setPollCount] = useState<number>(0);
  const [refreshNonce, setRefreshNonce] = useState<number>(0);

  const syncedSuccessRef = useRef<boolean>(false);

  useEffect(() => {
    let isCancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function verifyFromServer(attempt: number): Promise<void> {
      if (!queryString) {
        await Promise.resolve();
        if (isCancelled) return;
        setViewState({
          effectiveStatus: 'FAILED',
          message: 'Không tìm thấy tham số giao dịch thanh toán trên đường dẫn.',
        });
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/payments/status?${queryString}`, {
          cache: 'no-store',
        });
        const json = (await res.json()) as PaymentStatusApiResponse;

        if (isCancelled) return;

        if (!res.ok || !json.success || !json.data) {
          setViewState({
            effectiveStatus: 'FAILED',
            message:
              json.message ||
              'Không thể xác thực thông tin giao dịch thanh toán.',
            data: json.data,
          });
          setIsLoading(false);
          return;
        }

        const payload = json.data;

        setViewState({
          effectiveStatus: payload.effectiveStatus,
          message:
            payload.gatewayMessage ||
            json.message ||
            'Đã kiểm tra trạng thái giao dịch.',
          data: payload,
        });

        // Khi giao dịch PAID: đồng bộ CartContext & sessionStorage để khách có thể đặt món trước (BR-ORD-02) hoặc xem phiếu QR
        if (
          payload.effectiveStatus === 'PAID' &&
          payload.reservation &&
          !syncedSuccessRef.current
        ) {
          syncedSuccessRef.current = true;
          const rsv = payload.reservation;
          const depositAmt =
            payload.transaction?.amount ?? rsv.depositAmount ?? 100000;

          setBookingInfo((prev) => ({
            reservationId: rsv.id,
            bookingCode: rsv.bookingCode,
            tableId: rsv.tableId,
            tableNumber: rsv.tableNumber,
            tableType: prev?.tableType || '',
            tableCapacity: prev?.tableCapacity || rsv.guests,
            date: rsv.date,
            time: rsv.time,
            guests: rsv.guests,
            name: rsv.customerName || prev?.name || 'Quý khách',
            phone: rsv.phone || prev?.phone || '',
            email: prev?.email || '',
            note: rsv.note || prev?.note || '',
            depositAmount: depositAmt,
            paymentStatus: 'PAID',
          }));

          try {
            const rawPrev = window.sessionStorage.getItem('smares_last_booking');
            const parsedPrev = rawPrev
              ? (JSON.parse(rawPrev) as Record<string, unknown>)
              : {};
            window.sessionStorage.setItem(
              'smares_last_booking',
              JSON.stringify({
                ...parsedPrev,
                bookingCode: rsv.bookingCode,
                tableId: rsv.tableId,
                tableNumber: rsv.tableNumber,
                guests: rsv.guests,
                date: rsv.date,
                time: rsv.time,
                name: rsv.customerName || 'Quý khách',
                phone: rsv.phone,
                depositAmount: depositAmt,
                paymentStatus: 'PAID',
              })
            );
            window.sessionStorage.removeItem('smares_pending_reservation');
          } catch {
            // Bỏ qua lỗi sessionStorage
          }

          clearCart();
        }

        // Nếu đang chờ IPN tới (PENDING) -> poll lại tối đa 3 lần (cách 2 giây)
        if (payload.effectiveStatus === 'PENDING' && attempt < MAX_IPN_POLLS) {
          setPollCount(attempt + 1);
          setIsLoading(false);
          pollTimer = setTimeout(() => {
            void verifyFromServer(attempt + 1);
          }, POLL_INTERVAL_MS);
          return;
        }
      } catch {
        if (isCancelled) return;
        setViewState({
          effectiveStatus: 'FAILED',
          message: 'Mất kết nối máy chủ khi xác minh kết quả thanh toán.',
        });
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void verifyFromServer(0);

    return () => {
      isCancelled = true;
      if (pollTimer) {
        clearTimeout(pollTimer);
      }
    };
  }, [queryString, refreshNonce, setBookingInfo, clearCart]);

  const handleManualCheck = () => {
    setIsLoading(true);
    setPollCount(0);
    setRefreshNonce((prev) => prev + 1);
  };

  const payload = viewState?.data;
  const reservation = payload?.reservation;
  const transaction = payload?.transaction;
  const effectiveStatus = viewState?.effectiveStatus;
  const isWaitingIpn = isLoading || effectiveStatus === 'PENDING';
  const isPaid = !isLoading && effectiveStatus === 'PAID';
  const isExpired = effectiveStatus === 'EXPIRED';

  const successHref = reservation?.bookingCode
    ? `/booking/success?code=${encodeURIComponent(reservation.bookingCode)}&table=${encodeURIComponent(reservation.tableNumber || '')}`
    : '/booking/success';

  return (
    <main className="flex-1 flex items-center justify-center bg-[#FAF8F5] text-[#1C1917] py-14 px-4 min-h-[calc(100vh-80px)]">
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_-4px_rgba(28,25,23,0.08)] p-6 sm:p-9 max-w-xl w-full border border-[#EBE7DF]">
        {/* TRẠNG THÁI 1: ĐANG XÁC THỰC / CHỜ WEBHOOK IPN */}
        {isWaitingIpn ? (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#92400E] bg-[#FFFBEB] px-3 py-1 rounded-full border border-[#FDE68A] inline-block mb-2">
                {pollCount > 0
                  ? `Đang đồng bộ IPN (${pollCount}/${MAX_IPN_POLLS})`
                  : 'Đang xác minh giao dịch'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917]">
                Đang Xác Thực Thanh Toán Cọc
              </h1>
              <p className="text-xs sm:text-sm text-[#57534E] mt-2 leading-relaxed">
                Hệ thống đang kiểm tra chữ ký bảo mật và đối soát trạng thái thực tế từ cổng thanh toán. Vui lòng đợi trong giây lát.
              </p>
            </div>

            {transaction && (
              <div className="bg-[#FAF8F5] border border-[#EBE7DF] rounded-2xl p-4 text-left text-xs sm:text-sm space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-[#78716C]">Mã giao dịch:</span>
                  <span className="font-mono font-bold text-[#14532D] truncate">
                    {transaction.transactionRef}
                  </span>
                </div>
                {reservation && (
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">Mã đặt bàn:</span>
                    <span className="font-mono font-bold text-[#1C1917]">
                      {reservation.bookingCode}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#78716C]">Số tiền đặt cọc:</span>
                  <span className="font-serif font-bold text-[#D97706]">
                    {formatMoney(transaction.amount)}
                  </span>
                </div>
              </div>
            )}

            {!isLoading && pollCount >= MAX_IPN_POLLS && (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-[#78716C]">
                  Webhook IPN từ cổng thanh toán có thể đang được xử lý chậm vài giây. Quý khách có thể bấm kiểm tra lại hoặc xem lịch sử đặt bàn.
                </p>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={handleManualCheck}
                    className="flex-1 bg-[#14532D] hover:bg-[#15803D] text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                  >
                    Kiểm tra lại trạng thái
                  </button>
                  <Link
                    href="/history"
                    className="flex-1 text-center py-3 rounded-xl border border-[#D6D0C4] text-[#57534E] hover:bg-stone-50 font-semibold text-sm transition-colors"
                  >
                    Xem lịch sử đặt bàn
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : isPaid ? (
          /* TRẠNG THÁI 2: THANH TOÁN ĐẶT CỌC THÀNH CÔNG */
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-[#14532D] text-white rounded-full flex items-center justify-center mx-auto shadow-[0_8px_20px_-4px_rgba(20,83,45,0.4)]">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#15803D] bg-[#F0FDF4] px-3 py-1 rounded-full border border-[#BBF7D0] inline-block mb-2">
                Đã thanh toán tiền cọc
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#14532D]">
                Đặt Bàn &amp; Cọc Thành Công!
              </h1>
              <p className="text-xs sm:text-sm text-[#57534E] mt-1.5 leading-relaxed">
                Bàn ăn của quý khách đã được xác nhận giữ chỗ chính thức tại nhà hàng SmaRes.
              </p>
            </div>

            {/* Chi tiết đơn đặt bàn & giao dịch */}
            <div className="bg-[#FAF8F5] border border-[#EBE7DF] rounded-2xl p-4 sm:p-5 text-left space-y-2.5 text-xs sm:text-sm">
              {reservation && (
                <>
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#EBE7DF]">
                    <span className="text-[#78716C]">Mã đặt bàn:</span>
                    <span className="font-mono font-bold text-base text-[#14532D]">
                      {reservation.bookingCode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#78716C]">Số bàn &amp; Số khách:</span>
                    <span className="font-semibold text-[#1C1917]">
                      Bàn {reservation.tableNumber} • {reservation.guests} khách
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#78716C]">Thời gian hẹn:</span>
                    <span className="font-semibold text-[#1C1917]">
                      {reservation.time}, Ngày {reservation.date}
                    </span>
                  </div>
                </>
              )}
              {transaction && (
                <>
                  <div className="flex items-center justify-between pt-2 border-t border-[#EBE7DF]">
                    <span className="text-[#78716C]">Số tiền đã cọc:</span>
                    <span className="font-serif font-bold text-lg text-[#D97706]">
                      {formatMoney(transaction.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#78716C]">Cổng thanh toán:</span>
                    <span className="font-semibold text-[#1C1917]">
                      {transaction.provider}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#78716C] shrink-0">Mã tham chiếu:</span>
                    <span className="font-mono text-xs text-[#57534E] truncate">
                      {transaction.transactionRef}
                    </span>
                  </div>
                  {transaction.providerTransactionNo && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#78716C] shrink-0">Mã GD đối soát:</span>
                      <span className="font-mono text-xs text-[#57534E]">
                        {transaction.providerTransactionNo}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Thông báo Email xác nhận (BR-RES-05) */}
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-4 text-left flex items-start gap-3 text-xs sm:text-sm text-[#14532D]">
              <svg className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <p className="leading-relaxed">
                <strong>Email xác nhận đặt bàn:</strong> Hệ thống đã kích hoạt gửi thư xác nhận kèm mã đặt bàn, số bàn và số tiền cọc tới email của quý khách trong tối đa 1 phút.
              </p>
            </div>

            {/* Nút điều hướng đặt món trước & xem phiếu / lịch sử */}
            <div className="space-y-2.5 pt-1">
              <Link
                href="/booking/menu"
                className="flex items-center justify-center gap-2 w-full bg-[#14532D] hover:bg-[#15803D] text-white font-semibold py-3.5 rounded-xl shadow-[0_8px_20px_-4px_rgba(20,83,45,0.4)] transition-all text-sm sm:text-base"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                  <path d="M7 2v20" />
                  <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                </svg>
                <span>Đặt Món Ăn Trước Ngay</span>
              </Link>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Link
                  href={successHref}
                  className="py-3 rounded-xl border border-[#14532D] text-[#14532D] hover:bg-[#F0FDF4] font-semibold text-xs sm:text-sm transition-colors text-center"
                >
                  Xem Phiếu &amp; Mã QR Bàn
                </Link>
                <Link
                  href="/history"
                  className="py-3 rounded-xl border border-[#D6D0C4] text-[#57534E] hover:bg-stone-50 font-semibold text-xs sm:text-sm transition-colors text-center"
                >
                  Xem Lịch Sử Đặt Bàn
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* TRẠNG THÁI 3: THANH TOÁN THẤT BẠI / HẾT HẠN (TK-130 ĐÃ GIẢI PHÓNG BÀN) */
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-red-50 text-red-600 border border-red-200 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200 inline-block mb-2">
                {isExpired ? 'Quá hạn giữ chỗ (10 phút)' : 'Giao dịch không thành công'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917]">
                {isExpired ? 'Phiên Thanh Toán Đã Hết Hạn' : 'Thanh Toán Cọc Thất Bại'}
              </h1>
              <p className="text-xs sm:text-sm text-[#57534E] mt-2 leading-relaxed">
                {viewState?.message ||
                  'Giao dịch thanh toán tiền cọc chưa được hoàn tất hoặc đã bị hủy.'}
              </p>
            </div>

            {(reservation || transaction) && (
              <div className="bg-[#FAF8F5] border border-[#EBE7DF] rounded-2xl p-4 text-left text-xs sm:text-sm space-y-2">
                {reservation?.bookingCode && (
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">Mã đặt bàn:</span>
                    <span className="font-mono font-bold text-[#1C1917]">
                      {reservation.bookingCode}
                    </span>
                  </div>
                )}
                {transaction?.transactionRef && (
                  <div className="flex justify-between gap-2">
                    <span className="text-[#78716C] shrink-0">Mã giao dịch:</span>
                    <span className="font-mono text-xs text-[#57534E] truncate">
                      {transaction.transactionRef}
                    </span>
                  </div>
                )}
                {typeof transaction?.amount === 'number' && (
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">Số tiền giao dịch:</span>
                    <span className="font-serif font-bold text-[#D97706]">
                      {formatMoney(transaction.amount)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Thông báo giải phóng bàn tự động (TK-130) */}
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-4 text-left flex items-start gap-3 text-xs sm:text-sm text-[#92400E]">
              <svg className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="leading-relaxed">
                <strong>Khóa bàn đã được tự động giải phóng:</strong> Bàn{' '}
                <strong>{reservation?.tableNumber || 'đã chọn'}</strong> đã được trả về trạng thái khả dụng cho khung giờ này để quý khách hoặc khách khác có thể đặt lại.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <Link
                href="/booking/diagram"
                className="flex items-center justify-center gap-2 w-full bg-[#14532D] hover:bg-[#15803D] text-white font-semibold py-3.5 rounded-xl shadow-[0_8px_20px_-4px_rgba(20,83,45,0.35)] transition-all text-sm sm:text-base"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span>Thử Đặt Bàn Lại</span>
              </Link>

              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  href="/history"
                  className="py-3 rounded-xl border border-[#D6D0C4] text-[#57534E] hover:bg-stone-50 font-semibold text-xs sm:text-sm transition-colors text-center"
                >
                  Lịch sử đặt bàn
                </Link>
                <Link
                  href="/"
                  className="py-3 rounded-xl border border-[#D6D0C4] text-[#57534E] hover:bg-stone-50 font-semibold text-xs sm:text-sm transition-colors text-center"
                >
                  Về trang chủ
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function PaymentResultFallback() {
  return (
    <main className="flex-1 flex items-center justify-center bg-[#FAF8F5] text-[#1C1917] py-14 px-4 min-h-[calc(100vh-80px)]">
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_-4px_rgba(28,25,23,0.08)] p-8 max-w-lg w-full border border-[#EBE7DF] text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] flex items-center justify-center mx-auto">
          <svg
            className="w-7 h-7 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
        <h1 className="text-xl font-serif font-bold text-[#1C1917]">
          Đang tải kết quả thanh toán...
        </h1>
      </div>
    </main>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<PaymentResultFallback />}>
      <PaymentResultContent />
    </Suspense>
  );
}
