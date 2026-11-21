"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/app/lib/format';
import { useToast } from '@/components/ui/Toast';
import RevenueChartSection from '@/components/admin/RevenueChartSection';

type RangeDays = 7 | 14 | 30;
type AuthState = 'ok' | 'unauthorized' | 'forbidden';
type OrderStatusKey = 'PENDING' | 'COOKING' | 'COMPLETED' | 'CANCELLED';
type ReservationStatusKey = 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';

interface AnalyticsKpis {
  totalRevenue: number;
  validOrders: number;
  avgOrderValue: number;
  totalOrders: number;
  cancelledOrders: number;
}

interface OrderStatusBreakdownItem {
  status: OrderStatusKey;
  count: number;
  revenue: number;
}

interface HourlyDistributionPoint {
  hour: number;
  label: string;
  revenue: number;
  orders: number;
}

interface TopDishItem {
  menuItemId: string;
  name: string;
  quantity: number;
  revenue: number;
  orderCount: number;
}

interface ReservationSummary {
  totalReservations: number;
  activeReservations: number;
  totalGuests: number;
  byStatus: Record<ReservationStatusKey, number>;
}

interface AnalyticsApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  rangeDays?: RangeDays;
  kpis?: AnalyticsKpis;
  statusBreakdown?: OrderStatusBreakdownItem[];
  hourlyDistribution?: HourlyDistributionPoint[];
  topDishes?: TopDishItem[];
  reservationSummary?: ReservationSummary;
}

const PERIOD_OPTIONS: ReadonlyArray<{ days: RangeDays; label: string }> = [
  { days: 7, label: '7 ngày' },
  { days: 14, label: '14 ngày' },
  { days: 30, label: '30 ngày' },
];

const ORDER_STATUS_META: Record<
  OrderStatusKey,
  { label: string; barClass: string; badgeClass: string }
> = {
  COMPLETED: {
    label: 'Hoàn thành',
    barClass: 'bg-[#14532D]',
    badgeClass: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
  },
  COOKING: {
    label: 'Đang chế biến',
    barClass: 'bg-[#D97706]',
    badgeClass: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
  },
  PENDING: {
    label: 'Chờ xử lý',
    barClass: 'bg-[#F59E0B]',
    badgeClass: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  },
  CANCELLED: {
    label: 'Đã hủy',
    barClass: 'bg-rose-500',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

const RESERVATION_STATUS_META: Record<
  ReservationStatusKey,
  { label: string; badgeClass: string }
> = {
  CONFIRMED: {
    label: 'Đã xác nhận',
    badgeClass: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
  },
  CHECKED_IN: {
    label: 'Đang phục vụ',
    badgeClass: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
  },
  COMPLETED: {
    label: 'Hoàn tất',
    badgeClass: 'bg-[#F5F2EB] text-[#1C1917] border-[#D6D0C4]',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

export default function AdminAnalyticsPage() {
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [reloadNonce, setReloadNonce] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [authState, setAuthState] = useState<AuthState>('ok');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string>('');

  const [kpis, setKpis] = useState<AnalyticsKpis>({
    totalRevenue: 0,
    validOrders: 0,
    avgOrderValue: 0,
    totalOrders: 0,
    cancelledOrders: 0,
  });
  const [statusBreakdown, setStatusBreakdown] = useState<OrderStatusBreakdownItem[]>([]);
  const [hourlyDistribution, setHourlyDistribution] = useState<HourlyDistributionPoint[]>([]);
  const [topDishes, setTopDishes] = useState<TopDishItem[]>([]);
  const [reservationSummary, setReservationSummary] = useState<ReservationSummary>({
    totalReservations: 0,
    activeReservations: 0,
    totalGuests: 0,
    byStatus: {
      CONFIRMED: 0,
      CHECKED_IN: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    },
  });

  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  const { showToast } = useToast();

  const handleChartAuthError = useCallback((status: 401 | 403, message: string) => {
    setAuthState(status === 401 ? 'unauthorized' : 'forbidden');
    setErrorMessage(message);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadAnalytics = async () => {
      try {
        const res = await fetch(`/api/admin/analytics?days=${rangeDays}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (isCancelled) return;

        if (res.status === 401) {
          setAuthState('unauthorized');
          setErrorMessage('Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập tài khoản Quản trị viên.');
          return;
        }

        if (res.status === 403) {
          setAuthState('forbidden');
          setErrorMessage('Trang thống kê doanh thu chỉ dành riêng cho tài khoản Quản trị viên (Admin).');
          return;
        }

        const json = (await res.json()) as AnalyticsApiResponse;
        if (!res.ok || !json.success) {
          const msg = json.message || 'Không thể tải dữ liệu phân tích từ máy chủ.';
          setErrorMessage(msg);
          showToast(msg, 'error');
          return;
        }

        setAuthState('ok');
        setErrorMessage(null);
        setKpis(
          json.kpis ?? {
            totalRevenue: 0,
            validOrders: 0,
            avgOrderValue: 0,
            totalOrders: 0,
            cancelledOrders: 0,
          }
        );
        setStatusBreakdown(Array.isArray(json.statusBreakdown) ? json.statusBreakdown : []);
        setHourlyDistribution(Array.isArray(json.hourlyDistribution) ? json.hourlyDistribution : []);
        setTopDishes(Array.isArray(json.topDishes) ? json.topDishes : []);
        setReservationSummary(
          json.reservationSummary ?? {
            totalReservations: 0,
            activeReservations: 0,
            totalGuests: 0,
            byStatus: {
              CONFIRMED: 0,
              CHECKED_IN: 0,
              COMPLETED: 0,
              CANCELLED: 0,
            },
          }
        );
        setHoveredHour(null);
        setLastUpdatedLabel(
          new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      } catch (err) {
        console.error('Lỗi tải dữ liệu thống kê:', err);
        if (!isCancelled) {
          const msg = 'Mất kết nối máy chủ khi tổng hợp báo cáo thống kê.';
          setErrorMessage(msg);
          showToast(msg, 'error');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void loadAnalytics();

    return () => {
      isCancelled = true;
    };
  }, [rangeDays, reloadNonce, showToast]);

  const handleSelectPeriod = (days: RangeDays) => {
    if (days === rangeDays) return;
    setIsRefreshing(true);
    setRangeDays(days);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setReloadNonce((n) => n + 1);
  };

  const maxHourlyRevenue = useMemo(() => {
    const maxVal = hourlyDistribution.reduce((acc, item) => Math.max(acc, item.revenue), 0);
    return maxVal > 0 ? maxVal : 1;
  }, [hourlyDistribution]);

  const maxHourlyOrders = useMemo(() => {
    const maxVal = hourlyDistribution.reduce((acc, item) => Math.max(acc, item.orders), 0);
    return maxVal > 0 ? maxVal : 1;
  }, [hourlyDistribution]);

  const peakHour = useMemo(() => {
    if (hourlyDistribution.length === 0) return null;
    return hourlyDistribution.reduce(
      (best, cur) =>
        cur.revenue > best.revenue || (cur.revenue === best.revenue && cur.orders > best.orders)
          ? cur
          : best,
      hourlyDistribution[0]
    );
  }, [hourlyDistribution]);

  const maxDishRevenue = useMemo(() => {
    const maxVal = topDishes.reduce((acc, item) => Math.max(acc, item.revenue), 0);
    return maxVal > 0 ? maxVal : 1;
  }, [topDishes]);

  const hasAnyData =
    kpis.totalOrders > 0 || reservationSummary.totalReservations > 0 || topDishes.length > 0;

  const activeHourPoint =
    hoveredHour !== null
      ? hourlyDistribution.find((h) => h.hour === hoveredHour) ?? null
      : peakHour && (peakHour.revenue > 0 || peakHour.orders > 0)
        ? peakHour
        : null;

  if (authState === 'unauthorized' && !isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FAF8F5] text-[#1C1917] px-4 py-16">
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-[#EBE7DF] shadow-[0_8px_20px_-4px_rgba(28,25,23,0.08)] max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-bold text-[#14532D]">
              Yêu cầu đăng nhập Quản trị viên
            </h1>
            <p className="text-sm text-[#57534E] leading-relaxed">
              {errorMessage || 'Vui lòng đăng nhập bằng tài khoản Admin để xem báo cáo doanh thu và vận hành.'}
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/login?redirect=/admin/analytics"
              className="w-full py-3 px-5 rounded-xl bg-[#14532D] hover:bg-[#15803D] text-white font-semibold text-sm transition-colors shadow-[0_8px_24px_-4px_rgba(20,83,45,0.35)]"
            >
              Đăng nhập tài khoản Admin
            </Link>
            <Link
              href="/"
              className="w-full py-2.5 px-5 rounded-xl bg-[#F5F2EB] hover:bg-[#EBE7DF] text-[#57534E] font-semibold text-xs transition-colors"
            >
              Quay về Trang chủ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (authState === 'forbidden' && !isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FAF8F5] text-[#1C1917] px-4 py-16">
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-[#EBE7DF] shadow-[0_8px_20px_-4px_rgba(28,25,23,0.08)] max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="m15 9-6 6M9 9l6 6" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-bold text-[#1C1917]">
              Không có quyền truy cập (403)
            </h1>
            <p className="text-sm text-[#57534E] leading-relaxed">
              {errorMessage || 'Chỉ Quản trị viên (Admin) mới được phép xem dữ liệu doanh thu tổng hợp.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Link
              href="/staff/tables"
              className="py-2.5 px-4 rounded-xl bg-[#14532D] hover:bg-[#15803D] text-white font-semibold text-xs transition-colors"
            >
              Quản lý bàn
            </Link>
            <Link
              href="/staff/orders"
              className="py-2.5 px-4 rounded-xl bg-[#F5F2EB] hover:bg-[#EBE7DF] text-[#1C1917] font-semibold text-xs border border-[#D6D0C4] transition-colors"
            >
              Đơn Staff
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F5] text-[#1C1917] pb-20">
      {/* Admin Sub-Navbar (AppShell hides global Navbar on /admin/*) */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#EBE7DF] sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-[#14532D] text-white font-serif font-bold flex items-center justify-center text-base shadow-xs hover:bg-[#15803D] transition-colors shrink-0"
              title="Về trang chủ SmaRes"
            >
              S
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-serif font-bold text-[#14532D] leading-tight">
                  Phân Tích &amp; Thống Kê Điều Hành
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-[#57534E]">
                Tổng hợp MongoDB Aggregation theo múi giờ Việt Nam (+07:00)
                {lastUpdatedLabel ? ` • Cập nhật ${lastUpdatedLabel}` : ''}
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-2 flex-wrap" aria-label="Điều hướng quản trị">
            <Link
              href="/admin/menu"
              className="px-3 py-2 rounded-xl bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-[#D97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Quản lý thực đơn</span>
            </Link>
            <Link
              href="/staff/tables"
              className="px-3 py-2 rounded-xl bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#14532D] border border-[#BBF7D0] text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-[#15803D]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="6" rx="2" />
                <rect x="3" y="14" width="8" height="6" rx="2" />
                <rect x="13" y="14" width="8" height="6" rx="2" />
              </svg>
              <span>Quản lý bàn</span>
            </Link>
            <Link
              href="/staff/qr"
              className="px-3 py-2 rounded-xl bg-white hover:bg-[#F5F2EB] text-[#14532D] border border-[#D6D0C4] text-xs font-bold transition-colors"
            >
              Mã QR bàn
            </Link>
            <Link
              href="/kds"
              className="px-3 py-2 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold transition-colors shadow-xs"
            >
              Bếp KDS
            </Link>
            <Link
              href="/staff/orders"
              className="px-3 py-2 rounded-xl bg-[#14532D] hover:bg-[#0F4C3A] text-white text-xs font-semibold transition-colors shadow-xs"
            >
              Đơn Staff
            </Link>
            <Link
              href="/"
              className="px-3 py-2 rounded-xl bg-white hover:bg-[#F5F2EB] text-[#57534E] text-xs font-semibold transition-colors border border-[#EBE7DF]"
            >
              Trang chủ
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Controls Row: Period Switcher & Refresh */}
        <section className="bg-white p-4 rounded-2xl border border-[#EBE7DF] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.05)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
              Khoảng thời gian phân tích
            </p>
            <p className="text-sm font-serif font-bold text-[#1C1917] mt-0.5">
              Dữ liệu {rangeDays} ngày gần nhất (không tính đơn đã hủy)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex items-center bg-[#F5F2EB] p-1 rounded-xl border border-[#EBE7DF]"
              role="group"
              aria-label="Chọn chu kỳ thống kê"
            >
              {PERIOD_OPTIONS.map((option) => {
                const isActive = rangeDays === option.days;
                return (
                  <button
                    key={option.days}
                    type="button"
                    onClick={() => handleSelectPeriod(option.days)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#14532D] text-white shadow-xs'
                        : 'text-[#57534E] hover:text-[#1C1917] hover:bg-white/70'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F5F2EB] text-[#14532D] border border-[#D6D0C4] text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <svg
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 3v5h-5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-5h5" />
              </svg>
              <span>{isRefreshing ? 'Đang cập nhật...' : 'Làm mới'}</span>
            </button>
          </div>
        </section>

        {/* Inline Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-800"
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
              <svg className="w-5 h-5 text-rose-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 8v5" />
                <circle cx="12" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
              </svg>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shrink-0 cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="h-32 rounded-2xl bg-white border border-[#EBE7DF]" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-80 rounded-2xl bg-white border border-[#EBE7DF]" />
              <div className="h-80 rounded-2xl bg-white border border-[#EBE7DF]" />
            </div>
            <div className="h-72 rounded-2xl bg-white border border-[#EBE7DF]" />
          </div>
        ) : (
          <>
            {/* 4 Executive KPI Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Chỉ số KPI chính">
              {/* KPI 1: Revenue */}
              <div className="bg-white p-5 rounded-2xl border border-[#EBE7DF] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] flex flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
                      Doanh thu ({rangeDays} ngày)
                    </p>
                    <p className="text-2xl sm:text-3xl font-serif font-bold text-[#14532D] mt-2">
                      {formatMoney(kpis.totalRevenue)}
                    </p>
                  </div>
                  <span className="w-10 h-10 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#14532D] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </span>
                </div>
                <p className="text-[11px] text-[#57534E] mt-3 pt-3 border-t border-[#EBE7DF]">
                  Đã loại trừ <strong className="text-[#1C1917]">{kpis.cancelledOrders}</strong> đơn hủy
                </p>
              </div>

              {/* KPI 2: Valid Orders */}
              <div className="bg-white p-5 rounded-2xl border border-[#EBE7DF] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] flex flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
                      Tổng đơn hợp lệ
                    </p>
                    <p className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] mt-2">
                      {kpis.validOrders.toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <span className="w-10 h-10 rounded-xl bg-[#F5F2EB] border border-[#D6D0C4] text-[#1C1917] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                      <rect x="9" y="3" width="6" height="4" rx="1" />
                      <path strokeLinecap="round" d="M9 12h6M9 16h4" />
                    </svg>
                  </span>
                </div>
                <p className="text-[11px] text-[#57534E] mt-3 pt-3 border-t border-[#EBE7DF]">
                  Trên tổng số <strong className="text-[#1C1917]">{kpis.totalOrders}</strong> đơn trong kỳ
                </p>
              </div>

              {/* KPI 3: Average Order Value */}
              <div className="bg-white p-5 rounded-2xl border border-[#EBE7DF] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] flex flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
                      Giá trị TB đơn
                    </p>
                    <p className="text-2xl sm:text-3xl font-serif font-bold text-[#D97706] mt-2">
                      {formatMoney(kpis.avgOrderValue)}
                    </p>
                  </div>
                  <span className="w-10 h-10 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 7h4v4" />
                    </svg>
                  </span>
                </div>
                <p className="text-[11px] text-[#57534E] mt-3 pt-3 border-t border-[#EBE7DF]">
                  Doanh thu bình quân mỗi đơn phục vụ
                </p>
              </div>

              {/* KPI 4: Reservations */}
              <div className="bg-white p-5 rounded-2xl border border-[#EBE7DF] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] flex flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
                      Đặt bàn ({rangeDays} ngày)
                    </p>
                    <p className="text-2xl sm:text-3xl font-serif font-bold text-[#14532D] mt-2">
                      {reservationSummary.activeReservations.toLocaleString('vi-VN')}
                      <span className="text-sm font-sans font-semibold text-[#57534E] ml-1.5">
                        lượt
                      </span>
                    </p>
                  </div>
                  <span className="w-10 h-10 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path strokeLinecap="round" d="M16 3v4M8 3v4M3 10h18" />
                    </svg>
                  </span>
                </div>
                <p className="text-[11px] text-[#57534E] mt-3 pt-3 border-t border-[#EBE7DF]">
                  Tổng <strong className="text-[#1C1917]">{reservationSummary.totalGuests}</strong> thực khách •{' '}
                  <strong className="text-[#15803D]">{reservationSummary.byStatus.CONFIRMED}</strong> chờ nhận bàn
                </p>
              </div>
            </section>

            {/* Empty Database Notice */}
            {!hasAnyData && !errorMessage && (
              <section className="bg-white rounded-2xl border border-dashed border-[#D6D0C4] p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#F5F2EB] text-[#78716C] flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l4-4 4 3 5-6" />
                  </svg>
                </div>
                <h2 className="text-lg font-serif font-bold text-[#1C1917]">
                  Chưa có dữ liệu đơn hàng hoặc đặt bàn trong {rangeDays} ngày qua
                </h2>
                <p className="text-xs sm:text-sm text-[#57534E] max-w-lg mx-auto leading-relaxed">
                  Biểu đồ doanh thu, khung giờ cao điểm và bảng xếp hạng món bán chạy sẽ tự động hiển thị ngay khi phát sinh giao dịch mới.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  <Link
                    href="/staff/tables"
                    className="px-4 py-2 rounded-xl bg-[#14532D] text-white text-xs font-semibold hover:bg-[#15803D] transition-colors"
                  >
                    Mở bàn &amp; Check-in
                  </Link>
                  <Link
                    href="/admin/menu"
                    className="px-4 py-2 rounded-xl bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] text-xs font-semibold hover:bg-[#FEF3C7] transition-colors"
                  >
                    Kiểm tra thực đơn
                  </Link>
                </div>
              </section>
            )}

            {/* Charts Row: Recharts Revenue Bar Chart (Day/Week) + Hourly Peak Distribution */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RevenueChartSection
                  refreshNonce={reloadNonce}
                  onAuthError={handleChartAuthError}
                />
              </div>

              {/* Hourly Peak Distribution (+07:00) */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#EBE7DF] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base sm:text-lg font-serif font-bold text-[#1C1917]">
                      Khung giờ cao điểm
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] text-[10px] font-bold">
                      +07:00
                    </span>
                  </div>
                  <p className="text-xs text-[#57534E]">
                    Phân bổ doanh thu và lượt đơn theo 24 giờ trong ngày
                  </p>
                </div>

                {/* Selected / Peak Hour Callout */}
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE7DF] flex items-center justify-between gap-2">
                  {activeHourPoint ? (
                    <>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">
                          {hoveredHour !== null ? 'Khung giờ đang xem' : 'Khung giờ vàng'}
                        </p>
                        <p className="text-sm font-serif font-bold text-[#1C1917]">
                          {String(activeHourPoint.hour).padStart(2, '0')}:00 –{' '}
                          {String((activeHourPoint.hour + 1) % 24).padStart(2, '0')}:00
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-[#D97706]">
                          {formatMoney(activeHourPoint.revenue)}
                        </p>
                        <p className="text-[11px] text-[#57534E]">
                          {activeHourPoint.orders} đơn
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-[#78716C]">Chưa ghi nhận đơn hàng theo khung giờ</p>
                  )}
                </div>

                {/* 24-Hour CSS/SVG Column Grid */}
                <div className="space-y-2">
                  <div
                    className="h-40 flex items-end gap-1 pt-4 border-b border-[#EBE7DF]"
                    role="img"
                    aria-label="Phân bổ đơn hàng theo 24 giờ"
                  >
                    {hourlyDistribution.map((slot) => {
                      const heightPct =
                        slot.revenue > 0
                          ? Math.max(8, Math.round((slot.revenue / maxHourlyRevenue) * 100))
                          : slot.orders > 0
                            ? Math.max(8, Math.round((slot.orders / maxHourlyOrders) * 100))
                            : 3;
                      const isPeakHourSlot =
                        peakHour !== null &&
                        slot.hour === peakHour.hour &&
                        (peakHour.revenue > 0 || peakHour.orders > 0);
                      const isHovered = hoveredHour === slot.hour;
                      const isPrimeMealHour =
                        (slot.hour >= 11 && slot.hour <= 14) ||
                        (slot.hour >= 17 && slot.hour <= 21);

                      return (
                        <button
                          key={slot.hour}
                          type="button"
                          onMouseEnter={() => setHoveredHour(slot.hour)}
                          onMouseLeave={() => setHoveredHour(null)}
                          onFocus={() => setHoveredHour(slot.hour)}
                          onBlur={() => setHoveredHour(null)}
                          aria-label={`Khung ${slot.label}: ${formatMoney(slot.revenue)}, ${slot.orders} đơn`}
                          title={`${slot.label}: ${formatMoney(slot.revenue)} (${slot.orders} đơn)`}
                          className="flex-1 h-full flex flex-col justify-end group cursor-pointer focus:outline-none"
                        >
                          <span
                            style={{ height: `${heightPct}%` }}
                            className={`w-full rounded-t-sm transition-all ${
                              slot.revenue === 0 && slot.orders === 0
                                ? 'bg-[#EBE7DF]'
                                : isHovered || isPeakHourSlot
                                  ? 'bg-[#D97706]'
                                  : isPrimeMealHour
                                    ? 'bg-[#14532D]'
                                    : 'bg-[#15803D]/70'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-medium text-[#78716C]">
                    <span>00h</span>
                    <span>06h</span>
                    <span>12h</span>
                    <span>18h</span>
                    <span>23h</span>
                  </div>
                </div>

                {/* Status Legend */}
                <div className="flex items-center justify-between text-[11px] text-[#57534E] pt-1">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#D97706]" />
                    Giờ cao điểm nhất
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#14532D]" />
                    Khung trưa / tối
                  </span>
                </div>
              </div>
            </section>

            {/* Bottom Section: Top Selling Dishes Table + Order & Reservation Status Breakdown */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Best-Selling Dishes Table */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EBE7DF] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-[#EBE7DF] flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base sm:text-lg font-serif font-bold text-[#1C1917]">
                      Top Món Bán Chạy
                    </h2>
                    <p className="text-xs text-[#57534E]">
                      Xếp hạng theo số lượng phần bán ra trong {rangeDays} ngày (đã trừ đơn hủy)
                    </p>
                  </div>
                  <Link
                    href="/admin/menu"
                    className="text-xs font-bold text-[#14532D] hover:text-[#15803D] flex items-center gap-1"
                  >
                    <span>Quản lý thực đơn</span>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                    </svg>
                  </Link>
                </div>

                {topDishes.length === 0 ? (
                  <div className="p-10 text-center text-sm text-[#57534E]">
                    Chưa có món ăn nào được bán trong khoảng thời gian đã chọn.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#FAF8F5] border-b border-[#EBE7DF] text-[11px] font-bold uppercase tracking-wider text-[#78716C]">
                          <th className="py-3 px-4 w-14 text-center">Hạng</th>
                          <th className="py-3 px-4">Tên món</th>
                          <th className="py-3 px-4 text-right">Số lượng</th>
                          <th className="py-3 px-4 text-right hidden sm:table-cell">Số đơn</th>
                          <th className="py-3 px-4 text-right">Doanh thu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EBE7DF] text-sm">
                        {topDishes.map((dish, idx) => {
                          const sharePct = Math.max(
                            4,
                            Math.round((dish.revenue / maxDishRevenue) * 100)
                          );
                          const rankClass =
                            idx === 0
                              ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                              : idx < 3
                                ? 'bg-[#F0FDF4] text-[#14532D] border-[#BBF7D0]'
                                : 'bg-[#F5F2EB] text-[#57534E] border-[#D6D0C4]';

                          return (
                            <tr
                              key={dish.menuItemId || `${dish.name}-${idx}`}
                              className="hover:bg-[#FAF8F5] transition-colors"
                            >
                              <td className="py-3.5 px-4 text-center">
                                <span
                                  className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold border ${rankClass}`}
                                >
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="font-serif font-bold text-[#1C1917] leading-snug">
                                  {dish.name}
                                </p>
                                <div className="mt-1.5 h-1.5 w-full max-w-[180px] rounded-full bg-[#F5F2EB] overflow-hidden">
                                  <div
                                    style={{ width: `${sharePct}%` }}
                                    className={`h-full rounded-full ${
                                      idx === 0 ? 'bg-[#D97706]' : 'bg-[#14532D]'
                                    }`}
                                  />
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-right font-semibold text-[#1C1917] whitespace-nowrap">
                                {dish.quantity.toLocaleString('vi-VN')} phần
                              </td>
                              <td className="py-3.5 px-4 text-right text-[#57534E] hidden sm:table-cell whitespace-nowrap">
                                {dish.orderCount.toLocaleString('vi-VN')} đơn
                              </td>
                              <td className="py-3.5 px-4 text-right font-serif font-bold text-[#D97706] whitespace-nowrap">
                                {formatMoney(dish.revenue)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Status Breakdown Cards: Orders + Reservations */}
              <div className="space-y-6">
                {/* Order Status Breakdown */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#EBE7DF] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] space-y-4">
                  <div>
                    <h2 className="text-base font-serif font-bold text-[#1C1917]">
                      Trạng thái đơn hàng
                    </h2>
                    <p className="text-xs text-[#57534E]">
                      Phân bổ tất cả {kpis.totalOrders} đơn trong {rangeDays} ngày
                    </p>
                  </div>

                  <div className="space-y-3">
                    {statusBreakdown.map((item) => {
                      const meta = ORDER_STATUS_META[item.status];
                      const pct =
                        kpis.totalOrders > 0
                          ? Math.round((item.count / kpis.totalOrders) * 100)
                          : 0;
                      return (
                        <div key={item.status} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold border ${meta.badgeClass}`}
                            >
                              {meta.label}
                            </span>
                            <span className="font-semibold text-[#1C1917]">
                              {item.count} đơn ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[#F5F2EB] overflow-hidden">
                            <div
                              style={{ width: `${pct}%` }}
                              className={`h-full rounded-full transition-all ${meta.barClass}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reservation Status Breakdown */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#EBE7DF] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-serif font-bold text-[#1C1917]">
                        Tổng quan đặt bàn
                      </h2>
                      <p className="text-xs text-[#57534E]">
                        {reservationSummary.totalReservations} lượt đặt • {reservationSummary.totalGuests} khách
                      </p>
                    </div>
                    <Link
                      href="/staff/tables"
                      className="text-xs font-bold text-[#14532D] hover:text-[#15803D]"
                    >
                      Check-in →
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {(Object.keys(RESERVATION_STATUS_META) as ReservationStatusKey[]).map(
                      (statusKey) => {
                        const meta = RESERVATION_STATUS_META[statusKey];
                        const count = reservationSummary.byStatus[statusKey] ?? 0;
                        return (
                          <div
                            key={statusKey}
                            className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE7DF] space-y-1"
                          >
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${meta.badgeClass}`}
                            >
                              {meta.label}
                            </span>
                            <p className="text-lg font-serif font-bold text-[#1C1917]">
                              {count}
                            </p>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
