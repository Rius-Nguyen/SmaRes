'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  KDSOrder,
  KdsOrderStatus,
  AggregatedKitchenDish,
  groupKitchenDishes,
  getWaitMinutes,
  normalizeOrderStatus,
  formatCustomizationLabels,
} from '@/app/lib/kdsAggregation';

type FilterTab = 'ALL' | 'PENDING' | 'COOKING';
type AuthState = 'ok' | 'unauthorized' | 'forbidden';

interface OrdersApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  orders?: KDSOrder[];
}

interface PatchOrderApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  order?: KDSOrder;
}

const FILTER_TABS: ReadonlyArray<{ id: FilterTab; label: string }> = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PENDING', label: 'Chờ nấu' },
  { id: 'COOKING', label: 'Đang nấu' },
];

function formatTableHeading(tableNumber?: string, tableId?: string): string {
  const raw = String(tableNumber || tableId || '').trim();
  if (!raw) return 'Mang về';
  return /^bàn\s+/i.test(raw) ? raw : `Bàn ${raw}`;
}

export default function KDSPage() {
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>('ok');
  const [mutatingOrderIds, setMutatingOrderIds] = useState<string[]>([]);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  // Refs for optimistic update & pending mutation guard across 10s polling
  const inFlightOrderIdsRef = useRef<Map<string, number>>(new Map());
  const lastMutationAtRef = useRef<Record<string, number>>({});
  const ordersRef = useRef<KDSOrder[]>([]);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  const beginOrderMutation = useCallback((orderId: string) => {
    const count = inFlightOrderIdsRef.current.get(orderId) ?? 0;
    inFlightOrderIdsRef.current.set(orderId, count + 1);
    lastMutationAtRef.current[orderId] = Date.now();
    setMutatingOrderIds((prev) => (prev.includes(orderId) ? prev : [...prev, orderId]));
  }, []);

  const endOrderMutation = useCallback((orderId: string) => {
    const count = inFlightOrderIdsRef.current.get(orderId) ?? 0;
    if (count <= 1) {
      inFlightOrderIdsRef.current.delete(orderId);
      setMutatingOrderIds((prev) => prev.filter((id) => id !== orderId));
    } else {
      inFlightOrderIdsRef.current.set(orderId, count - 1);
    }
    lastMutationAtRef.current[orderId] = Date.now();
  }, []);

  const mergePolledOrders = useCallback(
    (prevOrders: KDSOrder[], serverOrders: KDSOrder[], fetchStartedAt: number): KDSOrder[] => {
      const prevById = new Map<string, KDSOrder>(prevOrders.map((o) => [o._id, o]));
      const merged = serverOrders.map((serverOrder) => {
        const isInFlight = (inFlightOrderIdsRef.current.get(serverOrder._id) ?? 0) > 0;
        const lastMutatedAt = lastMutationAtRef.current[serverOrder._id] ?? 0;
        if (isInFlight || fetchStartedAt < lastMutatedAt) {
          return prevById.get(serverOrder._id) ?? serverOrder;
        }
        return serverOrder;
      });

      const seenIds = new Set<string>(merged.map((o) => o._id));
      for (const localOrder of prevOrders) {
        const isInFlight = (inFlightOrderIdsRef.current.get(localOrder._id) ?? 0) > 0;
        const lastMutatedAt = lastMutationAtRef.current[localOrder._id] ?? 0;
        if (!seenIds.has(localOrder._id) && (isInFlight || fetchStartedAt < lastMutatedAt)) {
          merged.push(localOrder);
        }
      }

      return merged;
    },
    []
  );

  // Tải danh sách đơn hàng thực từ API /api/orders và đồng bộ mỗi 10s
  useEffect(() => {
    let cancelled = false;

    const loadOrders = async () => {
      const fetchStartedAt = Date.now();
      try {
        const res = await fetch('/api/orders', {
          method: 'GET',
          cache: 'no-store',
        });

        if (cancelled) return;

        if (res.status === 401 || res.status === 403) {
          const errBody = (await res.json().catch(() => ({}))) as OrdersApiResponse;
          setAuthState(res.status === 401 ? 'unauthorized' : 'forbidden');
          setErrorBanner(
            errBody.message ||
              (res.status === 401
                ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập tài khoản Nhân viên / Bếp.'
                : 'Tài khoản của bạn không có quyền truy cập màn hình Bếp KDS.')
          );
          return;
        }

        const json = (await res.json()) as OrdersApiResponse;
        if (!res.ok || !json.success || !Array.isArray(json.orders)) {
          setErrorBanner(json.message || json.error || 'Không thể tải danh sách đơn hàng từ máy chủ.');
          return;
        }

        setAuthState('ok');
        setErrorBanner(null);
        const serverOrders = json.orders;
        setOrders((prev) => mergePolledOrders(prev, serverOrders, fetchStartedAt));
        setLastSyncedTime(
          new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      } catch {
        if (!cancelled) {
          setErrorBanner('Không thể kết nối máy chủ để cập nhật đơn hàng KDS.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void loadOrders();

    if (!autoRefresh) {
      return () => {
        cancelled = true;
      };
    }

    const interval = setInterval(() => {
      void loadOrders();
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [autoRefresh, reloadNonce, mergePolledOrders]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setReloadNonce((prev) => prev + 1);
  };

  // =========================================================================
  // TK-164: ÁP DỤNG THUẬT TOÁN GOM MÓN CHẾ BIẾN CHO BẾP
  // =========================================================================
  const aggregatedDishes: AggregatedKitchenDish[] = useMemo(() => {
    return groupKitchenDishes(orders);
  }, [orders]);

  // Lọc danh sách thẻ đơn theo tab
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const normalized = normalizeOrderStatus(o.status);
      if (activeFilter === 'PENDING') return normalized === 'PENDING';
      if (activeFilter === 'COOKING') return normalized === 'COOKING';
      return normalized === 'PENDING' || normalized === 'COOKING';
    });
  }, [orders, activeFilter]);

  const pendingCount = useMemo(
    () => orders.filter((o) => normalizeOrderStatus(o.status) === 'PENDING').length,
    [orders]
  );

  const cookingCount = useMemo(
    () => orders.filter((o) => normalizeOrderStatus(o.status) === 'COOKING').length,
    [orders]
  );

  // Cập nhật trạng thái một đơn hàng với optimistic update + rollback on error
  const handleUpdateOrderStatus = async (
    orderId: string,
    nextStatus: 'COOKING' | 'COMPLETED'
  ) => {
    const currentOrder = ordersRef.current.find((o) => o._id === orderId);
    const previousStatus: KdsOrderStatus = currentOrder
      ? normalizeOrderStatus(currentOrder.status)
      : 'PENDING';
    const displayCode = currentOrder?.orderCode || `#${orderId.slice(-6).toUpperCase()}`;

    beginOrderMutation(orderId);
    setErrorBanner(null);
    setOrders((prev) =>
      prev.map((o) => (o._id === orderId ? { ...o, status: nextStatus } : o))
    );

    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: nextStatus }),
      });

      const json = (await res.json().catch(() => ({}))) as PatchOrderApiResponse;

      if (res.status === 401 || res.status === 403) {
        setAuthState(res.status === 401 ? 'unauthorized' : 'forbidden');
        throw new Error(
          json.message ||
            (res.status === 401
              ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
              : 'Bạn không có quyền cập nhật trạng thái đơn hàng.')
        );
      }

      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || 'Không thể cập nhật trạng thái đơn hàng.');
      }

      if (json.order) {
        const updatedOrder = json.order;
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, ...updatedOrder } : o))
        );
      }

      showToast(
        `Đã cập nhật đơn ${displayCode} sang "${nextStatus === 'COOKING' ? 'Đang nấu' : 'Hoàn thành'}"`
      );
    } catch (err: unknown) {
      // Rollback duy nhất đơn bị lỗi
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: previousStatus } : o))
      );
      const message =
        err instanceof Error ? err.message : 'Lỗi máy chủ khi cập nhật trạng thái đơn hàng.';
      setErrorBanner(`Cập nhật đơn ${displayCode} thất bại: ${message}`);
    } finally {
      endOrderMutation(orderId);
    }
  };

  // Nấu cả cụm món: đồng bộ các đơn PENDING của cụm sang COOKING qua PATCH /api/orders
  const handleBatchCookDish = async (dish: AggregatedKitchenDish) => {
    const orderMap = new Map(ordersRef.current.map((o) => [o._id, o]));
    const targetOrderIds = Array.from(
      new Set(
        dish.tableBreakdown
          .map((item) => item.orderId)
          .filter((orderId) => {
            const existing = orderMap.get(orderId);
            return existing ? normalizeOrderStatus(existing.status) === 'PENDING' : false;
          })
      )
    );

    if (targetOrderIds.length === 0) {
      showToast(`Cụm "${dish.dishName}" đã được chuyển sang Đang nấu.`);
      return;
    }

    const previousStatusById = new Map<string, KdsOrderStatus>();
    for (const orderId of targetOrderIds) {
      const existing = orderMap.get(orderId);
      previousStatusById.set(
        orderId,
        existing ? normalizeOrderStatus(existing.status) : 'PENDING'
      );
      beginOrderMutation(orderId);
    }

    setErrorBanner(null);
    const targetSet = new Set(targetOrderIds);
    setOrders((prev) =>
      prev.map((o) => (targetSet.has(o._id) ? { ...o, status: 'COOKING' } : o))
    );

    const results = await Promise.allSettled(
      targetOrderIds.map(async (orderId) => {
        try {
          const res = await fetch('/api/orders', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, status: 'COOKING' }),
          });
          const json = (await res.json().catch(() => ({}))) as PatchOrderApiResponse;

          if (res.status === 401 || res.status === 403) {
            setAuthState(res.status === 401 ? 'unauthorized' : 'forbidden');
            throw new Error(
              json.message ||
                (res.status === 401
                  ? 'Phiên đăng nhập đã hết hạn.'
                  : 'Không có quyền thao tác bếp.')
            );
          }

          if (!res.ok || !json.success) {
            throw new Error(json.message || json.error || 'Lỗi cập nhật đơn hàng.');
          }

          return { orderId, order: json.order };
        } finally {
          endOrderMutation(orderId);
        }
      })
    );

    const succeededMap = new Map<string, KDSOrder>();
    const failedIds: string[] = [];
    let firstErrorMsg = '';

    results.forEach((result, idx) => {
      const orderId = targetOrderIds[idx];
      if (result.status === 'fulfilled') {
        if (result.value.order) {
          succeededMap.set(orderId, result.value.order);
        }
      } else {
        failedIds.push(orderId);
        if (!firstErrorMsg) {
          firstErrorMsg =
            result.reason instanceof Error ? result.reason.message : 'Lỗi kết nối máy chủ';
        }
      }
    });

    if (succeededMap.size > 0 || failedIds.length > 0) {
      const failedSet = new Set(failedIds);
      setOrders((prev) =>
        prev.map((o) => {
          if (failedSet.has(o._id)) {
            return { ...o, status: previousStatusById.get(o._id) ?? 'PENDING' };
          }
          const updated = succeededMap.get(o._id);
          return updated ? { ...o, ...updated } : o;
        })
      );
    }

    if (failedIds.length > 0) {
      const succeededCount = targetOrderIds.length - failedIds.length;
      setErrorBanner(
        succeededCount > 0
          ? `Đã chuyển ${succeededCount}/${targetOrderIds.length} đơn sang Đang nấu; ${failedIds.length} đơn thất bại (${firstErrorMsg}).`
          : `Không thể chuyển cụm "${dish.dishName}" sang Đang nấu: ${firstErrorMsg}`
      );
    } else {
      showToast(
        `Đã chuyển ${targetOrderIds.length} đơn chứa "${dish.dishName}" (${dish.totalQuantity} phần) sang ĐANG NẤU!`
      );
    }
  };

  return (
    <main className="min-h-screen bg-[#1c1917] text-[#faf8f5] pb-20">
      {/* Toast thông báo thành công */}
      {toastMessage && (
        <div className="fixed top-5 inset-x-4 max-w-md mx-auto z-50 animate-slideDown">
          <div className="bg-[#14532d] text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/60 flex items-center gap-2.5">
            <svg
              className="w-4 h-4 text-[#fbbf24] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span className="flex-1">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header KDS */}
      <header className="bg-stone-950/95 backdrop-blur-md border-b border-stone-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-xl bg-[#d97706] hover:bg-amber-500 text-stone-950 font-black flex items-center justify-center text-xs shadow-sm transition-colors"
          >
            KDS
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-bold text-base sm:text-lg text-[#faf8f5] leading-none">
                Bếp SmaRes — Kitchen Display System
              </h1>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-stone-600'
                }`}
              />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Điều phối chế biến theo thời gian thực
              {lastSyncedTime ? ` • Đồng bộ lúc ${lastSyncedTime}` : ''}
            </p>
          </div>
        </div>

        {/* Nút tác vụ nhanh */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            <svg
              className={`w-3.5 h-3.5 text-[#fbbf24] ${isRefreshing ? 'animate-spin' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
              autoRefresh
                ? 'bg-[#14532d]/60 border-emerald-600 text-emerald-200'
                : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >
            {autoRefresh ? (
              <svg
                className="w-3.5 h-3.5 text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            ) : (
              <svg
                className="w-3.5 h-3.5 text-stone-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            )}
            <span className="hidden sm:inline">
              {autoRefresh ? 'Tự đồng bộ (10s)' : 'Đã tạm dừng'}
            </span>
          </button>

          <Link
            href="/staff/orders"
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors flex items-center gap-1.5"
          >
            <svg
              className="w-3.5 h-3.5 text-[#fbbf24]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
            <span className="hidden sm:inline">Đơn Staff</span>
          </Link>

          <Link
            href="/admin/menu"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white text-xs font-semibold border border-emerald-700 transition-colors flex items-center gap-1.5"
          >
            <span>Kho món</span>
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Inline Error / Auth Banner */}
        {errorBanner && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-500/60 bg-rose-950/70 px-4 py-3.5 text-xs sm:text-sm text-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2.5">
              <svg
                className="w-5 h-5 text-rose-400 shrink-0 mt-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorBanner}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {authState === 'unauthorized' && (
                <Link
                  href="/login?redirect=/kds"
                  className="px-3.5 py-2 rounded-xl bg-[#d97706] hover:bg-amber-500 text-stone-950 font-bold text-xs transition-colors"
                >
                  Đăng nhập lại
                </Link>
              )}
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                className="px-3 py-1.5 rounded-lg bg-rose-900/70 hover:bg-rose-800 text-rose-100 text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="rounded-2xl border border-stone-800 bg-stone-950/80 py-20 flex flex-col items-center justify-center gap-3 text-center">
            <span className="w-10 h-10 rounded-full border-3 border-[#d97706]/30 border-t-[#d97706] animate-spin" />
            <p className="text-sm text-stone-300 font-medium">
              Đang kết nối Bếp KDS và tải đơn hàng thực từ MongoDB...
            </p>
          </div>
        ) : (
          <>
            {/* =============================================================== */}
            {/* KHỐI TK-164: TỔNG HỢP CHẾ BIẾN NHANH (BATCH COOKING SUMMARY)    */}
            {/* =============================================================== */}
            <section className="bg-stone-950/90 rounded-2xl border-2 border-[#d97706]/80 p-5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-[#d97706]/10 rounded-full blur-2xl pointer-events-none" />

              {/* Tiêu đề khối gom món */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-stone-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-[#d97706] text-stone-950 flex items-center justify-center shadow-sm">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-serif font-bold text-[#faf8f5] tracking-tight">
                      Tổng Hợp Chế Biến Nhanh (Batch Cooking)
                    </h2>
                    <p className="text-xs text-amber-300/90">
                      Tự động gom các món giống nhau giữa các bàn để đầu bếp xử lý đồng thời
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#d97706]/20 text-amber-300 border border-[#d97706]/40">
                  {aggregatedDishes.length} cụm món cần làm
                </span>
              </div>

              {/* Danh sách thẻ món gom nhóm */}
              {aggregatedDishes.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-xs sm:text-sm">
                  Hiện tại không có món nào đang chờ chế biến. Bếp đã hoàn thành tất cả đơn!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {aggregatedDishes.map((group) => {
                    const waitMinutes = getWaitMinutes(group.oldestOrderTime);
                    const isUrgent = waitMinutes >= 15;
                    const isCooking = group.status === 'COOKING';
                    const hasPendingInGroup = group.tableBreakdown.some((b) => {
                      const matched = orders.find((o) => o._id === b.orderId);
                      return matched ? normalizeOrderStatus(matched.status) === 'PENDING' : false;
                    });
                    const isGroupMutating = group.tableBreakdown.some((b) =>
                      mutatingOrderIds.includes(b.orderId)
                    );

                    return (
                      <div
                        key={group.dishKey}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                          isCooking
                            ? 'bg-amber-950/30 border-[#d97706]/70 ring-1 ring-[#d97706]/30'
                            : isUrgent
                            ? 'bg-rose-950/30 border-rose-600/70'
                            : 'bg-stone-900/90 border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-start gap-2.5">
                              <span className="min-w-8 h-8 px-1.5 rounded-lg bg-[#d97706] text-stone-950 font-black flex items-center justify-center text-sm shrink-0 mt-0.5">
                                {group.totalQuantity}x
                              </span>
                              <div>
                                <h3 className="font-bold text-sm text-[#faf8f5] leading-tight">
                                  {group.dishName}
                                </h3>
                                <p className="text-xs font-bold text-amber-300 mt-1">
                                  {group.breakdownSummary}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`text-[11px] font-bold px-2 py-1 rounded-md whitespace-nowrap flex items-center gap-1 ${
                                isUrgent
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                                  : 'bg-stone-800 text-stone-300'
                              }`}
                            >
                              <svg
                                className="w-3 h-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              <span>{waitMinutes}p</span>
                            </span>
                          </div>

                          {group.customizationSummary.length > 0 && (
                            <div className="my-2.5 p-2.5 rounded-lg bg-stone-950/70 border border-stone-800 space-y-1">
                              {group.customizationSummary.map((note, idx) => (
                                <p key={idx} className="text-[11px] text-stone-300 leading-tight">
                                  {note}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-2.5 mt-2 border-t border-stone-800/80">
                          <button
                            type="button"
                            disabled={isGroupMutating || !hasPendingInGroup}
                            onClick={() => void handleBatchCookDish(group)}
                            className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                              !hasPendingInGroup
                                ? 'bg-[#d97706]/25 text-amber-200 border border-[#d97706]/50 cursor-default'
                                : 'bg-[#14532d] hover:bg-[#15803d] text-white shadow-sm cursor-pointer disabled:opacity-60'
                            }`}
                          >
                            <svg
                              className="w-4 h-4 shrink-0"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                            <span>
                              {isGroupMutating
                                ? 'Đang đồng bộ...'
                                : hasPendingInGroup
                                ? 'Bắt đầu nấu cả cụm'
                                : 'Đang nấu cả cụm'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* =============================================================== */}
            {/* DANH SÁCH THẺ ĐƠN HÀNG THEO TỪNG BÀN (TABLE ORDER TICKETS)      */}
            {/* =============================================================== */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-base sm:text-lg font-serif font-bold text-[#faf8f5]">
                    Vé đơn theo từng bàn ({filteredOrders.length} đơn)
                  </h2>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 font-semibold">
                      Chờ nấu: {pendingCount}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#d97706]/20 text-amber-300 border border-[#d97706]/40 font-semibold">
                      Đang nấu: {cookingCount}
                    </span>
                  </div>
                </div>

                {/* Filter trạng thái */}
                <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
                  {FILTER_TABS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setActiveFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                        activeFilter === f.id
                          ? 'bg-[#d97706] text-stone-950 font-bold'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="rounded-2xl border border-stone-800 bg-stone-950/70 py-14 px-6 text-center">
                  <p className="font-serif font-bold text-base text-stone-200 mb-1">
                    Không có vé đơn nào trong mục này
                  </p>
                  <p className="text-xs text-stone-400">
                    Đơn hàng mới từ khách tại bàn hoặc đặt trước sẽ tự động xuất hiện sau mỗi 10 giây.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredOrders.map((order) => {
                    const waitMinutes = getWaitMinutes(order.createdAt);
                    const normalizedStatus = normalizeOrderStatus(order.status);
                    const isPending = normalizedStatus === 'PENDING';
                    const isCooking = normalizedStatus === 'COOKING';
                    const isMutating = mutatingOrderIds.includes(order._id);
                    const displayOrderCode =
                      order.orderCode || `#${order._id.slice(-6).toUpperCase()}`;

                    return (
                      <div
                        key={order._id}
                        className={`bg-stone-950 rounded-2xl border flex flex-col justify-between overflow-hidden shadow-lg transition-all ${
                          isCooking
                            ? 'border-[#d97706]/80 ring-1 ring-[#d97706]/40'
                            : 'border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        {/* Header vé đơn */}
                        <div
                          className={`p-3.5 flex items-center justify-between border-b ${
                            isCooking
                              ? 'bg-[#d97706]/10 border-[#d97706]/30'
                              : 'bg-stone-900 border-stone-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-base font-black text-[#faf8f5]">
                                {formatTableHeading(order.tableNumber, order.tableId)}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isCooking
                                    ? 'bg-[#d97706] text-stone-950'
                                    : 'bg-stone-800 text-stone-300'
                                }`}
                              >
                                {isCooking ? 'Đang nấu' : 'Chờ nấu'}
                              </span>
                            </div>
                            <p className="text-[10px] text-stone-400 mt-0.5 font-mono">
                              {displayOrderCode}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold text-amber-400 flex items-center gap-1 justify-end">
                              <svg
                                className="w-3.5 h-3.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              <span>{waitMinutes} phút</span>
                            </span>
                          </div>
                        </div>

                        {/* Danh sách món trong vé */}
                        <div className="p-4 flex-1 space-y-2.5 divide-y divide-stone-900">
                          {order.items.map((item, idx) => {
                            const customLabels = formatCustomizationLabels(item.customizations, {
                              includeDefaultLevels: true,
                            });
                            return (
                              <div key={`${order._id}-${idx}`} className="pt-2 first:pt-0">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-bold text-xs text-[#faf8f5]">
                                    {item.quantity}x {item.name}
                                  </span>
                                </div>

                                {customLabels.length > 0 && (
                                  <div className="text-[11px] text-amber-300/90 pl-3 border-l-2 border-[#d97706]/50 mt-1 space-y-0.5">
                                    {customLabels.map((label, cIdx) => (
                                      <p
                                        key={cIdx}
                                        className={
                                          label.startsWith('Lưu ý:')
                                            ? 'text-rose-400 font-medium'
                                            : undefined
                                        }
                                      >
                                        {label}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {order.notes && order.notes.trim() !== '' && (
                            <div className="pt-2 text-[11px] text-amber-200/90 italic">
                              Ghi chú đơn: {order.notes}
                            </div>
                          )}
                        </div>

                        {/* Nút đổi trạng thái đơn (Touch-friendly 44px) */}
                        <div className="p-3 bg-stone-900/60 border-t border-stone-800 flex items-center gap-2">
                          {isPending ? (
                            <button
                              type="button"
                              disabled={isMutating}
                              onClick={() => void handleUpdateOrderStatus(order._id, 'COOKING')}
                              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#d97706] hover:bg-amber-500 text-stone-950 font-bold text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60"
                            >
                              <span>{isMutating ? 'Đang cập nhật...' : 'Bắt đầu nấu'}</span>
                              <svg
                                className="w-3.5 h-3.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <path d="M5 12h14" />
                                <path d="m12 5 7 7-7 7" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isMutating}
                              onClick={() => void handleUpdateOrderStatus(order._id, 'COMPLETED')}
                              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white font-bold text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>{isMutating ? 'Đang hoàn tất...' : 'Hoàn thành'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
