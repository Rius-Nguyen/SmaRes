"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const DEFAULT_TOAST_DURATION_MS = 3500;
const MAX_VISIBLE_TOASTS = 5;

const NOOP_TOAST_CONTEXT: ToastContextValue = {
  showToast: () => {},
};

const ToastContext = createContext<ToastContextValue>(NOOP_TOAST_CONTEXT);

interface ToastStyleSpec {
  containerClass: string;
  iconWrapperClass: string;
  accentBarClass: string;
}

const TOAST_STYLE_MAP: Record<ToastType, ToastStyleSpec> = {
  success: {
    containerClass: 'border-[#BBF7D0] bg-[#FAF8F5]',
    iconWrapperClass: 'bg-[#F0FDF4] text-[#14532D] border-[#BBF7D0]',
    accentBarClass: 'bg-[#14532D]',
  },
  error: {
    containerClass: 'border-rose-200 bg-[#FAF8F5]',
    iconWrapperClass: 'bg-rose-50 text-rose-700 border-rose-200',
    accentBarClass: 'bg-rose-700',
  },
  warning: {
    containerClass: 'border-[#FDE68A] bg-[#FAF8F5]',
    iconWrapperClass: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
    accentBarClass: 'bg-[#D97706]',
  },
  info: {
    containerClass: 'border-[#D6D0C4] bg-[#FAF8F5]',
    iconWrapperClass: 'bg-[#F5F2EB] text-[#1C1917] border-[#D6D0C4]',
    accentBarClass: 'bg-[#1C1917]',
  },
};

function ToastIcon({ type }: { type: ToastType }): React.JSX.Element {
  switch (type) {
    case 'success':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'error':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 8v5" />
          <circle cx="12" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'warning':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75 2.75 19.5h18.5L12 3.75Z" />
          <path strokeLinecap="round" d="M12 9.5v4.5" />
          <circle cx="12" cy="16.75" r="0.75" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'info':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 11v5" />
          <circle cx="12" cy="7.75" r="0.75" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef<number>(0);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const trimmed = message.trim();
      if (!trimmed) return;

      counterRef.current += 1;
      const id = `toast-${Date.now()}-${counterRef.current}`;

      setToasts((prev) => {
        const next = [...prev, { id, message: trimmed, type }];
        if (next.length > MAX_VISIBLE_TOASTS) {
          const dropped = next.slice(0, next.length - MAX_VISIBLE_TOASTS);
          for (const d of dropped) {
            const t = timersRef.current.get(d.id);
            if (t) {
              clearTimeout(t);
              timersRef.current.delete(d.id);
            }
          }
          return next.slice(next.length - MAX_VISIBLE_TOASTS);
        }
        return next;
      });

      const timer = setTimeout(() => {
        dismissToast(id);
      }, DEFAULT_TOAST_DURATION_MS);
      timersRef.current.set(id, timer);
    },
    [dismissToast]
  );

  useEffect(() => {
    const timersMap = timersRef.current;
    return () => {
      timersMap.forEach((timer) => clearTimeout(timer));
      timersMap.clear();
    };
  }, []);

  const contextValue = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 left-4 sm:left-auto z-[70] flex flex-col items-end gap-2.5 pointer-events-none"
      >
        {toasts.map((toast) => {
          const style = TOAST_STYLE_MAP[toast.type];
          return (
            <div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto relative overflow-hidden w-full sm:w-96 rounded-2xl border ${style.containerClass} shadow-[0_12px_32px_-4px_rgba(28,25,23,0.14),0_4px_12px_-2px_rgba(28,25,23,0.06)] px-4 py-3.5 flex items-start gap-3 animate-slideUp`}
            >
              <span className={`absolute left-0 top-0 bottom-0 w-1 ${style.accentBarClass}`} aria-hidden="true" />
              <span
                className={`mt-0.5 w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 ${style.iconWrapperClass}`}
              >
                <ToastIcon type={toast.type} />
              </span>
              <p className="flex-1 text-xs sm:text-sm font-medium text-[#1C1917] leading-relaxed pt-0.5">
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Đóng thông báo"
                className="p-1 rounded-lg text-[#78716C] hover:text-[#1C1917] hover:bg-[#EBE7DF]/60 transition-colors shrink-0 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
