"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { formatMoney } from '@/app/lib/format';
import { MenuItemData } from '@/app/lib/menuInitialData';

export interface DishCardProps {
  dish: MenuItemData;
  badge_reason?: string;
  onAddToCart?: (dish: MenuItemData) => void;
  onCustomize?: (dish: MenuItemData) => void;
  onIncrement?: (dish: MenuItemData) => void;
  onDecrement?: (dish: MenuItemData) => void;
  cartQuantity?: number;
  hasActiveBooking?: boolean;
  actionLabel?: string;
  variant?: 'default' | 'compact';
  isSoldOut?: boolean;
  showCategoryBadge?: boolean;
}

export default function DishCard({
  dish,
  badge_reason,
  onAddToCart,
  onCustomize,
  onIncrement,
  onDecrement,
  cartQuantity = 0,
  hasActiveBooking = false,
  actionLabel,
  variant = 'default',
  isSoldOut: isSoldOutProp,
  showCategoryBadge = false,
}: DishCardProps) {
  const isSoldOut = isSoldOutProp ?? dish.isAvailable === false;
  const isSpecialLocked = !isSoldOut && Boolean(dish.isPreOrderOnly) && !hasActiveBooking;
  const isCompact = variant === 'compact';

  const [justAdded, setJustAdded] = useState(false);
  const popTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (popTimerRef.current) {
        clearTimeout(popTimerRef.current);
      }
    };
  }, []);

  const imageSrc = dish.imageUrl?.trim() || '/foods/pho_bo2.jpg';
  const isExternalOrData =
    imageSrc.startsWith('http://') ||
    imageSrc.startsWith('https://') ||
    imageSrc.startsWith('data:');

  const triggerAddFeedback = () => {
    setJustAdded(true);
    if (popTimerRef.current) {
      clearTimeout(popTimerRef.current);
    }
    popTimerRef.current = setTimeout(() => {
      setJustAdded(false);
    }, 850);
  };

  const handlePrimaryAction = () => {
    if (isSoldOut) return;
    if (isSpecialLocked) {
      onAddToCart?.(dish);
      return;
    }
    if (onCustomize) {
      onCustomize(dish);
      triggerAddFeedback();
      return;
    }
    onAddToCart?.(dish);
    triggerAddFeedback();
  };

  const resolvedActionLabel =
    actionLabel || (onCustomize ? 'Tùy biến & Thêm món' : 'Thêm vào giỏ hàng');

  return (
    <div
      className={`interactive-card group bg-white rounded-2xl border overflow-hidden flex flex-col justify-between shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] ${
        isSoldOut
          ? 'border-[#e2e8e4] opacity-90'
          : dish.isPreOrderOnly
          ? 'border-[#fcd34d] ring-1 ring-[#fef3c7] bg-gradient-to-b from-[#fffbeb]/40 to-white hover:shadow-[0_16px_32px_-4px_rgba(28,25,23,0.12)]'
          : 'border-[#e2e8e4] hover:border-[#155e42]/40 hover:shadow-[0_16px_32px_-4px_rgba(21,94,66,0.12)]'
      }`}
    >
      {/* Khung ảnh món ăn */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
        <Image
          src={imageSrc}
          alt={dish.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized={isExternalOrData}
          className={`card-zoom-img object-cover ${
            isSoldOut ? 'grayscale opacity-70 scale-[1.01]' : ''
          }`}
        />

        {/* Lớp phủ kính mờ xám khi món tạm hết */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-stone-900/45 backdrop-blur-[2px] flex items-center justify-center p-4 z-10">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1c1917]/90 text-[#f4f7f5] text-xs font-bold tracking-wide border border-white/20 shadow-lg">
              <svg
                className="w-3.5 h-3.5 text-[#fbbf24]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m4.9 4.9 14.2 14.2" />
              </svg>
              <span>Tạm hết món</span>
            </span>
          </div>
        )}

        {/* Badge món đặc quyền đặt trước hoặc danh mục */}
        {dish.isPreOrderOnly ? (
          <div className="absolute top-3 left-3 z-20 bg-[#b45309]/95 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 backdrop-blur-xs border border-[#fbbf24]/40">
            <svg
              className="w-3 h-3 text-[#fef3c7]"
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
          showCategoryBadge && (
            <div className="absolute top-3 left-3 z-20 bg-[#1c1917]/75 text-[#f4f7f5] text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-xs">
              {dish.category}
            </div>
          )
        )}

        {/* Badge số lượng đã chọn trong giỏ */}
        {cartQuantity > 0 && (
          <div
            key={cartQuantity}
            className="animate-cart-pop absolute top-3 right-3 z-20 bg-[#155e42] text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-emerald-400/30"
          >
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
      </div>

      {/* Nội dung thông tin món ăn */}
      <div className={`${isCompact ? 'p-4' : 'p-5'} flex-1 flex flex-col justify-between`}>
        <div>
          {/* Hàng tiêu đề và giá tiền */}
          <div className="flex justify-between items-start gap-3 mb-1.5">
            <h3
              className={`font-serif font-bold ${
                isCompact ? 'text-base' : 'text-base md:text-lg'
              } leading-snug transition-colors line-clamp-2 ${
                isSoldOut
                  ? 'text-stone-500'
                  : 'text-[#1c1917] group-hover:text-[#155e42]'
              }`}
            >
              {dish.name}
            </h3>
            <span
              className={`font-serif font-bold whitespace-nowrap text-base tracking-tight ${
                isSoldOut ? 'text-stone-400 line-through' : 'text-[#d97706]'
              }`}
            >
              {formatMoney(dish.price)}
            </span>
          </div>

          {/* Tag/Badge hiển thị lý do gợi ý tương đồng ngữ nghĩa */}
          {badge_reason && (
            <div className="my-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#fffbeb] text-[#92400e] border border-[#fde68a] shadow-xs animate-fadeIn">
                <svg
                  className="w-3 h-3 text-[#d97706] shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                </svg>
                <span className="line-clamp-1">{badge_reason}</span>
              </span>
            </div>
          )}

          {/* Mô tả món ăn */}
          <p className="text-stone-600 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-3">
            {dish.description}
          </p>

          {/* Note chuẩn bị món */}
          {dish.preparationNote && (
            <div className="mb-4 text-[11px] text-[#92400e] bg-[#fffbeb] p-2 rounded-lg border border-[#fde68a] flex items-center gap-1.5 font-medium">
              <svg
                className="w-3.5 h-3.5 text-[#d97706] shrink-0"
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
              <span className="line-clamp-1">{dish.preparationNote}</span>
            </div>
          )}
        </div>

        {/* Nút hành động */}
        <div className="pt-2">
          {isSoldOut ? (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-stone-500 bg-stone-100 border border-stone-200 flex items-center justify-center gap-1.5 cursor-not-allowed"
            >
              <svg
                className="w-3.5 h-3.5 text-stone-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m4.9 4.9 14.2 14.2" />
              </svg>
              <span>Tạm hết món</span>
            </button>
          ) : isSpecialLocked ? (
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="interactive-btn w-full py-2.5 px-4 rounded-xl text-xs font-bold text-[#92400e] bg-[#fffbeb] hover:bg-[#fef3c7] border border-[#fcd34d] flex items-center justify-center gap-1.5 shadow-xs"
            >
              <svg
                className="w-3.5 h-3.5 text-[#d97706]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
              </svg>
              <span>Món đặc biệt — Cần đặt bàn trước</span>
            </button>
          ) : onIncrement && onDecrement && cartQuantity > 0 ? (
            <div className="w-full flex items-center justify-between bg-[#f0fdf4] rounded-xl p-1.5 border border-[#bbf7d0]">
              <button
                type="button"
                onClick={() => {
                  onDecrement(dish);
                  triggerAddFeedback();
                }}
                aria-label={`Giảm số lượng ${dish.name}`}
                className="interactive-btn w-9 h-9 rounded-lg bg-white text-[#155e42] font-bold shadow-xs hover:bg-stone-100 flex items-center justify-center text-base"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <span
                key={cartQuantity}
                className="animate-cart-pop font-bold text-xs sm:text-sm text-[#155e42] px-3"
              >
                {cartQuantity} phần
              </span>
              <button
                type="button"
                onClick={() => {
                  onIncrement(dish);
                  triggerAddFeedback();
                }}
                aria-label={`Tăng số lượng ${dish.name}`}
                className="interactive-btn w-9 h-9 rounded-lg bg-[#155e42] text-white font-bold shadow-xs hover:bg-[#0e3f2d] flex items-center justify-center text-base"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePrimaryAction}
              className={`interactive-btn w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm ${
                justAdded
                  ? 'bg-[#0e3f2d] text-amber-200 animate-cart-pop ring-2 ring-[#155e42]/30'
                  : dish.isPreOrderOnly
                  ? 'bg-[#d97706] hover:bg-[#b45309] text-white'
                  : 'bg-[#155e42] hover:bg-[#0e3f2d] text-white'
              }`}
            >
              {justAdded ? (
                <>
                  <svg
                    className="w-4 h-4 text-amber-200"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Đã thêm vào giỏ</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>{resolvedActionLabel}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}