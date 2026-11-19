"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';

export interface CallWaiterModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string;
  onSuccess?: (reason: string) => void;
}

type WaiterReasonId = 'water-ice' | 'bill' | 'cutlery' | 'other';

interface WaiterReasonOption {
  id: WaiterReasonId;
  label: string;
  desc: string;
}

const WAITER_REASONS: readonly WaiterReasonOption[] = [
  { id: 'water-ice', label: 'Xin thêm nước / đá lạnh', desc: 'Thêm ca nước lọc hoặc xô đá' },
  { id: 'bill', label: 'Gọi tính tiền / Xuất hóa đơn', desc: 'Thanh toán tiền mặt hoặc chuyển khoản' },
  { id: 'cutlery', label: 'Thêm bát đũa / Khăn lạnh', desc: 'Dụng cụ ăn uống hoặc khăn giấy' },
  { id: 'other', label: 'Hỗ trợ khác tại bàn', desc: 'Nhân viên phục vụ hỗ trợ trực tiếp' },
];

function ReasonIcon({ id }: { id: WaiterReasonId }) {
  switch (id) {
    case 'water-ice':
      return (
        <svg className="w-5 h-5 text-[#14532d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      );
    case 'bill':
      return (
        <svg className="w-5 h-5 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      );
    case 'cutlery':
      return (
        <svg className="w-5 h-5 text-[#14532d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        </svg>
      );
    case 'other':
      return (
        <svg className="w-5 h-5 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
  }
}

export default function CallWaiterModal({
  isOpen,
  onClose,
  tableNumber,
  onSuccess,
}: CallWaiterModalProps) {
  const { showToast } = useToast();
  const [selectedReason, setSelectedReason] = useState<string>(WAITER_REASONS[0].label);
  const [extraNotes, setExtraNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setErrorMessage('');
    setSubmitSuccess(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/waiter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber,
          reason: selectedReason,
          notes: extraNotes.trim(),
        }),
      });

      let json: { success?: boolean; message?: string } = {};
      try {
        json = (await res.json()) as { success?: boolean; message?: string };
      } catch {
        json = {};
      }

      if (res.ok && json.success) {
        setSubmitSuccess(true);
        showToast(
          json.message || `Đã gửi yêu cầu "${selectedReason}" cho Bàn ${tableNumber}!`,
          'success'
        );
        onSuccess?.(selectedReason);
        closeTimerRef.current = setTimeout(() => {
          setSubmitSuccess(false);
          onClose();
        }, 1800);
      } else {
        const msg =
          json.message || 'Không thể gửi yêu cầu gọi nhân viên lúc này. Vui lòng thử lại.';
        setErrorMessage(msg);
        showToast(msg, 'error');
      }
    } catch (err) {
      console.error('Lỗi khi gọi nhân viên:', err);
      const msg =
        'Mất kết nối máy chủ. Không thể gửi yêu cầu lúc này, vui lòng thử lại hoặc báo trực tiếp nhân viên.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#1c1917]/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-waiter-modal-title"
    >
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={handleClose} aria-hidden="true" />

      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#ebe7df] overflow-hidden z-10 animate-slideUp">
        {/* Header */}
        <div className="bg-[#14532d] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-[#d97706] text-white flex items-center justify-center shadow-sm">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </span>
            <div>
              <h3 id="call-waiter-modal-title" className="font-serif font-bold text-base leading-tight">
                Gọi Nhân Viên Phục Vụ
              </h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                Đang yêu cầu phục vụ cho{' '}
                <strong className="text-[#fbbf24]">Bàn số {tableNumber}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-[#0f4c3a] hover:bg-[#15803d] text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {submitSuccess ? (
          <div className="p-8 text-center animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-[#dcfce7] text-[#14532d] flex items-center justify-center mx-auto mb-3 border border-[#86efac]">
              <svg
                className="w-8 h-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h4 className="font-serif font-bold text-lg text-[#1c1917] mb-1">
              Đã gửi yêu cầu thành công!
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Nhân viên phục vụ của SmaRes đang di chuyển tới{' '}
              <strong className="text-[#1c1917]">Bàn {tableNumber}</strong> để hỗ trợ bạn ngay.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Inline Error Alert */}
            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium flex items-start gap-2"
              >
                <svg
                  className="w-4 h-4 text-rose-600 shrink-0 mt-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Lựa chọn lý do gọi phục vụ */}
            <div>
              <label className="block text-xs font-bold text-[#1c1917] mb-2">
                Chọn nhu cầu hỗ trợ nhanh:
              </label>
              <div className="space-y-2">
                {WAITER_REASONS.map((r) => {
                  const isSelected = selectedReason === r.label;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setSelectedReason(r.label);
                        if (errorMessage) setErrorMessage('');
                      }}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#14532d] bg-[#f0fdf4] ring-2 ring-[#14532d]/15'
                          : 'border-[#ebe7df] hover:border-[#d6d0c4] bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg bg-[#faf8f5] border border-[#ebe7df] flex items-center justify-center shrink-0">
                          <ReasonIcon id={r.id} />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[#1c1917]">{r.label}</p>
                          <p className="text-[11px] text-stone-500">{r.desc}</p>
                        </div>
                      </div>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-[#14532d] bg-[#14532d] text-white'
                            : 'border-stone-300'
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-2.5 h-2.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ghi chú thêm nếu có */}
            <div>
              <label
                htmlFor="call-waiter-notes"
                className="block text-xs font-bold text-[#1c1917] mb-1"
              >
                Ghi chú chi tiết (nếu có):
              </label>
              <input
                id="call-waiter-notes"
                type="text"
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                placeholder="VD: Cần 2 ly đá, muốn chia đôi hóa đơn..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6d0c4] text-xs focus:border-[#14532d] focus:ring-2 focus:ring-[#14532d]/20 focus:outline-none placeholder:text-stone-400 text-[#1c1917] bg-[#faf8f5] focus:bg-white"
              />
            </div>

            {/* Nút hành động */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="py-3 px-4 rounded-xl border border-[#d6d0c4] text-xs font-semibold text-stone-600 hover:bg-[#f5f2eb] transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl bg-[#14532d] hover:bg-[#15803d] disabled:bg-emerald-700/60 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span>
                  {isSubmitting ? 'Đang gửi...' : `Xác nhận gọi phục vụ (Bàn ${tableNumber})`}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
