"use client";

import React from 'react';
import Link from 'next/link';
import { formatMoney } from '@/app/lib/format';
import { MenuItemData } from '@/app/lib/menuInitialData';
import { useAuthSession } from '@/app/lib/useAuthSession';

export interface SpecialDishModalProps {
  dish: MenuItemData | null;
  isOpen?: boolean;
  onClose: () => void;
  bookingHref?: string;
}

export default function SpecialDishModal({
  dish,
  isOpen = true,
  onClose,
  bookingHref = '/booking',
}: SpecialDishModalProps) {
  const { isAdmin } = useAuthSession();
  if (!isOpen || !dish) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1917]/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="special-dish-modal-title"
    >
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-[#ebe7df] animate-scaleUp">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng hộp thoại"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#faf8f5] hover:bg-[#f5f2eb] text-stone-500 hover:text-[#1c1917] border border-[#ebe7df] flex items-center justify-center transition-colors cursor-pointer"
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

        <div className="w-16 h-16 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center mx-auto mb-4 border border-[#fde68a]">
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
          </svg>
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-[#b45309] bg-[#fffbeb] px-3.5 py-1 rounded-full border border-[#fde68a] inline-block mb-2">
          Món Ăn Đặc Quyền
        </span>

        <h3
          id="special-dish-modal-title"
          className="text-xl font-serif font-bold text-[#1c1917] mb-1"
        >
          {dish.name}
        </h3>

        <p className="text-sm font-serif font-bold text-[#d97706] mb-3">
          {formatMoney(dish.price)}
        </p>

        <p className="text-xs text-stone-600 leading-relaxed mb-6">
          Món ăn này được bếp trưởng chế biến kỳ công với nguyên liệu tuyển chọn tươi sống.
          <strong className="text-[#1c1917]">
            {' '}
            Chỉ phục vụ khi quý khách đã hoàn tất đặt bàn trước.
          </strong>
        </p>

        <div className="space-y-2.5">
          {!isAdmin ? (
            <Link
              href={bookingHref}
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 w-full bg-[#14532d] hover:bg-[#15803d] text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-[0_8px_20px_-4px_rgba(20,83,45,0.4)] transition-all text-center"
            >
              <span>Đặt bàn ngay để mở khóa món này</span>
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <p className="text-xs font-medium text-amber-800 bg-[#fffbeb] border border-[#fde68a] rounded-xl px-3.5 py-2.5">
              Tài khoản Quản trị viên (Admin) không sử dụng chức năng đặt bàn.
            </p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="block w-full text-xs text-stone-500 hover:text-[#1c1917] font-semibold py-2 transition-colors cursor-pointer"
          >
            Xem các món khác
          </button>
        </div>
      </div>
    </div>
  );
}
