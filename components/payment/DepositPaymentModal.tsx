"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import { formatMoney } from '@/app/lib/format';
import { useToast } from '@/components/ui/Toast';
import type { DepositTier } from '@/app/lib/payments/depositRules';

export type SandboxPaymentProvider = 'VNPAY' | 'MOMO';

export interface DepositBookingSummary {
  reservationId: string;
  bookingCode: string;
  tableId: string;
  tableNumber: string;
  tableType?: string;
  date: string;
  time: string;
  guests: number;
  customerName: string;
  phone: string;
}

export interface DepositPreOrderItem {
  menuItemId: string;
  quantity: number;
}

export interface DepositPaymentModalProps {
  isOpen: boolean;
  booking: DepositBookingSummary | null;
  depositAmount: number;
  depositTier: DepositTier;
  preOrderTotal?: number;
  preOrderItems?: ReadonlyArray<DepositPreOrderItem>;
  lockSessionId: string;
  lockExpiresAt: string;
  onCancelAndRelease: (reason: 'USER_CANCELLED' | 'EXPIRED') => Promise<void> | void;
}

interface CreatePaymentApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    transactionId: string;
    transactionRef: string;
    provider: SandboxPaymentProvider;
    amount: number;
    depositTier: DepositTier;
    paymentUrl: string;
    sessionId: string;
    expiresAt: string;
  };
}

interface GatewayOption {
  id: SandboxPaymentProvider;
  title: string;
  subtitle: string;
  badge: string;
}

const GATEWAY_OPTIONS: readonly GatewayOption[] = [
  {
    id: 'VNPAY',
    title: 'VNPay Sandbox',
    subtitle: 'Thẻ ATM nội địa, VNPay QR, thẻ Visa / Mastercard (HMAC-SHA512)',
    badge: 'Khuyên dùng',
  },
  {
    id: 'MOMO',
    title: 'Ví MoMo Sandbox',
    subtitle: 'Thanh toán nhanh qua ứng dụng Ví điện tử MoMo (captureWallet)',
    badge: 'Ví điện tử',
  },
];

function computeRemainingSeconds(expiresAtIso: string): number {
  const targetMs = Date.parse(expiresAtIso);
  if (!Number.isFinite(targetMs)) {
    return 600;
  }
  return Math.max(0, Math.ceil((targetMs - Date.now()) / 1000));
}

function DepositPaymentModalContent({
  booking,
  depositAmount,
  depositTier,
  preOrderTotal = 0,
  preOrderItems,
  lockSessionId,
  lockExpiresAt,
  onCancelAndRelease,
}: Omit<DepositPaymentModalProps, 'isOpen' | 'booking'> & {
  booking: DepositBookingSummary;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { showToast } = useToast();

  const [selectedProvider, setSelectedProvider] = useState<SandboxPaymentProvider>('VNPAY');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    computeRemainingSeconds(lockExpiresAt)
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isReleasing, setIsReleasing] = useState<boolean>(false);
  const [inlineError, setInlineError] = useState<string>('');

  const closingHandledRef = useRef<boolean>(false);
  const expiryHandledRef = useRef<boolean>(false);

  // Mở native <dialog> top-layer bằng showModal()
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    return () => {
      if (dialog && dialog.open) {
        dialog.close();
      }
    };
  }, []);

  // Đếm ngược thời gian giữ bàn TTL 10 phút
  useEffect(() => {
    const timer = setInterval(() => {
      const next = computeRemainingSeconds(lockExpiresAt);
      setRemainingSeconds(next);

      if (next <= 0 && !expiryHandledRef.current) {
        expiryHandledRef.current = true;
        clearInterval(timer);
        closingHandledRef.current = true;
        void onCancelAndRelease('EXPIRED');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lockExpiresAt, onCancelAndRelease]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isExpired = remainingSeconds <= 0;

  const handleCancelClick = async () => {
    if (isProcessing || isReleasing || closingHandledRef.current) return;
    closingHandledRef.current = true;
    setIsReleasing(true);
    try {
      await onCancelAndRelease('USER_CANCELLED');
    } finally {
      setIsReleasing(false);
    }
  };

  const handleProceedPayment = async () => {
    if (isProcessing || isReleasing || isExpired) return;

    setIsProcessing(true);
    setInlineError('');

    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: booking.reservationId,
          provider: selectedProvider,
          sessionId: lockSessionId,
          preOrderItems,
        }),
      });

      const json = (await response.json()) as CreatePaymentApiResponse;

      if (!response.ok || !json.success || !json.data?.paymentUrl) {
        const msg =
          json.message ||
          `Không thể khởi tạo phiên thanh toán ${selectedProvider}. Vui lòng thử lại.`;
        setInlineError(msg);
        if (response.status === 409) {
          showToast(msg, 'error');
        } else {
          showToast(msg, 'warning');
        }
        setIsProcessing(false);
        return;
      }

      // Lưu snapshot đơn để trang /payment/result và /booking/success dùng lại sau redirect
      try {
        window.sessionStorage.setItem(
          'smares_last_booking',
          JSON.stringify({
            reservationId: booking.reservationId,
            bookingCode: booking.bookingCode,
            tableId: booking.tableId,
            tableNumber: booking.tableNumber,
            tableType: booking.tableType || '',
            guests: booking.guests,
            date: booking.date,
            time: booking.time,
            name: booking.customerName,
            phone: booking.phone,
            depositAmount: json.data.amount,
            totalPrice: preOrderTotal,
            itemCount: preOrderItems?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
            transactionRef: json.data.transactionRef,
          })
        );
      } catch {
        // Bỏ qua nếu sessionStorage bị chặn
      }

      closingHandledRef.current = true;
      window.location.href = json.data.paymentUrl;
    } catch {
      const errText = `Mất kết nối khi khởi tạo cổng thanh toán ${selectedProvider}. Vui lòng thử lại.`;
      setInlineError(errText);
      showToast(errText, 'error');
      setIsProcessing(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        if (isProcessing || isReleasing) {
          e.preventDefault();
        }
      }}
      onClose={() => {
        if (!closingHandledRef.current) {
          closingHandledRef.current = true;
          void onCancelAndRelease(isExpired ? 'EXPIRED' : 'USER_CANCELLED');
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl bg-white p-0 text-[#1C1917] border border-[#EBE7DF] shadow-[0_20px_50px_rgba(28,25,23,0.18)] backdrop:bg-stone-900/60 backdrop:backdrop-blur-xs max-h-[92vh] overflow-y-auto"
    >
      <div className="flex flex-col w-full">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[#EBE7DF] flex items-center justify-between bg-[#FAF8F5] sticky top-0 z-10">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#15803D] bg-[#F0FDF4] px-2.5 py-1 rounded-full border border-[#BBF7D0] inline-block mb-1">
              Thanh toán giữ bàn (TTL 10 phút)
            </span>
            <h3 id={titleId} className="text-xl font-serif font-bold text-[#1C1917]">
              Chọn Phương Thức Đặt Cọc
            </h3>
          </div>
          <button
            type="button"
            onClick={handleCancelClick}
            disabled={isProcessing || isReleasing}
            aria-label="Hủy thanh toán và giải phóng bàn"
            className="w-9 h-9 rounded-full bg-white hover:bg-stone-100 border border-[#EBE7DF] flex items-center justify-center text-[#57534E] hover:text-[#1C1917] transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Đồng hồ đếm ngược 10:00 */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#92400E]">
              <svg className="w-4 h-4 text-[#D97706] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Thời gian giữ khóa bàn tạm thời:</span>
            </div>
            <span className="font-mono font-bold text-base text-[#B45309] bg-white px-3 py-1 rounded-xl border border-[#FDE68A]">
              {formattedTime}
            </span>
          </div>

          {/* Tóm tắt thông tin đặt bàn & tiền cọc BR-RES-07 */}
          <div className="bg-[#FAF8F5] border border-[#EBE7DF] rounded-2xl p-4 space-y-2.5 text-xs sm:text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#78716C]">Mã đặt bàn:</span>
              <span className="font-mono font-bold text-[#14532D]">{booking.bookingCode}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#78716C]">Vị trí &amp; Thời gian:</span>
              <span className="font-semibold text-[#1C1917]">
                Bàn {booking.tableNumber} • {booking.time}, {booking.date}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#78716C]">Khách hàng:</span>
              <span className="font-medium text-[#1C1917]">
                {booking.customerName} ({booking.guests} khách)
              </span>
            </div>
            <div className="pt-2.5 border-t border-[#EBE7DF] flex items-center justify-between">
              <div>
                <p className="text-[#57534E] font-medium">Tiền cọc giữ chỗ</p>
                <p className="text-[11px] text-[#78716C]">
                  {depositTier === 'VIP_OR_LARGE'
                    ? preOrderTotal > 0
                      ? 'Áp dụng Phòng VIP / Bàn tiệc lớn (tối thiểu 300.000đ hoặc 20% món đặt trước)'
                      : 'Áp dụng mức cọc Phòng VIP / Bàn tiệc lớn'
                    : 'Áp dụng mức cọc Bàn tiêu chuẩn'}
                </p>
              </div>
              <span className="font-serif font-bold text-xl text-[#D97706] shrink-0">
                {formatMoney(depositAmount)}
              </span>
            </div>
          </div>

          {/* Lựa chọn cổng thanh toán */}
          <fieldset
            disabled={isProcessing || isReleasing || isExpired}
            className="space-y-2.5 text-left"
          >
            <legend className="text-xs font-bold uppercase tracking-wider text-[#57534E] mb-2">
              Chọn cổng thanh toán trực tuyến
            </legend>
            {GATEWAY_OPTIONS.map((option) => {
              const isSelected = selectedProvider === option.id;
              return (
                <label
                  key={option.id}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#F0FDF4] border-[#14532D] shadow-xs'
                      : 'bg-white border-[#EBE7DF] hover:border-[#D6D0C4]'
                  }`}
                >
                  <input
                    type="radio"
                    name="depositGatewayProvider"
                    value={option.id}
                    checked={isSelected}
                    onChange={() => setSelectedProvider(option.id)}
                    className="mt-1 h-4 w-4 accent-[#14532D] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[#1C1917]">
                        {option.title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#15803D] border border-[#BBF7D0]">
                        {option.badge}
                      </span>
                    </div>
                    <p className="text-xs text-[#57534E] mt-0.5 leading-relaxed">
                      {option.subtitle}
                    </p>
                  </div>
                </label>
              );
            })}
          </fieldset>

          {/* Thông báo lỗi nghiệp vụ / lock conflict */}
          {inlineError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{inlineError}</span>
            </div>
          )}

          {/* Ghi chú bảo mật */}
          <p className="text-[11px] text-[#78716C] flex items-start gap-2 leading-relaxed">
            <svg className="w-4 h-4 text-[#14532D] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>
              Giao dịch được thực hiện trực tiếp qua cổng bảo mật {selectedProvider} Sandbox. SmaRes không lưu trữ số thẻ, mã CVV hay mật khẩu ngân hàng của quý khách.
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 space-y-2.5">
          <button
            type="button"
            onClick={handleProceedPayment}
            disabled={isProcessing || isReleasing || isExpired}
            className="w-full bg-[#14532D] hover:bg-[#15803D] text-white font-semibold py-3.5 rounded-xl shadow-[0_8px_20px_-4px_rgba(20,83,45,0.4)] text-sm sm:text-base transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isProcessing ? (
              <span>Đang khởi tạo cổng {selectedProvider}...</span>
            ) : (
              <>
                <span>
                  Thanh Toán Cọc {formatMoney(depositAmount)} Qua {selectedProvider === 'VNPAY' ? 'VNPay' : 'MoMo'}
                </span>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCancelClick}
            disabled={isProcessing || isReleasing}
            className="w-full py-2.5 rounded-xl border border-[#D6D0C4] text-[#57534E] hover:text-[#1C1917] hover:bg-[#FAF8F5] text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {isReleasing ? 'Đang giải phóng bàn...' : 'Hủy thanh toán & Giải phóng bàn'}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default function DepositPaymentModal(props: DepositPaymentModalProps) {
  if (!props.isOpen || !props.booking) {
    return null;
  }

  return <DepositPaymentModalContent {...props} booking={props.booking} />;
}
