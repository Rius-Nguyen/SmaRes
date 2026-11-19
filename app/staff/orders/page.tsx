'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  KdsOrderStatus,
  OrderItemCustomization,
  formatCustomizationLabels,
  normalizeOrderStatus,
} from '@/app/lib/kdsAggregation';

type StaffTab = 'orders' | 'waiter';
type OrderFilter = 'ALL' | KdsOrderStatus;
type WaiterCallStatus = 'PENDING' | 'ATTENDED' | 'COMPLETED';
type WaiterFilter = 'ALL' | WaiterCallStatus;
type AuthState = 'ok' | 'unauthorized' | 'forbidden';

interface StaffOrderItem {
  _id?: string;
  menuItemId?: string;
  foodId?: string | { _id?: string; name?: string; price?: number };
  name?: string;
  price?: number;
  quantity: number;
  customizations?: OrderItemCustomization;
}

interface StaffOrder {
  _id: string;
  orderCode?: string;
  tableNumber?: string;
  phone?: string;
  notes?: string;
  items: StaffOrderItem[];
  totalAmount?: number;
  totalPrice?: number;
  status: KdsOrderStatus;
  createdAt?: string;
}

interface WaiterCallRecord {
  _id: string;
  tableNumber: string;
  reason: string;
  notes?: string;
  status: WaiterCallStatus;
  handledBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface OrdersApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  orders?: Array<Omit<StaffOrder, 'status'> & { status?: string }>;
}

interface PatchOrderApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  order?: Omit<StaffOrder, 'status'> & { status?: string };
}

interface WaiterApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  calls?: Array<Omit<WaiterCallRecord, 'status'> & { status?: string }>;
}

interface PatchWaiterApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  call?: Omit<WaiterCallRecord, 'status'> & { status?: string };
}

const ORDER_STATUS_META: Record<
  KdsOrderStatus,
  { code: KdsOrderStatus; label: string; badgeClass: string }
> = {
  PENDING: {
    code: 'PENDING',
    label: 'Chờ xử lý',
    badgeClass: 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]',
  },
  COOKING: {
    code: 'COOKING',
    label: 'Đang nấu',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  COMPLETED: {
    code: 'COMPLETED',
    label: 'Hoàn thành',
    badgeClass: 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]',
  },
  CANCELLED: {
    code: 'CANCELLED',
    label: 'Đã hủy',
    badgeClass: 'bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]',
  },
};

const WAITER_STATUS_META: Record<
  WaiterCallStatus,
  { code: WaiterCallStatus; label: string; badgeClass: string }
> = {
  PENDING: {
    code: 'PENDING',
    label: 'Chờ hỗ trợ',
    badgeClass: 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]',
  },
  ATTENDED: {
    code: 'ATTENDED',
    label: 'Đang phục vụ',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  COMPLETED: {
    code: 'COMPLETED',
    label: 'Đã xong',
    badgeClass: 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]',
  },
};

const ORDER_FILTER_OPTIONS: ReadonlyArray<{ id: OrderFilter; label: string }> = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PENDING', label: 'PENDING' },
  { id: 'COOKING', label: 'COOKING' },
  { id: 'COMPLETED', label: 'COMPLETED' },
  { id: 'CANCELLED', label: 'CANCELLED' },
];

const WAITER_FILTER_OPTIONS: ReadonlyArray<{ id: WaiterFilter; label: string }> = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PENDING', label: 'PENDING' },
  { id: 'ATTENDED', label: 'ATTENDED' },
  { id: 'COMPLETED', label: 'COMPLETED' },
];

function normalizeWaiterStatus(status?: string | null): WaiterCallStatus {
  const upper = String(status ?? '').trim().toUpperCase();
  if (upper === 'ATTENDED') return 'ATTENDED';
  if (upper === 'COMPLETED') return 'COMPLETED';
  return 'PENDING';
}

function normalizeStaffOrder(
  raw: Omit<StaffOrder, 'status'> & { status?: string }
): StaffOrder {
  return {
    ...raw,
    status: normalizeOrderStatus(raw.status),
    items: Array.isArray(raw.items) ? raw.items : [],
  };
}

function normalizeWaiterCall(
  raw: Omit<WaiterCallRecord, 'status'> & { status?: string }
): WaiterCallRecord {
  return {
    ...raw,
    status: normalizeWaiterStatus(raw.status),
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
    Number(amount || 0)
  );
}

function formatDateTime(isoString?: string): string {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return (
    date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
    ' ' +
    date.toLocaleDateString('vi-VN')
  );
}

function resolveOrderItemName(item: StaffOrderItem): string {
  if (item.name && item.name.trim() !== '') {
    return item.name;
  }
  if (typeof item.foodId === 'object' && item.foodId !== null && item.foodId.name) {
    return item.foodId.name;
  }
  return 'Món không xác định';
}

export default function StaffOrdersPage() {
  const [activeTab, setActiveTab] = useState<StaffTab>('orders');
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCallRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [authState, setAuthState] = useState<AuthState>('ok');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('ALL');
  const [waiterFilter, setWaiterFilter] = useState<WaiterFilter>('ALL');
  const [updatingOrderIds, setUpdatingOrderIds] = useState<string[]>([]);
  const [updatingCallIds, setUpdatingCallIds] = useState<string[]>([]);
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    let cancelled = false;

    const loadStaffData = async () => {
      try {
        const [ordersRes, waiterRes] = await Promise.all([
          fetch('/api/orders', { method: 'GET', cache: 'no-store' }),
          fetch('/api/waiter', { method: 'GET', cache: 'no-store' }),
        ]);

        if (cancelled) return;

        if (ordersRes.status === 401 || waiterRes.status === 401) {
          setAuthState('unauthorized');
          setError('Vui lòng đăng nhập tài khoản Nhân viên / Quản lý để truy cập bảng điều phối.');
          return;
        }

        if (ordersRes.status === 403 || waiterRes.status === 403) {
          setAuthState('forbidden');
          setError('Tài khoản hiện tại không có quyền Nhân viên để xem dữ liệu điều phối.');
          return;
        }

        const [ordersJson, waiterJson] = (await Promise.all([
          ordersRes.json().catch(() => ({ success: false })),
          waiterRes.json().catch(() => ({ success: false })),
        ])) as [OrdersApiResponse, WaiterApiResponse];

        if (cancelled) return;

        setAuthState('ok');

        const errorMessages: string[] = [];
        if (ordersRes.ok && ordersJson.success && Array.isArray(ordersJson.orders)) {
          setOrders(ordersJson.orders.map(normalizeStaffOrder));
        } else {
          errorMessages.push(ordersJson.message || ordersJson.error || 'Không thể tải đơn hàng.');
        }

        if (waiterRes.ok && waiterJson.success && Array.isArray(waiterJson.calls)) {
          setWaiterCalls(waiterJson.calls.map(normalizeWaiterCall));
        } else {
          errorMessages.push(
            waiterJson.message || waiterJson.error || 'Không thể tải yêu cầu gọi phục vụ.'
          );
        }

        setError(errorMessages.join(' '));
      } catch {
        if (!cancelled) {
          setError('Lỗi kết nối đến máy chủ lấy dữ liệu điều phối!');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void loadStaffData();

    const interval = setInterval(() => {
      void loadStaffData();
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [reloadNonce]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setError('');
    setReloadNonce((prev) => prev + 1);
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: KdsOrderStatus) => {
    const existing = orders.find((o) => o._id === orderId);
    const previousStatus = existing?.status ?? 'PENDING';
    const displayCode = existing?.orderCode || `#${orderId.slice(-6).toUpperCase()}`;

    setUpdatingOrderIds((prev) => (prev.includes(orderId) ? prev : [...prev, orderId]));
    setError('');
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
        throw new Error(json.message || 'Bạn không có quyền cập nhật đơn hàng.');
      }

      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || 'Không thể cập nhật trạng thái đơn hàng.');
      }

      if (json.order) {
        const normalizedUpdated = normalizeStaffOrder(json.order);
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? normalizedUpdated : o))
        );
      }

      showToast(
        `Đơn ${displayCode} đã chuyển sang ${ORDER_STATUS_META[nextStatus].code} (${ORDER_STATUS_META[nextStatus].label}).`
      );
    } catch (err: unknown) {
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: previousStatus } : o))
      );
      setError(
        err instanceof Error
          ? err.message
          : 'Lỗi kết nối máy chủ khi cập nhật trạng thái đơn hàng.'
      );
    } finally {
      setUpdatingOrderIds((prev) => prev.filter((id) => id !== orderId));
    }
  };

  const handleUpdateWaiterCallStatus = async (
    callId: string,
    nextStatus: WaiterCallStatus
  ) => {
    const existing = waiterCalls.find((c) => c._id === callId);
    const previousStatus = existing?.status ?? 'PENDING';

    setUpdatingCallIds((prev) => (prev.includes(callId) ? prev : [...prev, callId]));
    setError('');
    setWaiterCalls((prev) =>
      prev.map((c) => (c._id === callId ? { ...c, status: nextStatus } : c))
    );

    try {
      const res = await fetch('/api/waiter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId, status: nextStatus }),
      });

      const json = (await res.json().catch(() => ({}))) as PatchWaiterApiResponse;

      if (res.status === 401 || res.status === 403) {
        setAuthState(res.status === 401 ? 'unauthorized' : 'forbidden');
        throw new Error(json.message || 'Bạn không có quyền xử lý yêu cầu gọi phục vụ.');
      }

      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || 'Không thể cập nhật yêu cầu gọi phục vụ.');
      }

      if (json.call) {
        const normalizedCall = normalizeWaiterCall(json.call);
        setWaiterCalls((prev) =>
          prev.map((c) => (c._id === callId ? normalizedCall : c))
        );
      }

      showToast(
        `Yêu cầu Bàn ${existing?.tableNumber ?? ''} đã chuyển sang ${WAITER_STATUS_META[nextStatus].code}.`
      );
    } catch (err: unknown) {
      setWaiterCalls((prev) =>
        prev.map((c) => (c._id === callId ? { ...c, status: previousStatus } : c))
      );
      setError(
        err instanceof Error
          ? err.message
          : 'Lỗi kết nối máy chủ khi cập nhật yêu cầu gọi phục vụ.'
      );
    } finally {
      setUpdatingCallIds((prev) => prev.filter((id) => id !== callId));
    }
  };

  const sortedAndFilteredOrders = useMemo(() => {
    const filtered =
      orderFilter === 'ALL' ? orders : orders.filter((o) => o.status === orderFilter);

    const priorityRank: Record<KdsOrderStatus, number> = {
      PENDING: 0,
      COOKING: 1,
      COMPLETED: 2,
      CANCELLED: 3,
    };

    return [...filtered].sort((a, b) => {
      const rankDiff = priorityRank[a.status] - priorityRank[b.status];
      if (rankDiff !== 0) return rankDiff;
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      // Active orders: oldest first; finished/cancelled orders: newest first
      if (a.status === 'PENDING' || a.status === 'COOKING') {
        return tA - tB;
      }
      return tB - tA;
    });
  }, [orders, orderFilter]);

  const sortedAndFilteredCalls = useMemo(() => {
    const filtered =
      waiterFilter === 'ALL'
        ? waiterCalls
        : waiterCalls.filter((c) => c.status === waiterFilter);

    const rank: Record<WaiterCallStatus, number> = {
      PENDING: 0,
      ATTENDED: 1,
      COMPLETED: 2,
    };

    return [...filtered].sort((a, b) => {
      const rankDiff = rank[a.status] - rank[b.status];
      if (rankDiff !== 0) return rankDiff;
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      if (a.status === 'COMPLETED') {
        return tB - tA;
      }
      return tA - tB;
    });
  }, [waiterCalls, waiterFilter]);

  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => o.status === 'PENDING').length,
    [orders]
  );
  const cookingOrdersCount = useMemo(
    () => orders.filter((o) => o.status === 'COOKING').length,
    [orders]
  );
  const completedOrdersCount = useMemo(
    () => orders.filter((o) => o.status === 'COMPLETED').length,
    [orders]
  );
  const pendingWaiterCount = useMemo(
    () => waiterCalls.filter((c) => c.status === 'PENDING').length,
    [waiterCalls]
  );

  if (authState === 'unauthorized' && !loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#faf8f5] text-[#1c1917] py-16 px-4">
        <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_20px_-4px_rgba(28,25,23,0.08)] border border-[#ebe7df] text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center mx-auto mb-4 border border-[#fde68a]">
            <svg
              className="w-8 h-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#14532d] mb-2">
            Yêu cầu đăng nhập Nhân viên
          </h1>
          <p className="text-sm text-[#57534e] mb-7 leading-relaxed">
            {error || 'Vui lòng đăng nhập tài khoản Nhân viên / Quản lý để tiếp nhận đơn hàng và hỗ trợ bàn.'}
          </p>
          <Link
            href="/login?redirect=/staff/orders"
            className="inline-block w-full bg-[#14532d] hover:bg-[#15803d] text-white px-5 py-3.5 rounded-xl font-semibold text-sm transition-colors shadow-[0_8px_24px_-4px_rgba(20,83,45,0.35)]"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen bg-[#faf8f5] text-[#1c1917]">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed top-5 inset-x-4 max-w-md mx-auto z-50 animate-slideDown">
          <div className="bg-[#14532d] text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl border border-emerald-500/60 flex items-center gap-2.5">
            <svg
              className="w-4 h-4 text-[#fbbf24] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="flex-1">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Tiêu đề trang & Nút tải lại */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#15803d] bg-[#f0fdf4] px-3.5 py-1 rounded-full border border-[#bbf7d0] inline-block mb-1.5">
            Phục vụ &amp; Điều phối
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#14532d]">
            Quản Lý Đơn Hàng &amp; Hỗ Trợ Bàn (Staff)
          </h1>
          <p className="text-xs sm:text-sm text-[#57534e] mt-1">
            Đồng bộ trực tiếp với MongoDB: xử lý đơn bàn, điều phối Bếp và tiếp nhận yêu cầu gọi phục vụ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/kds"
            className="min-h-[44px] px-4 py-2.5 bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl shadow-[0_4px_14px_-2px_rgba(217,119,6,0.35)] transition-all text-xs sm:text-sm font-semibold flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>Màn hình Bếp KDS</span>
          </Link>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="min-h-[44px] px-5 py-2.5 bg-[#14532d] hover:bg-[#15803d] text-white rounded-xl shadow-[0_4px_14px_-2px_rgba(20,83,45,0.4)] transition-all text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <svg
              className={`w-4 h-4 text-emerald-200 ${isRefreshing ? 'animate-spin' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            <span>{isRefreshing ? 'Đang tải...' : 'Tải lại dữ liệu'}</span>
          </button>
        </div>
      </div>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-[#ebe7df] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.05)]">
          <p className="text-xs text-[#57534e] font-medium">Đơn chờ (PENDING)</p>
          <p className="text-2xl font-serif font-bold text-[#d97706] mt-1">
            {pendingOrdersCount}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#ebe7df] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.05)]">
          <p className="text-xs text-[#57534e] font-medium">Đang nấu (COOKING)</p>
          <p className="text-2xl font-serif font-bold text-sky-700 mt-1">
            {cookingOrdersCount}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#ebe7df] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.05)]">
          <p className="text-xs text-[#57534e] font-medium">Hoàn thành (COMPLETED)</p>
          <p className="text-2xl font-serif font-bold text-[#14532d] mt-1">
            {completedOrdersCount}
          </p>
        </div>
        <div
          className={`p-4 rounded-2xl border shadow-[0_4px_20px_-2px_rgba(28,25,23,0.05)] ${
            pendingWaiterCount > 0
              ? 'bg-[#fffbeb] border-[#fde68a]'
              : 'bg-white border-[#ebe7df]'
          }`}
        >
          <p className="text-xs text-[#57534e] font-medium">Gọi phục vụ chờ xử lý</p>
          <p className="text-2xl font-serif font-bold text-[#b45309] mt-1">
            {pendingWaiterCount}
          </p>
        </div>
      </div>

      {/* Báo lỗi nếu có */}
      {error && (
        <div
          className="mb-5 p-4 text-xs sm:text-sm text-rose-800 bg-rose-50 rounded-2xl border border-rose-200 flex items-center justify-between gap-3"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-rose-600 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
          {authState === 'forbidden' && (
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg bg-rose-700 text-white text-xs font-semibold shrink-0"
            >
              Về trang chủ
            </Link>
          )}
        </div>
      )}

      {/* Tabs chuyển đổi Đơn hàng / Yêu cầu gọi phục vụ */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="inline-flex p-1.5 rounded-2xl bg-white border border-[#ebe7df] shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-[#14532d] text-white shadow-xs'
                : 'text-[#57534e] hover:text-[#1c1917]'
            }`}
          >
            <svg
              className="w-4 h-4"
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
            <span>Đơn hàng ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('waiter')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'waiter'
                ? 'bg-[#14532d] text-white shadow-xs'
                : 'text-[#57534e] hover:text-[#1c1917]'
            }`}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span>Yêu cầu gọi phục vụ ({waiterCalls.length})</span>
            {pendingWaiterCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#d97706] text-white">
                {pendingWaiterCount}
              </span>
            )}
          </button>
        </div>

        {/* Bộ lọc trạng thái theo Tab hiện tại */}
        <div className="flex flex-wrap items-center gap-1.5">
          {activeTab === 'orders'
            ? ORDER_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOrderFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    orderFilter === opt.id
                      ? 'bg-[#d97706] text-white border-[#d97706]'
                      : 'bg-white text-[#57534e] border-[#ebe7df] hover:border-[#d6d0c4]'
                  }`}
                >
                  {opt.label}
                </button>
              ))
            : WAITER_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setWaiterFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    waiterFilter === opt.id
                      ? 'bg-[#d97706] text-white border-[#d97706]'
                      : 'bg-white text-[#57534e] border-[#ebe7df] hover:border-[#d6d0c4]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
        </div>
      </div>

      {/* Trạng thái Loading */}
      {loading ? (
        <div className="flex justify-center items-center py-20 bg-white rounded-2xl border border-[#ebe7df]">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#14532d]/20 border-t-[#14532d]" />
          <span className="ml-3 text-[#57534e] font-medium text-sm">
            Đang tải dữ liệu điều phối từ MongoDB...
          </span>
        </div>
      ) : activeTab === 'orders' ? (
        /* TAB 1: BẢNG ĐƠN HÀNG */
        <div className="overflow-x-auto bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df]">
          <table className="w-full text-xs sm:text-sm text-left text-[#57534e]">
            <thead className="text-[11px] text-[#78716c] uppercase tracking-wider bg-[#faf8f5] border-b border-[#ebe7df]">
              <tr>
                <th scope="col" className="px-5 py-4">
                  Mã đơn &amp; Bàn
                </th>
                <th scope="col" className="px-5 py-4">
                  Giờ đặt
                </th>
                <th scope="col" className="px-5 py-4">
                  Danh sách món
                </th>
                <th scope="col" className="px-5 py-4">
                  Tổng tiền
                </th>
                <th scope="col" className="px-5 py-4">
                  Trạng thái
                </th>
                <th scope="col" className="px-5 py-4 text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe7df]">
              {sortedAndFilteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#78716c] italic">
                    Hiện tại không có đơn hàng nào trong danh sách này.
                  </td>
                </tr>
              ) : (
                sortedAndFilteredOrders.map((order) => {
                  const meta = ORDER_STATUS_META[order.status];
                  const isMutating = updatingOrderIds.includes(order._id);
                  const displayCode =
                    order.orderCode || `#${order._id.slice(-6).toUpperCase()}`;
                  const orderTotal = order.totalAmount ?? order.totalPrice ?? 0;

                  return (
                    <tr
                      key={order._id}
                      className="bg-white hover:bg-[#faf8f5]/80 transition-colors align-top"
                    >
                      {/* Cột 1: Mã đơn & Bàn */}
                      <td className="px-5 py-4">
                        <p className="font-mono font-bold text-[#14532d]">{displayCode}</p>
                        <p className="text-xs font-semibold text-[#1c1917] mt-1">
                          {order.tableNumber ? `Bàn ${order.tableNumber}` : 'Mang về'}
                        </p>
                        {order.phone && (
                          <p className="text-[11px] text-[#78716c] mt-0.5">
                            SĐT: {order.phone}
                          </p>
                        )}
                      </td>

                      {/* Cột 2: Giờ đặt */}
                      <td className="px-5 py-4 whitespace-nowrap text-[#1c1917]">
                        {formatDateTime(order.createdAt)}
                      </td>

                      {/* Cột 3: Danh sách món */}
                      <td className="px-5 py-4 min-w-[240px]">
                        <ul className="space-y-1.5">
                          {order.items.map((item, idx) => {
                            const customLabels = formatCustomizationLabels(
                              item.customizations,
                              { includeDefaultLevels: false }
                            );

                            return (
                              <li key={`${order._id}-it-${idx}`} className="text-[#1c1917]">
                                <div>
                                  <span className="font-medium">
                                    {resolveOrderItemName(item)}
                                  </span>{' '}
                                  <span className="text-[#d97706] font-bold">
                                    ×{item.quantity}
                                  </span>
                                </div>
                                {customLabels.length > 0 && (
                                  <p className="text-[11px] text-[#78716c]">
                                    {customLabels.join(' • ')}
                                  </p>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        {order.notes && order.notes.trim() !== '' && (
                          <p className="text-[11px] text-[#92400e] bg-[#fffbeb] border border-[#fde68a] rounded-lg px-2.5 py-1 mt-2">
                            Ghi chú: {order.notes}
                          </p>
                        )}
                      </td>

                      {/* Cột 4: Tổng tiền */}
                      <td className="px-5 py-4 font-serif font-bold text-[#d97706] whitespace-nowrap text-base">
                        {formatCurrency(orderTotal)}
                      </td>

                      {/* Cột 5: Trạng thái chuẩn UPPERCASE */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${meta.badgeClass}`}
                        >
                          <span>{meta.code}</span>
                          <span className="font-medium opacity-80">· {meta.label}</span>
                        </span>
                      </td>

                      {/* Cột 6: Hành động Staff */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          {order.status === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                disabled={isMutating}
                                onClick={() =>
                                  void handleUpdateOrderStatus(order._id, 'COOKING')
                                }
                                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                              >
                                {isMutating ? 'Đang lưu...' : 'Bắt đầu nấu'}
                              </button>
                              <button
                                type="button"
                                disabled={isMutating}
                                onClick={() =>
                                  void handleUpdateOrderStatus(order._id, 'CANCELLED')
                                }
                                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                              >
                                Hủy đơn
                              </button>
                            </>
                          )}

                          {order.status === 'COOKING' && (
                            <>
                              <button
                                type="button"
                                disabled={isMutating}
                                onClick={() =>
                                  void handleUpdateOrderStatus(order._id, 'COMPLETED')
                                }
                                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                              >
                                {isMutating ? 'Đang lưu...' : 'Hoàn thành'}
                              </button>
                              <button
                                type="button"
                                disabled={isMutating}
                                onClick={() =>
                                  void handleUpdateOrderStatus(order._id, 'CANCELLED')
                                }
                                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                              >
                                Hủy đơn
                              </button>
                            </>
                          )}

                          {(order.status === 'COMPLETED' ||
                            order.status === 'CANCELLED') && (
                            <span className="text-xs text-[#78716c] italic">
                              Đã kết thúc
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* TAB 2: YÊU CẦU GỌI PHỤC VỤ (WAITER CALLS) */
        <section className="space-y-4">
          {sortedAndFilteredCalls.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#ebe7df] p-12 text-center shadow-[0_4px_20px_-2px_rgba(28,25,23,0.05)]">
              <div className="w-12 h-12 rounded-full bg-[#faf8f5] border border-[#ebe7df] flex items-center justify-center mx-auto mb-3 text-[#78716c]">
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <p className="font-serif font-bold text-[#1c1917] text-base mb-1">
                Không có yêu cầu gọi phục vụ nào
              </p>
              <p className="text-xs text-[#78716c]">
                Các yêu cầu hỗ trợ từ khách tại bàn qua QR menu sẽ hiển thị ngay tại đây.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedAndFilteredCalls.map((call) => {
                const meta = WAITER_STATUS_META[call.status];
                const isMutating = updatingCallIds.includes(call._id);

                return (
                  <article
                    key={call._id}
                    className={`bg-white rounded-2xl border p-5 flex flex-col justify-between shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] transition-all ${
                      call.status === 'PENDING'
                        ? 'border-[#d97706]/70 ring-1 ring-[#d97706]/25'
                        : 'border-[#ebe7df]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#ebe7df]">
                        <div>
                          <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[#14532d] text-white font-serif font-bold text-sm">
                            Bàn {call.tableNumber}
                          </span>
                          <p className="text-[11px] text-[#78716c] mt-1.5">
                            Gửi lúc {formatDateTime(call.createdAt)}
                          </p>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${meta.badgeClass}`}
                        >
                          <span>{meta.code}</span>
                          <span className="font-medium opacity-80">· {meta.label}</span>
                        </span>
                      </div>

                      <div className="py-3.5 space-y-2">
                        <p className="text-sm font-bold text-[#1c1917]">{call.reason}</p>
                        {call.notes && call.notes.trim() !== '' && (
                          <p className="text-xs text-[#57534e] bg-[#faf8f5] border border-[#ebe7df] rounded-xl px-3 py-2">
                            {call.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#ebe7df] flex flex-wrap items-center gap-2">
                      {call.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            disabled={isMutating}
                            onClick={() =>
                              void handleUpdateWaiterCallStatus(call._id, 'ATTENDED')
                            }
                            className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
                          >
                            {isMutating ? 'Đang xử lý...' : 'Tiếp nhận (ATTENDED)'}
                          </button>
                          <button
                            type="button"
                            disabled={isMutating}
                            onClick={() =>
                              void handleUpdateWaiterCallStatus(call._id, 'COMPLETED')
                            }
                            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
                          >
                            Hoàn tất
                          </button>
                        </>
                      )}

                      {call.status === 'ATTENDED' && (
                        <button
                          type="button"
                          disabled={isMutating}
                          onClick={() =>
                            void handleUpdateWaiterCallStatus(call._id, 'COMPLETED')
                          }
                          className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
                        >
                          {isMutating ? 'Đang lưu...' : 'Đánh dấu hoàn tất (COMPLETED)'}
                        </button>
                      )}

                      {call.status === 'COMPLETED' && (
                        <span className="w-full text-center text-xs text-[#15803d] font-semibold py-2 bg-[#f0fdf4] rounded-xl border border-[#bbf7d0]">
                          Đã hoàn thành hỗ trợ
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
