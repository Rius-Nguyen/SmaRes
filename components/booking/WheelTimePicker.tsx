"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BOOKING_MIN_ADVANCE_MS,
  BOOKING_TIME_STEP_MINUTES,
  evaluateLateNightDiningNotice,
  getOperatingHoursForDate,
  isWithinOperatingHoursForDate,
  parseTimeToMinutes,
  parseVietnamDateTime,
} from '@/app/lib/reservationHelpers';

const ITEM_HEIGHT = 40;
const VISIBLE_ROWS = 5;
const SPACER_HEIGHT = ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2);

const HOURS = Array.from({ length: 15 }, (_, idx) => String(9 + idx).padStart(2, '0')); // 09..23
const MINUTES = ['00', '15', '30', '45'] as const;

export function isWithinOperatingHours(time: string, date?: string): boolean {
  if (date) {
    return isWithinOperatingHoursForDate(date, time);
  }
  const total = parseTimeToMinutes(time);
  if (Number.isNaN(total)) return false;
  return total >= 9 * 60 && total <= 23 * 60 && total % BOOKING_TIME_STEP_MINUTES === 0;
}

export function isSlotDisabledForDate(
  date: string,
  time: string,
  nowMs: number = Date.now()
): boolean {
  if (!isWithinOperatingHoursForDate(date, time)) {
    return true;
  }
  const slotMs = parseVietnamDateTime(date, time);
  if (Number.isNaN(slotMs)) {
    return false;
  }
  return slotMs < nowMs + BOOKING_MIN_ADVANCE_MS;
}

export function getAvailableSlotsForDate(
  date: string,
  nowMs: number = Date.now()
): string[] {
  const hours = getOperatingHoursForDate(date);
  const slots: string[] = [];
  for (let m = hours.openMinutes; m <= hours.closeMinutes; m += BOOKING_TIME_STEP_MINUTES) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    const slot = `${hh}:${mm}`;
    if (!isSlotDisabledForDate(date, slot, nowMs)) {
      slots.push(slot);
    }
  }
  return slots;
}

export function resolveNearestValidSlot(
  date: string,
  preferredTime: string,
  nowMs: number = Date.now()
): string {
  if (!isSlotDisabledForDate(date, preferredTime, nowMs)) {
    return preferredTime;
  }
  const available = getAvailableSlotsForDate(date, nowMs);
  if (available.length === 0) {
    return '';
  }
  const prefMinutes = parseTimeToMinutes(preferredTime);
  if (Number.isNaN(prefMinutes)) {
    return available[0];
  }
  const nextAfterPreferred = available.find((slot) => parseTimeToMinutes(slot) >= prefMinutes);
  return nextAfterPreferred ?? available[0];
}

export interface WheelTimePickerProps {
  id?: string;
  selectedDate: string;
  value: string;
  onChange: (nextTime: string) => void;
}

interface WheelColumnProps {
  label: string;
  options: ReadonlyArray<{ value: string; disabled: boolean }>;
  selectedValue: string;
  onSelect: (value: string) => void;
}

function WheelColumn({ label, options, selectedValue, onSelect }: WheelColumnProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<number | null>(null);
  const dragStateRef = useRef<{
    isDragging: boolean;
    startY: number;
    startScrollTop: number;
    moved: boolean;
  }>({
    isDragging: false,
    startY: 0,
    startScrollTop: 0,
    moved: false,
  });

  const selectedIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === selectedValue)
  );

  // Giữ vị trí cuộn đồng bộ khi selectedValue đổi từ bên ngoài (vd: đổi ngày hoặc click)
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const targetTop = selectedIndex * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - targetTop) > 2) {
      el.scrollTo({ top: targetTop, behavior: 'smooth' });
    }
  }, [selectedIndex]);

  const snapAndCommit = (el: HTMLDivElement) => {
    const rawIdx = Math.round(el.scrollTop / ITEM_HEIGHT);
    const clampedIdx = Math.max(0, Math.min(options.length - 1, rawIdx));
    let targetIdx = clampedIdx;

    if (options[targetIdx]?.disabled) {
      // Tìm option khả dụng gần nhất
      let bestIdx = -1;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < options.length; i += 1) {
        if (!options[i].disabled) {
          const dist = Math.abs(i - clampedIdx);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        }
      }
      if (bestIdx !== -1) {
        targetIdx = bestIdx;
      }
    }

    const finalTop = targetIdx * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - finalTop) > 1) {
      el.scrollTo({ top: finalTop, behavior: 'smooth' });
    }

    const chosen = options[targetIdx];
    if (chosen && !chosen.disabled && chosen.value !== selectedValue) {
      onSelect(chosen.value);
    }
  };

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    if (scrollTimerRef.current !== null) {
      window.clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = window.setTimeout(() => {
      snapAndCommit(el);
    }, 90);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = listRef.current;
    if (!el) return;
    dragStateRef.current = {
      isDragging: true,
      startY: e.clientY,
      startScrollTop: el.scrollTop,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.isDragging) return;
    const el = listRef.current;
    if (!el) return;
    const deltaY = e.clientY - dragStateRef.current.startY;
    if (Math.abs(deltaY) > 4) {
      dragStateRef.current.moved = true;
    }
    el.scrollTop = dragStateRef.current.startScrollTop - deltaY;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.isDragging) return;
    const el = listRef.current;
    dragStateRef.current.isDragging = false;
    if (el) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // Bỏ qua nếu pointer đã nhả
      }
      if (dragStateRef.current.moved) {
        snapAndCommit(el);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center">
      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
        {label}
      </span>
      <div className="relative w-full h-[200px] overflow-hidden rounded-xl bg-[#FAF8F5] border border-[#E2E8E4]">
        {/* Thanh highlight trung tâm */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1.5 right-1.5 top-1/2 -translate-y-1/2 h-[40px] rounded-lg bg-[#F0FDF4] border border-[#155E42]/30 shadow-2xs z-0"
        />
        {/* Hiệu ứng mờ trên & dưới */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[#FAF8F5] via-[#FAF8F5]/80 to-transparent z-20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#FAF8F5] via-[#FAF8F5]/80 to-transparent z-20"
        />

        <div
          ref={listRef}
          role="listbox"
          aria-label={label}
          onScroll={handleScroll}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative z-10 h-full overflow-y-auto snap-y snap-mandatory select-none cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <div style={{ height: `${SPACER_HEIGHT}px` }} aria-hidden="true" />
          {options.map((opt, idx) => {
            const isSelected = opt.value === selectedValue && !opt.disabled;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={opt.disabled}
                onClick={() => {
                  if (dragStateRef.current.moved || opt.disabled) return;
                  onSelect(opt.value);
                  listRef.current?.scrollTo({
                    top: idx * ITEM_HEIGHT,
                    behavior: 'smooth',
                  });
                }}
                style={{ height: `${ITEM_HEIGHT}px` }}
                className={`w-full snap-center flex items-center justify-center font-mono transition-all ${
                  opt.disabled
                    ? 'text-stone-300 text-sm line-through cursor-not-allowed'
                    : isSelected
                      ? 'text-[#14532D] font-extrabold text-xl scale-105 cursor-pointer'
                      : 'text-stone-600 hover:text-[#155E42] font-medium text-base cursor-pointer'
                }`}
              >
                {opt.value}
              </button>
            );
          })}
          <div style={{ height: `${SPACER_HEIGHT}px` }} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

export default function WheelTimePicker({
  id,
  selectedDate,
  value,
  onChange,
}: WheelTimePickerProps) {
  const [selectedHour, selectedMinute] = useMemo(() => {
    const parts = value.split(':');
    const hh = parts[0] && HOURS.includes(parts[0]) ? parts[0] : '19';
    const mm =
      parts[1] && (MINUTES as readonly string[]).includes(parts[1]) ? parts[1] : '00';
    return [hh, mm];
  }, [value]);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const availableSlots = useMemo(
    () => getAvailableSlotsForDate(selectedDate, nowMs),
    [selectedDate, nowMs]
  );

  const hourOptions = useMemo(
    () =>
      HOURS.map((hh) => {
        const hasAnyValidMinute = MINUTES.some(
          (mm) => !isSlotDisabledForDate(selectedDate, `${hh}:${mm}`, nowMs)
        );
        return { value: hh, disabled: !hasAnyValidMinute };
      }),
    [selectedDate, nowMs]
  );

  const minuteOptions = useMemo(
    () =>
      MINUTES.map((mm) => ({
        value: mm,
        disabled: isSlotDisabledForDate(selectedDate, `${selectedHour}:${mm}`, nowMs),
      })),
    [selectedDate, selectedHour, nowMs]
  );

  const handleHourSelect = (nextHour: string) => {
    const candidate = `${nextHour}:${selectedMinute}`;
    if (!isSlotDisabledForDate(selectedDate, candidate)) {
      onChange(candidate);
      return;
    }
    const firstValidMinute = MINUTES.find(
      (mm) => !isSlotDisabledForDate(selectedDate, `${nextHour}:${mm}`)
    );
    if (firstValidMinute) {
      onChange(`${nextHour}:${firstValidMinute}`);
    }
  };

  const handleMinuteSelect = (nextMinute: string) => {
    const candidate = `${selectedHour}:${nextMinute}`;
    if (!isSlotDisabledForDate(selectedDate, candidate)) {
      onChange(candidate);
    }
  };

  const operatingHours = useMemo(
    () => getOperatingHoursForDate(selectedDate),
    [selectedDate]
  );

  const lateNotice = useMemo(
    () => evaluateLateNightDiningNotice(selectedDate, `${selectedHour}:${selectedMinute}`),
    [selectedDate, selectedHour, selectedMinute]
  );

  const periodLabel = useMemo(() => {
    const h = Number.parseInt(selectedHour, 10);
    if (h < 11) return 'Buổi sáng';
    if (h < 14) return 'Buổi trưa';
    if (h < 18) return 'Buổi chiều';
    return 'Buổi tối';
  }, [selectedHour]);

  return (
    <div id={id} className="rounded-2xl border border-[#d6d0c4] bg-white p-3.5 sm:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#ebe7df]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#f0fdf4] text-[#155e42] border border-[#bbf7d0]">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <div>
            <p className="text-xs text-stone-500">Khung giờ đã chọn</p>
            <p className="font-mono font-bold text-base text-[#14532d]">
              {availableSlots.length > 0 ? `${selectedHour}:${selectedMinute}` : 'Hết khung giờ hôm nay'}
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#FAF8F5] text-stone-600 border border-[#ebe7df]">
          {availableSlots.length > 0
            ? `${periodLabel} • ${operatingHours.openTime}–${operatingHours.closeTime}`
            : 'Chọn ngày mai'}
        </span>
      </div>

      {availableSlots.length === 0 ? (
        <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] p-3 text-xs text-[#92400E]">
          Đã quá khung giờ nhận đặt bàn hôm nay ({operatingHours.closeTime} theo giờ Việt Nam GMT+7). Vui lòng chọn ngày mai.
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          <WheelColumn
            label="Giờ"
            options={hourOptions}
            selectedValue={selectedHour}
            onSelect={handleHourSelect}
          />
          <span
            aria-hidden="true"
            className="font-mono font-black text-2xl text-[#14532D] pt-5 select-none"
          >
            :
          </span>
          <WheelColumn
            label="Phút (15p)"
            options={minuteOptions}
            selectedValue={selectedMinute}
            onSelect={handleMinuteSelect}
          />
        </div>
      )}

      <p className="text-[11px] text-stone-500 leading-relaxed">
        Cuộn hoặc chạm để chọn giờ (bước 15 phút, đặt trước tối thiểu 30 phút). Thời gian dùng bữa tối đa 150 phút + 30 phút dọn bàn (tổng khung giữ lịch 3 giờ).
      </p>

      {availableSlots.length > 0 && lateNotice.severity !== 'NONE' && (
        <div
          role="note"
          className={`rounded-xl border px-3.5 py-2.5 flex items-start gap-2.5 text-xs leading-relaxed ${
            lateNotice.severity === 'LAST_CALL'
              ? 'bg-[#FFF7ED] border-[#FDBA74] text-[#9A3412]'
              : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
          }`}
        >
          <svg
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              lateNotice.severity === 'LAST_CALL' ? 'text-[#EA580C]' : 'text-[#D97706]'
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <p className="font-bold">
              {lateNotice.severity === 'LAST_CALL'
                ? `Khung giờ cuối ngày • Last Call (còn ${lateNotice.remainingMinutes} phút phục vụ)`
                : `Lưu ý khung giờ muộn (còn ${lateNotice.remainingMinutes} phút phục vụ)`}
            </p>
            <p className="mt-0.5 opacity-95">
              {lateNotice.severity === 'LAST_CALL' ? (
                <>
                  Nhà hàng đóng cửa lúc <strong>{lateNotice.closingTimeLabel}</strong> — đặt lúc{' '}
                  <strong>
                    {selectedHour}:{selectedMinute}
                  </strong>
                  , quý khách còn tối đa <strong>{lateNotice.remainingMinutes} phút</strong> dùng bữa (đến{' '}
                  <strong>{lateNotice.effectiveEndHm}</strong>). Khuyến khích chọn món trước ở Bước 3 để bếp chuẩn bị kịp giờ!
                </>
              ) : (
                <>
                  Nhà hàng đóng cửa lúc <strong>{lateNotice.closingTimeLabel}</strong>. Nếu đến lúc{' '}
                  <strong>
                    {selectedHour}:{selectedMinute}
                  </strong>
                  , thời gian dùng bữa tối đa là <strong>{lateNotice.remainingMinutes} phút</strong> (đến{' '}
                  <strong>{lateNotice.effectiveEndHm}</strong>) thay vì 150 phút tiêu chuẩn.
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
