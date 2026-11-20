"use client";

import { useEffect, useRef, useState } from 'react';
import {
  computeRemainingLockSeconds,
  formatCountdownHhMmSs,
  type ClientTableLockState,
} from '@/app/lib/bookingLockClient';

interface LockCountdownBannerProps {
  lock: ClientTableLockState | null;
  onExpired?: (expiredLock: ClientTableLockState) => void;
  onRelease?: (lock: ClientTableLockState) => void;
  isReleasing?: boolean;
  className?: string;
}

function LockCountdownBannerInner({
  lock,
  onExpired,
  onRelease,
  isReleasing = false,
  className = '',
}: Omit<LockCountdownBannerProps, 'lock'> & { lock: ClientTableLockState }) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    computeRemainingLockSeconds(lock.expiresAt)
  );
  const expiredFiredRef = useRef<boolean>(false);

  useEffect(() => {
    expiredFiredRef.current = false;
    const timer = window.setInterval(() => {
      const next = computeRemainingLockSeconds(lock.expiresAt);
      setRemainingSeconds(next);
      if (next <= 0 && !expiredFiredRef.current) {
        expiredFiredRef.current = true;
        window.clearInterval(timer);
        onExpired?.(lock);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [lock, onExpired]);

  const isLowTime = remainingSeconds > 0 && remainingSeconds <= 120;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 transition-colors ${
        isLowTime
          ? 'bg-red-50 border-red-200 text-red-900'
          : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
      } ${className}`}
    >
      <div className="flex items-center gap-2.5 text-xs sm:text-sm min-w-0">
        <span
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
            isLowTime
              ? 'bg-red-100 text-red-700 border-red-200'
              : 'bg-white text-[#D97706] border-[#FDE68A]'
          }`}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="font-semibold leading-snug">
            Đang giữ khóa tạm thời <strong className="text-[#14532D]">Bàn {lock.tableNumber}</strong>{' '}
            <span className="font-normal opacity-90">
              ({lock.time}, {lock.date})
            </span>
          </p>
          <p className="text-[11px] opacity-80">
            Bàn được giữ độc quyền cho phiên của bạn trong 10 phút để hoàn tất đặt món &amp; cọc.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 ml-auto">
        <span
          className={`font-mono font-bold text-sm sm:text-base px-3 py-1 rounded-xl border ${
            isLowTime
              ? 'bg-white text-red-700 border-red-300 animate-pulse'
              : 'bg-white text-[#B45309] border-[#FDE68A]'
          }`}
        >
          {formatCountdownHhMmSs(remainingSeconds)}
        </span>

        {onRelease && (
          <button
            type="button"
            onClick={() => onRelease(lock)}
            disabled={isReleasing}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#D6D0C4] bg-white hover:bg-stone-100 text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer disabled:opacity-50"
          >
            {isReleasing ? 'Đang hủy...' : 'Hủy giữ bàn'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function LockCountdownBanner(props: LockCountdownBannerProps) {
  if (!props.lock) {
    return null;
  }

  return (
    <LockCountdownBannerInner
      key={`${props.lock.lockKey}|${props.lock.expiresAt}`}
      lock={props.lock}
      onExpired={props.onExpired}
      onRelease={props.onRelease}
      isReleasing={props.isReleasing}
      className={props.className}
    />
  );
}
