"use client";

import React, { useState, useEffect } from 'react';
import { MenuItemData } from '@/app/lib/menuInitialData';
import { ItemCustomizations } from '@/app/context/CartContext';

export interface CustomizationModalProps {
  dish: MenuItemData | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dish: MenuItemData, customizations: ItemCustomizations, quantity: number) => void;
}

export default function CustomizationModal({
  dish,
  isOpen,
  onClose,
  onConfirm,
}: CustomizationModalProps) {
  // State tùy biến món (TK-160)
  const [spicyLevel, setSpicyLevel] = useState<'NONE' | 'MILD' | 'MEDIUM' | 'HOT'>('NONE');
  const [iceLevel, setIceLevel] = useState<'0%' | '50%' | '100%'>('100%');
  const [sweetnessLevel, setSweetnessLevel] = useState<'0%' | '50%' | '100%'>('100%');
  const [allergyNotes, setAllergyNotes] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // Reset state mỗi khi mở modal với món mới
  useEffect(() => {
    if (dish) {
      setSpicyLevel('NONE');
      setIceLevel('100%');
      setSweetnessLevel('100%');
      setAllergyNotes('');
      setQuantity(1);
    }
  }, [dish]);

  if (!isOpen || !dish) return null;

  const formatMoney = (val: number) => {
    return val.toLocaleString('vi-VN') + 'đ';
  };

  const isBeverage = dish.category === 'Đồ uống';
  const isDessert = dish.category === 'Tráng miệng';
  const isDrinkOrSweet = isBeverage || isDessert;

  const handleConfirm = () => {
    const customizations: ItemCustomizations = {
      spicy_level: spicyLevel,
      allergy_notes: allergyNotes.trim(),
    };

    if (isBeverage) {
      customizations.ice_level = iceLevel;
      customizations.sweetness_level = sweetnessLevel;
    } else if (isDessert) {
      customizations.sweetness_level = sweetnessLevel;
    }

    onConfirm(dish, customizations, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal / Drawer Card */}
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col z-10 animate-slideUp">
        {/* Header với ảnh món & nút đóng */}
        <div className="relative h-32 sm:h-36 bg-stone-100 overflow-hidden">
          <img
            src={dish.imageUrl}
            alt={dish.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Nút đóng */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors cursor-pointer text-sm"
            aria-label="Đóng"
          >
            ✕
          </button>

          <div className="absolute bottom-3 left-4 right-4 text-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-md inline-block mb-1">
              {dish.category}
            </span>
            <h3 className="font-bold text-base sm:text-lg leading-tight line-clamp-1">
              {dish.name}
            </h3>
            <p className="text-emerald-300 font-bold text-sm">
              {formatMoney(dish.price)}
            </p>
          </div>
        </div>

        {/* Nội dung cuộn: Tùy biến món */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* 1. Chọn Cấp độ cay (Spicy Level) - Phù hợp với món ăn */}
          {!isBeverage && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <span>🌶️</span>
                  <span>Độ cay (Spicy Level)</span>
                </label>
                <span className="text-[11px] text-stone-400 font-medium">Bắt buộc</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'NONE', label: 'Không cay', icon: '🥬', desc: 'Nguyên vị thanh' },
                  { id: 'MILD', label: 'Cay nhẹ', icon: '🌶️', desc: 'Thơm the vừa' },
                  { id: 'MEDIUM', label: 'Cay vừa', icon: '🌶️🌶️', desc: 'Đậm đà chuẩn vị' },
                  { id: 'HOT', label: 'Cay nhiều', icon: '🔥', desc: 'Nồng đậm kích thích' },
                ].map((opt) => {
                  const isSelected = spicyLevel === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSpicyLevel(opt.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-700 bg-emerald-50/80 ring-2 ring-emerald-700/20'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-800">{opt.label}</span>
                        <span className="text-sm">{opt.icon}</span>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-0.5">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Chọn Lượng đá (Ice Level) - Cho đồ uống */}
          {isBeverage && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <span>🧊</span>
                  <span>Lượng đá (Ice Level)</span>
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['0%', '50%', '100%'] as const).map((lvl) => {
                  const isSelected = iceLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setIceLevel(lvl)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-700/20'
                          : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-white'
                      }`}
                    >
                      {lvl === '0%' ? 'Không đá' : lvl === '50%' ? '50% đá' : '100% đá'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Chọn Độ ngọt (Sweetness Level) - Cho đồ uống & tráng miệng */}
          {isDrinkOrSweet && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <span>🍯</span>
                  <span>Độ ngọt (Sweetness Level)</span>
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['0%', '50%', '100%'] as const).map((lvl) => {
                  const isSelected = sweetnessLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSweetnessLevel(lvl)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-700/20'
                          : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-white'
                      }`}
                    >
                      {lvl === '0%' ? 'Không ngọt' : lvl === '50%' ? '50% ngọt' : 'Chuẩn vị'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Ghi chú Dị ứng & Yêu cầu đặc biệt (Allergy Notes) */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Ghi chú dị ứng / Yêu cầu cho bếp</span>
            </label>
            <textarea
              rows={2}
              value={allergyNotes}
              onChange={(e) => setAllergyNotes(e.target.value)}
              placeholder="VD: Dị ứng đậu phộng, không ăn hành tây, ít tiêu..."
              className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 focus:outline-none resize-none placeholder:text-stone-400 text-stone-800 bg-stone-50/60 focus:bg-white"
            />
          </div>

          {/* 5. Bộ chọn Số lượng */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-100">
            <span className="text-xs font-bold text-stone-800">Số lượng phần:</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded-lg border border-stone-200 flex items-center justify-center font-bold text-stone-600 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
              >
                -
              </button>
              <span className="font-bold text-sm text-stone-900 w-6 text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-lg border border-stone-200 flex items-center justify-center font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Footer: Tổng tiền & Nút xác nhận */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-stone-500">Tạm tính</p>
            <p className="text-base font-bold text-emerald-800">
              {formatMoney(dish.price * quantity)}
            </p>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer text-center active:scale-95"
          >
            Thêm vào giỏ hàng
          </button>
        </div>
      </div>
    </div>
  );
}
