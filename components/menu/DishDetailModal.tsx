"use client";

import React, { useEffect } from 'react';
import Image from 'next/image';
import { formatMoney } from '@/app/lib/format';
import { MenuItemData } from '@/app/lib/menuInitialData';

export interface DishDetailModalProps {
  dish: MenuItemData | null;
  isOpen?: boolean;
  onClose: () => void;
  cartQuantity?: number;
  hasActiveBooking?: boolean;
  specialLockedReason?: string;
  actionLabel?: string;
  onAddToCart?: (dish: MenuItemData) => void;
  onCustomize?: (dish: MenuItemData) => void;
  onIncrement?: (dish: MenuItemData) => void;
  onDecrement?: (dish: MenuItemData) => void;
}

export default function DishDetailModal({
  dish,
  isOpen = true,
  onClose,
  cartQuantity = 0,
  hasActiveBooking = false,
  specialLockedReason,
  actionLabel,
  onAddToCart,
  onCustomize,
  onIncrement,
  onDecrement,
}: DishDetailModalProps) {
  useEffect(() => {
    if (!isOpen || !dish) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dish, onClose]);

  if (!isOpen || !dish) return null;

  const isSoldOut = dish.isAvailable === false;
  const isSpecialLocked = !isSoldOut && Boolean(dish.isPreOrderOnly) && !hasActiveBooking;
  const imageSrc = dish.imageUrl?.trim() || '/foods/pho_bo2.jpg';
  const isExternalOrData =
    imageSrc.startsWith('http://') ||
    imageSrc.startsWith('https://') ||
    imageSrc.startsWith('data:');

  const resolvedActionLabel =
    actionLabel || (onCustomize ? 'Tùy biến & Thêm món' : 'Thêm vào thực đơn');

  const handlePrimaryAction = () => {
    if (isSoldOut) return;
    if (isSpecialLocked) {
      onClose();
      onAddToCart?.(dish);
      return;
    }
    if (onCustomize) {
      onClose();
      onCustomize(dish);
      return;
    }
    onAddToCart?.(dish);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1917]/65 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dish-detail-modal-title"
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#ebe7df] animate-scaleUp max-h-[90vh] flex flex-col">
        {/* Khung ảnh món ăn */}
        <div className="relative aspect-[16/10] w-full bg-stone-100 shrink-0">
          <Image
            src={imageSrc}
            alt={dish.name}
            fill
            sizes="(max-width: 640px) 100vw, 512px"
            unoptimized={isExternalOrData}
            className={`object-cover ${isSoldOut ? 'grayscale opacity-75' : ''}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/20 pointer-events-none" />

          {/* Badge danh mục / đặc quyền góc trên trái */}
          {dish.isPreOrderOnly ? (
            <div className="absolute top-3.5 left-3.5 bg-[#b45309]/95 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 border border-[#fbbf24]/50">
              <svg
                className="w-3.5 h-3.5 text-[#fef3c7]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
              </svg>
              <span>Món Đặc Quyền Đặt Trước</span>
            </div>
          ) : (
            <div className="absolute top-3.5 left-3.5 bg-[#1c1917]/80 text-[#faf8f5] text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-xs">
              {dish.category}
            </div>
          )}

          {/* Badge số lượng đã chọn ở góc dưới bên phải */}
          {cartQuantity > 0 && (
            <div className="absolute bottom-3.5 right-3.5 bg-[#155e42]/95 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 border border-white/80">
              <svg
                className="w-3 h-3 text-emerald-200"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Đã chọn: {cartQuantity}</span>
            </div>
          )}

          {/* Nút đóng */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết món ăn"
            className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-[#1c1917] shadow-md border border-[#ebe7df] flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Nội dung chi tiết đầy đủ */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div>
            <h3
              id="dish-detail-modal-title"
              className="font-serif text-xl sm:text-2xl font-bold text-[#1c1917] leading-snug"
            >
              {dish.name}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
              <span
                className={`font-serif text-lg sm:text-xl font-bold ${
                  isSoldOut ? 'text-stone-400 line-through' : 'text-[#d97706]'
                }`}
              >
                {formatMoney(dish.price)}
              </span>
              {isSoldOut ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                  Tạm hết món
                </span>
              ) : (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#f0fdf4] text-[#155e42] border border-[#bbf7d0]">
                  {dish.category}
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
            {dish.description}
          </p>

          {dish.preparationNote && (
            <div className="text-xs sm:text-sm text-[#92400e] bg-[#fffbeb] p-3.5 rounded-2xl border border-[#fde68a] flex items-start gap-2.5 font-medium leading-relaxed">
              <svg
                className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{dish.preparationNote}</span>
            </div>
          )}

          {isSpecialLocked && (
            <div className="text-xs text-[#92400e] bg-[#fef3c7]/60 border border-[#fcd34d] rounded-xl px-3.5 py-2.5 leading-relaxed">
              {specialLockedReason ||
                'Món đặc quyền chế biến công phu chỉ mở khóa khi đặt bàn trước giờ hẹn tối thiểu 5 tiếng.'}
            </div>
          )}
        </div>

        {/* Footer hành động */}
        <div className="px-6 pb-6 pt-3 border-t border-[#ebe7df] bg-[#faf8f5] shrink-0">
          {isSoldOut ? (
            <button
              type="button"
              disabled
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-stone-500 bg-stone-100 border border-stone-200 cursor-not-allowed"
            >
              Tạm hết món
            </button>
          ) : isSpecialLocked ? (
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-[#92400e] bg-[#fef3c7] hover:bg-[#fde68a] border border-[#fcd34d] transition-colors cursor-pointer"
            >
              Đặt bàn trước từ 5 tiếng để mở khóa
            </button>
          ) : onIncrement && onDecrement && cartQuantity > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center justify-between bg-[#f0fdf4] rounded-xl p-1.5 border border-[#bbf7d0] flex-1">
                <button
                  type="button"
                  onClick={() => onDecrement(dish)}
                  aria-label={`Giảm số lượng ${dish.name}`}
                  className="w-10 h-10 rounded-lg bg-white text-[#155e42] font-bold shadow-xs hover:bg-stone-100 flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <span className="font-bold text-sm text-[#155e42] px-3">
                  {cartQuantity} phần
                </span>
                <button
                  type="button"
                  onClick={() => onIncrement(dish)}
                  aria-label={`Tăng số lượng ${dish.name}`}
                  className="w-10 h-10 rounded-lg bg-[#155e42] text-white font-bold shadow-xs hover:bg-[#0e3f2d] flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-xl bg-white border border-[#d6d0c4] text-sm font-semibold text-[#1c1917] hover:bg-[#f5f2eb] cursor-pointer"
              >
                Xong
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePrimaryAction}
              className={`w-full py-3 px-4 rounded-xl text-sm font-bold text-white shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                dish.isPreOrderOnly
                  ? 'bg-[#d97706] hover:bg-[#b45309]'
                  : 'bg-[#155e42] hover:bg-[#0e3f2d]'
              }`}
            >
              <span>+ {resolvedActionLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
