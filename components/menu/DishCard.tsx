"use client";

import React from 'react';
import { MenuItemData } from '@/app/lib/menuInitialData';

export interface DishCardProps {
  dish: MenuItemData;
  badge_reason?: string;
  onAddToCart?: (dish: MenuItemData) => void;
  onCustomize?: (dish: MenuItemData) => void;
  cartQuantity?: number;
  hasActiveBooking?: boolean;
}

export default function DishCard({
  dish,
  badge_reason,
  onAddToCart,
  onCustomize,
  cartQuantity = 0,
  hasActiveBooking = false,
}: DishCardProps) {
  const formatMoney = (val: number) => {
    return val.toLocaleString('vi-VN') + 'đ';
  };

  const isSpecialLocked = dish.isPreOrderOnly && !hasActiveBooking;

  return (
    <div
      className={`group bg-white rounded-2xl border overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] hover:shadow-[0_16px_32px_-4px_rgba(28,25,23,0.12)] hover:-translate-y-1 ${
        dish.isPreOrderOnly
          ? 'border-[#fcd34d] ring-1 ring-[#fef3c7] bg-gradient-to-b from-[#fffbeb]/40 to-white'
          : 'border-[#ebe7df] hover:border-[#14532d]/40'
      }`}
    >
      {/* Khung ảnh món ăn */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
        <img
          src={dish.imageUrl}
          alt={dish.name}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
        />

        {/* Badge món đặc quyền đặt trước */}
        {dish.isPreOrderOnly && (
          <div className="absolute top-3 left-3 bg-[#b45309]/95 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 backdrop-blur-xs border border-[#fbbf24]/40">
            <svg className="w-3 h-3 text-[#fef3c7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
            </svg>
            <span>Món Đặc Quyền Đặt Trước</span>
          </div>
        )}

        {/* Badge số lượng đã chọn trong giỏ */}
        {cartQuantity > 0 && (
          <div className="absolute top-3 right-3 bg-[#14532d] text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-emerald-400/30">
            <svg className="w-3 h-3 text-emerald-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Đã chọn: {cartQuantity}</span>
          </div>
        )}
      </div>

      {/* Nội dung thông tin món ăn */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Hàng tiêu đề và giá tiền */}
          <div className="flex justify-between items-start gap-3 mb-1.5">
            <h3 className="font-serif font-bold text-base md:text-lg text-[#1c1917] leading-snug group-hover:text-[#14532d] transition-colors line-clamp-1">
              {dish.name}
            </h3>
            <span className="text-[#d97706] font-serif font-bold whitespace-nowrap text-base tracking-tight">
              {formatMoney(dish.price)}
            </span>
          </div>

          {/* TK-158: Tag/Badge nổi bật hiển thị "Lý do gợi ý tương đồng ngữ nghĩa" */}
          {badge_reason && (
            <div className="my-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#fffbeb] text-[#92400e] border border-[#fde68a] shadow-xs animate-fadeIn">
                <svg className="w-3 h-3 text-[#d97706] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
                  <path d="M9 18h6"></path>
                  <path d="M10 22h4"></path>
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
              <svg className="w-3.5 h-3.5 text-[#d97706] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span className="line-clamp-1">{dish.preparationNote}</span>
            </div>
          )}
        </div>

        {/* Nút hành động */}
        <div className="pt-2">
          {isSpecialLocked ? (
            <button
              type="button"
              onClick={() => onAddToCart?.(dish)}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-[#92400e] bg-[#fffbeb] hover:bg-[#fef3c7] border border-[#fcd34d] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <svg className="w-3.5 h-3.5 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
              </svg>
              <span>Món đặc biệt — Cần đặt bàn trước</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => (onCustomize ? onCustomize(dish) : onAddToCart?.(dish))}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.99] ${
                dish.isPreOrderOnly
                  ? 'bg-[#d97706] hover:bg-[#b45309] text-white shadow-sm'
                  : 'bg-[#14532d] hover:bg-[#15803d] text-white shadow-sm'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Tùy biến &amp; Thêm món</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
