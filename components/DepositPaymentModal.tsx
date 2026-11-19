"use client";

import React, { useState, useEffect } from 'react';

interface DepositPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingCode: string;
  depositAmount: number;
  onConfirmPayment: () => Promise<void> | void;
  isProcessing?: boolean;
}

export default function DepositPaymentModal({
  isOpen,
  onClose,
  bookingCode,
  depositAmount,
  onConfirmPayment,
  isProcessing = false,
}: DepositPaymentModalProps) {
  // Đồng hồ đếm ngược 10 phút (600 giây)
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(600);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const formatMoney = (val: number) => {
    return val.toLocaleString('vi-VN') + 'đ';
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(bookingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback nếu trình duyệt chặn clipboard API
      const input = document.createElement('input');
      input.value = bookingCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full border border-[#ebe7df] shadow-[0_20px_50px_rgba(28,25,23,0.18)] overflow-hidden flex flex-col my-auto">
        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#ebe7df] flex items-center justify-between bg-[#faf8f5]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#15803d] bg-[#f0fdf4] px-2.5 py-1 rounded-full border border-[#bbf7d0] inline-block mb-1">
              Thanh toán giữ bàn
            </span>
            <h3 className="text-xl font-serif font-bold text-[#1c1917]">
              Chuyển Khoản Đặt Cọc
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-9 h-9 rounded-full bg-white hover:bg-stone-100 border border-[#ebe7df] flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-center">
          {/* Đồng hồ đếm ngược */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#fffbeb] text-[#92400e] rounded-full border border-[#fde68a] text-xs font-semibold">
            <svg className="w-3.5 h-3.5 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>Thời gian giữ bàn còn lại:</span>
            <span className="font-mono font-bold text-sm text-[#b45309]">{formattedTime}</span>
          </div>

          {/* Ảnh QR ngân hàng thật */}
          <div className="bg-[#faf8f5] p-3 rounded-2xl border border-[#ebe7df] inline-block mx-auto shadow-xs">
            <img
              src="/img/bank_qr.jpg"
              alt="Mã QR Thanh toán tiền cọc"
              className="w-56 h-56 sm:w-60 sm:h-60 object-contain mx-auto rounded-xl"
            />
          </div>

          {/* Chi tiết số tiền & nội dung chuyển khoản */}
          <div className="bg-[#faf8f5] border border-[#ebe7df] rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#ebe7df]">
              <span className="text-xs text-stone-600 font-medium">Số tiền đặt cọc:</span>
              <span className="font-serif font-bold text-lg text-[#d97706]">
                {formatMoney(depositAmount)}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-stone-600 font-medium">Nội dung chuyển khoản (Bắt buộc):</span>
                {copied && (
                  <span className="text-[11px] font-bold text-[#15803d] animate-fade-in">
                    ✓ Đã sao chép!
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white border border-[#d6d0c4] rounded-xl px-3 py-2 font-mono font-bold text-[#14532d] text-base tracking-wider select-all">
                  {bookingCode}
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3.5 py-2 bg-[#14532d] hover:bg-[#15803d] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                  </svg>
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 italic leading-relaxed pt-1">
              * Quý khách vui lòng quét mã QR bằng App Ngân Hàng và kiểm tra đúng nội dung chuyển khoản là{' '}
              <strong className="text-stone-700 font-mono font-bold">{bookingCode}</strong> để hệ thống tự động đối soát giữ bàn.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-6 pt-0 space-y-2.5">
          <button
            type="button"
            onClick={onConfirmPayment}
            disabled={isProcessing}
            className="w-full bg-[#14532d] hover:bg-[#15803d] text-white font-semibold py-3.5 rounded-xl shadow-[0_8px_20px_-4px_rgba(20,83,45,0.4)] text-base transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isProcessing ? (
              <span>Đang xác nhận giao dịch...</span>
            ) : (
              <>
                <span>Tôi Đã Chuyển Khoản Xong</span>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full text-center py-2.5 text-xs sm:text-sm font-semibold text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
          >
            Thanh toán cọc sau tại quầy nhà hàng
          </button>
        </div>
      </div>
    </div>
  );
}
