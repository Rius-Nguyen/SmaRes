"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { formatCountdownHhMmSs, formatMoney } from '@/app/lib/format';
import { useToast } from '@/components/ui/Toast';
import {
  PRE_ORDER_DEPOSIT_RATE,
  STANDARD_DEPOSIT_AMOUNT,
  VIP_BASE_DEPOSIT_AMOUNT,
  type DepositTier,
} from '@/app/lib/payments/depositRules';
import {
  buildVietQrPayload,
  getVietQrAccountConfig,
  sanitizeTransferNote,
} from '@/app/lib/payments/vietqr';

export type DepositPaymentMethod = 'BANK_QR' | 'VNPAY';
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
  baseTableDeposit?: number;
  preOrderDeposit?: number;
  depositTier: DepositTier;
  preOrderTotal?: number;
  preOrderItems?: ReadonlyArray<DepositPreOrderItem>;
  lockSessionId: string;
  lockExpiresAt: string;
  onBankQrComplete?: (transactionRef: string, amount: number) => void;
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

interface BankQrTransactionApiResponse {
  success: boolean;
  message?: string;
  data?: {
    id?: string;
    amount?: number;
    transactionRef?: string;
  };
}

interface PaymentMethodOption {
  id: DepositPaymentMethod;
  title: string;
  subtitle: string;
  badge: string;
}

const PAYMENT_METHOD_OPTIONS: readonly PaymentMethodOption[] = [
  {
    id: 'BANK_QR',
    title: 'Quét mã VietQR (App Ngân hàng / Ví MoMo)',
    subtitle:
      'Quét trực tiếp bằng mọi App Ngân hàng hoặc Ví MoMo — tự điền sẵn số tiền cọc & mã đặt bàn',
    badge: 'Tự điền tiền & mã',
  },
  {
    id: 'VNPAY',
    title: 'VNPay Sandbox (Thẻ ATM / VNPay QR / Visa / Mastercard)',
    subtitle:
      'Thanh toán trực tuyến qua cổng VNPay Sandbox kèm xác thực chữ ký HMAC-SHA512 & IPN tự động',
    badge: 'Tự động IPN',
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
  baseTableDeposit,
  preOrderDeposit,
  depositTier,
  preOrderTotal = 0,
  preOrderItems,
  lockSessionId,
  lockExpiresAt,
  onBankQrComplete,
  onCancelAndRelease,
}: Omit<DepositPaymentModalProps, 'isOpen' | 'booking'> & {
  booking: DepositBookingSummary;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { showToast } = useToast();

  const [selectedMethod, setSelectedMethod] = useState<DepositPaymentMethod>('BANK_QR');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    computeRemainingSeconds(lockExpiresAt)
  );
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isReleasing, setIsReleasing] = useState<boolean>(false);
  const [inlineError, setInlineError] = useState<string>('');

  const closingHandledRef = useRef<boolean>(false);
  const expiryHandledRef = useRef<boolean>(false);

  const vietQrAccount = useMemo(() => getVietQrAccountConfig(), []);
  const transferNote = useMemo(
    () => sanitizeTransferNote(booking.bookingCode) || booking.bookingCode,
    [booking.bookingCode]
  );
  const vietQrPayload = useMemo(
    () =>
      buildVietQrPayload({
        amount: depositAmount,
        bookingCode: transferNote,
        bankBin: vietQrAccount.bankBin,
        accountNo: vietQrAccount.accountNo,
        serviceCode: vietQrAccount.serviceCode,
      }),
    [depositAmount, transferNote, vietQrAccount]
  );

  // Sinh ảnh Data URL từ chuỗi VietQR NAPAS 247 động bằng thư viện qrcode (đen/trắng tương phản cao + quiet zone chuẩn 4)
  useEffect(() => {
    let isCancelled = false;
    QRCode.toDataURL(vietQrPayload, {
      width: 260,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (!isCancelled) {
          setQrDataUrl(url);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setQrDataUrl('');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [vietQrPayload]);

  // Mở native <dialog> top-layer bằng showModal(). Không gọi dialog.close() trong cleanup
  // để tránh React StrictMode double-effect phát sự kiện `close` làm tự hủy phiên giữ bàn.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
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

  const formattedTime = formatCountdownHhMmSs(remainingSeconds);
  const isExpired = remainingSeconds <= 0;

  const saveBookingSnapshot = (amountValue: number, extra?: Record<string, unknown>) => {
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
          depositAmount: amountValue,
          totalPrice: preOrderTotal,
          itemCount: preOrderItems?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
          ...extra,
        })
      );
    } catch {
      // Bỏ qua nếu sessionStorage bị chặn
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(transferNote);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = transferNote;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  const handleConfirmBankQr = async () => {
    if (isProcessing || isReleasing || isExpired) return;

    setIsProcessing(true);
    setInlineError('');

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: booking.reservationId,
          amount: depositAmount,
          provider: 'BANK_QR',
          preOrderItems,
        }),
      });

      const json = (await response.json()) as BankQrTransactionApiResponse;
      if (!response.ok || !json.success) {
        const msg = json.message || 'Không thể ghi nhận giao dịch chuyển khoản. Vui lòng thử lại.';
        setInlineError(msg);
        showToast(msg, 'error');
        setIsProcessing(false);
        return;
      }

      const txRef = json.data?.transactionRef || '';
      const resolvedAmount = json.data?.amount ?? depositAmount;

      saveBookingSnapshot(resolvedAmount, {
        transactionRef: txRef,
        paymentStatus: 'PENDING',
      });

      closingHandledRef.current = true;
      onBankQrComplete?.(txRef, resolvedAmount);
    } catch {
      const errText = 'Mất kết nối máy chủ khi ghi nhận chuyển khoản. Vui lòng thử lại.';
      setInlineError(errText);
      showToast(errText, 'error');
      setIsProcessing(false);
    }
  };

  const handleProceedVnpayPayment = async () => {
    if (isProcessing || isReleasing || isExpired) return;

    setIsProcessing(true);
    setInlineError('');

    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: booking.reservationId,
          provider: 'VNPAY',
          sessionId: lockSessionId,
          preOrderItems,
        }),
      });

      const json = (await response.json()) as CreatePaymentApiResponse;

      if (!response.ok || !json.success || !json.data?.paymentUrl) {
        const msg =
          json.error === 'PAYMENT_CONFIG_MISSING'
            ? `${json.message || 'Chưa cấu hình khóa VNPay Sandbox trong .env.local (VNPAY_TMN_CODE, VNPAY_HASH_SECRET).'} Quý khách có thể chọn Quét mã VietQR ở trên để thanh toán ngay.`
            : json.message ||
              'Không thể khởi tạo phiên thanh toán VNPay Sandbox. Quý khách có thể dùng Quét mã VietQR ở trên.';
        setInlineError(msg);
        if (response.status === 409) {
          showToast(msg, 'error');
        } else {
          showToast(msg, 'warning');
        }
        setIsProcessing(false);
        return;
      }

      saveBookingSnapshot(json.data.amount, {
        transactionRef: json.data.transactionRef,
      });

      closingHandledRef.current = true;
      window.location.href = json.data.paymentUrl;
    } catch {
      const errText = 'Mất kết nối khi khởi tạo cổng thanh toán VNPay Sandbox. Vui lòng thử lại.';
      setInlineError(errText);
      showToast(errText, 'error');
      setIsProcessing(false);
    }
  };

  const handlePrimaryAction = async () => {
    if (selectedMethod === 'BANK_QR') {
      await handleConfirmBankQr();
      return;
    }
    await handleProceedVnpayPayment();
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
              Khóa bàn giữ chỗ 10 phút
            </span>
            <h3 id={titleId} className="text-xl font-serif font-bold text-[#1C1917]">
              Thanh Toán Tiền Cọc Đặt Bàn
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
          <div className="bg-[#FAF8F5] border border-[#EBE7DF] rounded-2xl p-4 space-y-2 text-xs sm:text-sm">
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
            <div className="pt-2 border-t border-[#EBE7DF] space-y-2">
              {(() => {
                const resolvedBase =
                  typeof baseTableDeposit === 'number'
                    ? baseTableDeposit
                    : depositTier === 'VIP_OR_LARGE'
                      ? VIP_BASE_DEPOSIT_AMOUNT
                      : STANDARD_DEPOSIT_AMOUNT;
                const resolvedPreOrderDeposit =
                  typeof preOrderDeposit === 'number'
                    ? preOrderDeposit
                    : preOrderTotal > 0
                      ? Math.round(preOrderTotal * PRE_ORDER_DEPOSIT_RATE)
                      : Math.max(0, depositAmount - resolvedBase);

                return (
                  <>
                    {preOrderTotal > 0 && resolvedPreOrderDeposit > 0 && (
                      <div className="space-y-1 text-[11px] sm:text-xs text-[#57534E] bg-white border border-[#EBE7DF] rounded-xl px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span>
                            Cọc bàn (
                            {depositTier === 'VIP_OR_LARGE'
                              ? 'VIP / Bàn lớn'
                              : 'Tiêu chuẩn'}
                            ):
                          </span>
                          <span className="font-semibold text-[#1C1917]">
                            {formatMoney(resolvedBase)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>50% thực đơn ({formatMoney(preOrderTotal)}):</span>
                          <span className="font-semibold text-[#1C1917]">
                            {formatMoney(resolvedPreOrderDeposit)}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#57534E] font-medium">Số tiền đặt cọc</p>
                        <p className="text-[11px] text-[#78716C]">
                          {depositTier === 'VIP_OR_LARGE'
                            ? 'Phòng VIP / Bàn lớn (300.000đ + 50% thực đơn)'
                            : preOrderTotal > 0
                              ? 'Bàn tiêu chuẩn (100.000đ + 50% thực đơn)'
                              : 'Bàn tiêu chuẩn (BR-RES-07)'}
                        </p>
                      </div>
                      <span className="font-serif font-bold text-xl text-[#D97706] shrink-0">
                        {formatMoney(depositAmount)}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Lựa chọn 2 phương thức thanh toán: VietQR + VNPay Sandbox */}
          <fieldset
            disabled={isProcessing || isReleasing || isExpired}
            className="space-y-2 text-left"
          >
            <legend className="text-xs font-bold uppercase tracking-wider text-[#57534E] mb-2">
              Chọn phương thức thanh toán
            </legend>
            {PAYMENT_METHOD_OPTIONS.map((option) => {
              const isSelected = selectedMethod === option.id;
              return (
                <label
                  key={option.id}
                  className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
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
                    onChange={() => {
                      setSelectedMethod(option.id);
                      setInlineError('');
                    }}
                    className="mt-1 h-4 w-4 accent-[#14532D] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[#1C1917]">
                        {option.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          option.id === 'BANK_QR'
                            ? 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
                            : 'bg-white text-[#15803D] border-[#BBF7D0]'
                        }`}
                      >
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

          {/* Khối chi tiết cho từng phương thức */}
          {selectedMethod === 'BANK_QR' ? (
            <div className="space-y-3.5 text-center bg-[#FAF8F5] border border-[#EBE7DF] rounded-2xl p-4">
              <div className="bg-white p-3 rounded-2xl border border-[#EBE7DF] inline-flex flex-col items-center mx-auto shadow-xs">
                {qrDataUrl ? (
                  <Image
                    src={qrDataUrl}
                    alt={`Mã VietQR động chuyển khoản ${formatMoney(depositAmount)} cho đơn ${booking.bookingCode}`}
                    width={208}
                    height={208}
                    unoptimized
                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain mx-auto rounded-xl"
                  />
                ) : (
                  <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-xl bg-stone-100 animate-pulse flex items-center justify-center text-xs text-stone-400">
                    Đang sinh mã VietQR...
                  </div>
                )}
                <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#14532D] bg-[#F0FDF4] px-2.5 py-0.5 rounded-full border border-[#BBF7D0]">
                  VietQR NAPAS 247 • App Ngân hàng &amp; MoMo
                </span>
              </div>

              <div className="bg-white rounded-xl border border-[#EBE7DF] p-3 text-left text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#78716C]">Ngân hàng thụ hưởng:</span>
                  <span className="font-semibold text-[#1C1917]">
                    {vietQrAccount.bankName} ({vietQrAccount.bankBin})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#78716C]">Số tài khoản:</span>
                  <span className="font-mono font-bold text-[#14532D]">
                    {vietQrAccount.accountNo}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#78716C]">Chủ tài khoản:</span>
                  <span className="font-semibold text-[#1C1917]">
                    {vietQrAccount.accountName}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#78716C]">Số tiền tự động điền:</span>
                  <span className="font-bold text-[#D97706]">{formatMoney(depositAmount)}</span>
                </div>
              </div>

              <div className="text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#57534E] font-medium">
                    Nội dung chuyển khoản (Tự điền sẵn trong QR):
                  </span>
                  {copied && (
                    <span className="text-[11px] font-bold text-[#15803D] inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Đã sao chép</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-[#D6D0C4] rounded-xl px-3 py-2 font-mono font-bold text-[#14532D] text-base tracking-wider select-all">
                    {transferNote}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3.5 py-2 bg-[#14532D] hover:bg-[#15803D] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                    <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#78716C] leading-relaxed">
                  Mở <strong>mọi App Ngân hàng</strong> hoặc <strong>Ví MoMo</strong> để quét mã VietQR trên — hệ thống sẽ tự động điền đúng{' '}
                  <strong className="text-[#D97706]">{formatMoney(depositAmount)}</strong> và nội dung{' '}
                  <strong className="font-mono text-[#1C1917]">{transferNote}</strong>, sau đó nhấn nút xác nhận bên dưới.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-[#78716C] flex items-start gap-2 leading-relaxed bg-[#FAF8F5] border border-[#EBE7DF] rounded-2xl p-3.5">
              <svg className="w-4 h-4 text-[#14532D] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>
                Giao dịch được thực hiện trực tiếp qua cổng bảo mật VNPay Sandbox (Thẻ ATM, VNPay QR, Visa / Mastercard). SmaRes không lưu trữ số thẻ, mã CVV hay mật khẩu ngân hàng của quý khách.
              </span>
            </p>
          )}

          {/* Thông báo lỗi nghiệp vụ / lock conflict / thiếu cấu hình Sandbox */}
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
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 space-y-2.5">
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={isProcessing || isReleasing || isExpired}
            className="w-full bg-[#14532D] hover:bg-[#15803D] text-white font-semibold py-3.5 rounded-xl shadow-[0_8px_20px_-4px_rgba(20,83,45,0.4)] text-sm sm:text-base transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isProcessing ? (
              <span>
                {selectedMethod === 'BANK_QR'
                  ? 'Đang ghi nhận giao dịch cọc...'
                  : 'Đang khởi tạo cổng VNPay Sandbox...'}
              </span>
            ) : selectedMethod === 'BANK_QR' ? (
              <>
                <span>Tôi Đã Chuyển Khoản Xong ({formatMoney(depositAmount)})</span>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </>
            ) : (
              <>
                <span>Thanh Toán Cọc {formatMoney(depositAmount)} Qua VNPay Sandbox</span>
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
