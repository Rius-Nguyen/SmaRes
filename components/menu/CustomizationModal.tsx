"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { MenuItemData } from '@/app/lib/menuInitialData';
import { formatMoney } from '@/app/lib/format';
import {
  type DrinkLevelOption,
  type ItemCustomizations,
  type SpicyLevelOption,
} from '@/app/lib/cartHelpers';

export interface CustomizationModalProps {
  dish: MenuItemData | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dish: MenuItemData, customizations: ItemCustomizations, quantity: number) => void;
}

interface SpicyOption {
  readonly id: SpicyLevelOption;
  readonly label: string;
  readonly desc: string;
  readonly heatBars: number;
}

const SPICY_OPTIONS: readonly SpicyOption[] = [
  { id: 'NONE', label: 'Không cay', desc: 'Nguyên vị thanh', heatBars: 0 },
  { id: 'MILD', label: 'Cay nhẹ', desc: 'Thơm the vừa', heatBars: 1 },
  { id: 'MEDIUM', label: 'Cay vừa', desc: 'Đậm đà chuẩn vị', heatBars: 2 },
  { id: 'HOT', label: 'Cay nhiều', desc: 'Nồng đậm kích thích', heatBars: 3 },
] as const;

const DRINK_LEVEL_OPTIONS: readonly DrinkLevelOption[] = ['0%', '50%', '100%'] as const;

function SpiceIndicator({ bars }: { bars: number }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3].map((step) => (
        <span
          key={step}
          className={`w-1.5 h-3 rounded-full transition-colors ${
            step <= bars ? 'bg-[#D97706]' : 'bg-[#EBE7DF]'
          }`}
        />
      ))}
    </span>
  );
}

function CustomizationModalContent({
  dish,
  onClose,
  onConfirm,
}: {
  dish: MenuItemData;
  onClose: () => void;
  onConfirm: (dish: MenuItemData, customizations: ItemCustomizations, quantity: number) => void;
}): React.JSX.Element {
  const [spicyLevel, setSpicyLevel] = useState<SpicyLevelOption>('NONE');
  const [iceLevel, setIceLevel] = useState<DrinkLevelOption>('100%');
  const [sweetnessLevel, setSweetnessLevel] = useState<DrinkLevelOption>('100%');
  const [allergyNotes, setAllergyNotes] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isBeverage = dish.category === 'Đồ uống';
  const isDessert = dish.category === 'Tráng miệng';
  const isDrinkOrSweet = isBeverage || isDessert;

  const handleConfirm = () => {
    const trimmedNotes = allergyNotes.trim();
    const customizations: ItemCustomizations = {
      spicy_level: isDrinkOrSweet ? 'NONE' : spicyLevel,
      allergy_notes: trimmedNotes,
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Tùy biến món ${dish.name}`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#1C1917]/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative bg-[#FFFFFF] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#EBE7DF] overflow-hidden max-h-[90vh] flex flex-col z-10 animate-slideUp">
        {/* Header với ảnh món & nút đóng */}
        <div className="relative h-32 sm:h-36 bg-[#F5F2EB] overflow-hidden">
          <Image
            src={dish.imageUrl || '/foods/hero-bg2.jpg'}
            alt={dish.name}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, 448px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/85 via-[#1C1917]/40 to-transparent" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#1C1917]/60 hover:bg-[#1C1917]/80 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="absolute bottom-3 left-4 right-4 text-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#FDE68A] bg-[#14532D]/85 border border-[#D97706]/40 px-2.5 py-0.5 rounded-full inline-block mb-1">
              {dish.category}
            </span>
            <h3 className="font-serif font-bold text-base sm:text-lg leading-tight line-clamp-1">
              {dish.name}
            </h3>
            <p className="text-[#FBBF24] font-bold text-sm mt-0.5">
              {formatMoney(dish.price)}
            </p>
          </div>
        </div>

        {/* Nội dung cuộn: Tùy biến món */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-[#FAF8F5]">
          {/* 1. Chọn Cấp độ cay (Spicy Level) - Chỉ hiển thị cho món mặn (không áp dụng đồ uống & tráng miệng) */}
          {!isBeverage && !isDessert && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#1C1917] flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#D97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c.5 3.5 3 5.5 3 9a3 3 0 1 1-6 0c0-1.5.5-2.8 1.5-4-.5 1.8.5 2.5 1.5 2.5-.5-2 0-4.5 0-7.5Z" />
                  </svg>
                  <span>Độ cay (Spicy Level)</span>
                </label>
                <span className="text-[11px] text-[#78716C] font-medium">Bắt buộc</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SPICY_OPTIONS.map((opt) => {
                  const isSelected = spicyLevel === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSpicyLevel(opt.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#14532D] bg-[#F0FDF4] ring-2 ring-[#14532D]/20'
                          : 'border-[#EBE7DF] hover:border-[#D6D0C4] bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#1C1917]">{opt.label}</span>
                        <SpiceIndicator bars={opt.heatBars} />
                      </div>
                      <p className="text-[10px] text-[#57534E] mt-0.5">{opt.desc}</p>
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
                <label className="text-xs font-bold text-[#1C1917] flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#14532D]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="4" y="4" width="16" height="16" rx="3" />
                    <path strokeLinecap="round" d="M8 9h8M9 14h6" />
                  </svg>
                  <span>Lượng đá (Ice Level)</span>
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DRINK_LEVEL_OPTIONS.map((lvl) => {
                  const isSelected = iceLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setIceLevel(lvl)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#14532D] bg-[#F0FDF4] text-[#14532D] ring-2 ring-[#14532D]/20'
                          : 'border-[#EBE7DF] hover:border-[#D6D0C4] text-[#57534E] bg-white'
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
                <label className="text-xs font-bold text-[#1C1917] flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#D97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5c3.5 4.2 5.5 7.4 5.5 10.5a5.5 5.5 0 1 1-11 0c0-3.1 2-6.3 5.5-10.5Z" />
                  </svg>
                  <span>Độ ngọt (Sweetness Level)</span>
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DRINK_LEVEL_OPTIONS.map((lvl) => {
                  const isSelected = sweetnessLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSweetnessLevel(lvl)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#14532D] bg-[#F0FDF4] text-[#14532D] ring-2 ring-[#14532D]/20'
                          : 'border-[#EBE7DF] hover:border-[#D6D0C4] text-[#57534E] bg-white'
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
            <label
              htmlFor="customization-allergy-notes"
              className="text-xs font-bold text-[#1C1917] mb-1.5 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-[#D97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m12 3.5-8.5 15h17L12 3.5Z" />
                <path strokeLinecap="round" d="M12 10v3.5" />
                <circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none" />
              </svg>
              <span>Ghi chú dị ứng / Yêu cầu cho bếp</span>
            </label>
            <textarea
              id="customization-allergy-notes"
              rows={2}
              value={allergyNotes}
              onChange={(e) => setAllergyNotes(e.target.value)}
              placeholder="VD: Dị ứng đậu phộng, không ăn hành tây, ít tiêu..."
              className="w-full p-2.5 rounded-xl border border-[#D6D0C4] text-xs focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/20 focus:outline-none resize-none placeholder:text-[#78716C] text-[#1C1917] bg-white"
            />
          </div>

          {/* 5. Bộ chọn Số lượng */}
          <div className="flex items-center justify-between pt-2 border-t border-[#EBE7DF]">
            <span className="text-xs font-bold text-[#1C1917]">Số lượng phần:</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Giảm số lượng"
                className="w-8 h-8 rounded-lg border border-[#D6D0C4] bg-white flex items-center justify-center font-bold text-[#1C1917] hover:bg-[#F5F2EB] disabled:opacity-40 cursor-pointer"
              >
                -
              </button>
              <span className="font-bold text-sm text-[#1C1917] w-6 text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Tăng số lượng"
                className="w-8 h-8 rounded-lg border border-[#D6D0C4] bg-white flex items-center justify-center font-bold text-[#1C1917] hover:bg-[#F5F2EB] cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Footer: Tổng tiền & Nút xác nhận */}
        <div className="p-4 sm:p-5 bg-[#FFFFFF] border-t border-[#EBE7DF] flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-[#78716C]">Tạm tính</p>
            <p className="text-base font-bold text-[#D97706]">
              {formatMoney(dish.price * quantity)}
            </p>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-xl bg-[#14532D] hover:bg-[#0F4C3A] text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer text-center active:scale-95"
          >
            Thêm vào giỏ hàng
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomizationModal({
  dish,
  isOpen,
  onClose,
  onConfirm,
}: CustomizationModalProps) {
  if (!isOpen || !dish) return null;

  return (
    <CustomizationModalContent
      key={dish._id}
      dish={dish}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
