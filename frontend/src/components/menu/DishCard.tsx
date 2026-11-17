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
      className={`group bg-white rounded-2xl border overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-lg ${
        dish.isPreOrderOnly
          ? 'border-amber-300/80 ring-1 ring-amber-100 bg-gradient-to-b from-amber-50/20 to-white'
          : 'border-stone-200/90 hover:border-emerald-700/30'
      }`}
    >
      {/* Khung ảnh món ăn */}
      <div className="relative h-52 sm:h-56 w-full overflow-hidden bg-stone-100">
        <img
          src={dish.imageUrl}
          alt={dish.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Badge món đặc quyền đặt trước */}
        {dish.isPreOrderOnly && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 backdrop-blur-xs">
            <span>👑</span>
            <span>Món Đặc Quyền Đặt Trước</span>
          </div>
        )}

        {/* Badge số lượng đã chọn trong giỏ */}
        {cartQuantity > 0 && (
          <div className="absolute top-3 right-3 bg-emerald-700 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
            <span>✓</span>
            <span>Đã chọn: {cartQuantity}</span>
          </div>
        )}
      </div>

      {/* Nội dung thông tin món ăn */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Hàng tiêu đề và giá tiền */}
          <div className="flex justify-between items-start gap-3 mb-1.5">
            <h3 className="font-bold text-base md:text-lg text-stone-900 leading-snug group-hover:text-emerald-800 transition-colors line-clamp-1">
              {dish.name}
            </h3>
            <span className="text-emerald-700 font-bold whitespace-nowrap text-base tracking-tight">
              {formatMoney(dish.price)}
            </span>
          </div>

          {/* TK-158: Tag/Badge nổi bật hiển thị "Lý do gợi ý tương đồng ngữ nghĩa" */}
          {badge_reason && (
            <div className="my-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200/90 shadow-xs animate-fadeIn">
                <span className="text-amber-600 text-xs">💡</span>
                <span className="line-clamp-1">{badge_reason}</span>
              </span>
            </div>
          )}

          {/* Mô tả món ăn */}
          <p className="text-stone-500 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-3">
            {dish.description}
          </p>

          {/* Note chuẩn bị món */}
          {dish.preparationNote && (
            <div className="mb-4 text-[11px] text-amber-900 bg-amber-50/80 p-2 rounded-lg border border-amber-200/70 flex items-center gap-1.5 font-medium">
              <span>⏱️</span>
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
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>👑</span>
              <span>Món đặc biệt — Cần đặt bàn trước</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => (onCustomize ? onCustomize(dish) : onAddToCart?.(dish))}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                dish.isPreOrderOnly
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                  : 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm active:scale-[0.99]'
              }`}
            >
              <span>+</span>
              <span>Tùy biến & Thêm món</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
