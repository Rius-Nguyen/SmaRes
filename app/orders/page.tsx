'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  KdsOrderStatus,
  OrderItemCustomization,
  formatCustomizationLabels,
  normalizeOrderStatus,
} from '@/app/lib/kdsAggregation';

type OrderStatusFilter = 'ALL' | KdsOrderStatus;

interface CustomerOrderItem {
  _id?: string;
  menuItemId?: string;
  foodId?: string;
  name: string;
  price: number;
  quantity: number;
  customizations?: OrderItemCustomization;
}

interface CustomerOrder {
  _id: string;
  orderCode?: string;
  tableNumber?: string;
  phone?: string;
  notes?: string;
  items: CustomerOrderItem[];
  totalAmount: number;
  status: KdsOrderStatus | string;
  createdAt?: string;
}

interface OrdersApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  orders?: CustomerOrder[];
}

const ORDER_STATUS_META: Record<
  KdsOrderStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  PENDING: {
    label: 'Chờ bếp xác nhận',
    badgeClass: 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]',
    dotClass: 'bg-[#d97706]',
  },
  COOKING: {
    label: 'Đang chế biến',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    dotClass: 'bg-sky-600 animate-pulse',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    badgeClass: 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]',
    dotClass: 'bg-[#22c55e]',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badgeClass: 'bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]',
    dotClass: 'bg-[#b91c1c]',
  },
};

const FILTER_OPTIONS: ReadonlyArray<{ id: OrderStatusFilter; label: string }> = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PENDING', label: 'Chờ xác nhận' },
  { id: 'COOKING', label: 'Đang chế biến' },
  { id: 'COMPLETED', label: 'Hoàn thành' },
  { id: 'CANCELLED', label: 'Đã hủy' },
];

function formatCurrency(amount: number): string {
  return `${Number(amount || 0).toLocaleString('vi-VN')}đ`;
}

function formatDateTimeVi(iso?: string): string {
  if (!iso) return 'Vừa tạo';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Vừa tạo';
  return (
    date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
    ' • ' +
    date.toLocaleDateString('vi-VN')
  );
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isUnauthorized, setIsUnauthorized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('ALL');
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    const loadOrders = async () => {
      try {
        const res = await fetch('/api/orders', {
          method: 'GET',
          cache: 'no-store',
        });

        if (cancelled) return;

        if (res.status === 401) {
          setIsUnauthorized(true);
          setOrders([]);
          setError(null);
          return;
        }

        const json = (await res.json()) as OrdersApiResponse;
        if (!res.ok || !json.success) {
          setError(json.message || json.error || 'Không thể tải danh sách đơn hàng.');
          return;
        }

        setIsUnauthorized(false);
        setError(null);
        setOrders(Array.isArray(json.orders) ? json.orders : []);
      } catch {
        if (!cancelled) {
          setError('Không thể kết nối máy chủ để tải đơn hàng.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void loadOrders();

    const interval = setInterval(() => {
      void loadOrders();
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [reloadNonce]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setError(null);
    setReloadNonce((prev) => prev + 1);
  };

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'ALL') return orders;
    return orders.filter((order) => normalizeOrderStatus(order.status) === statusFilter);
  }, [orders, statusFilter]);

  if (loading) {
    return (
      <main className="min-h-screen flex justify-center items-center bg-[#faf8f5] text-[#1c1917] px-4">
        <div className="text-center flex flex-col items-center gap-3">
          <span className="w-10 h-10 border-3 border-[#14532d]/20 border-t-[#14532d] rounded-full animate-spin" />
          <p className="text-[#57534e] font-medium text-sm">
            Đang tải trạng thái đơn hàng của bạn...
          </p>
        </div>
      </main>
    );
  }

  if (isUnauthorized) {
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
            Đăng nhập để theo dõi đơn hàng
          </h1>
          <p className="text-sm text-[#57534e] mb-7 leading-relaxed">
            Vui lòng đăng nhập tài khoản SmaRes để xem tiến độ chế biến từ Bếp và lịch sử các đơn món bạn đã đặt.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/login?redirect=/orders"
              className="bg-[#14532d] hover:bg-[#15803d] text-white px-5 py-3.5 rounded-xl font-semibold text-sm transition-colors shadow-[0_8px_24px_-4px_rgba(20,83,45,0.35)]"
            >
              Đăng nhập ngay
            </Link>
            <Link
              href="/menu"
              className="bg-[#faf8f5] hover:bg-[#f5f2eb] text-[#1c1917] border border-[#d6d0c4] px-5 py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              Xem thực đơn
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf8f5] text-[#1c1917] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-[#ebe7df] p-6 sm:p-8 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#ebe7df]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#15803d] bg-[#f0fdf4] px-3.5 py-1.5 rounded-full border border-[#bbf7d0] inline-block mb-2">
                Theo dõi đơn món
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#14532d]">
                Đơn Hàng Của Tôi
              </h1>
              <p className="text-xs sm:text-sm text-[#57534e] mt-1">
                Cập nhật tự động tiến độ chế biến từ Bếp SmaRes mỗi 15 giây
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-[#d6d0c4] bg-white hover:bg-[#f5f2eb] text-[#1c1917] text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
              >
                <svg
                  className={`w-4 h-4 text-[#14532d] ${isRefreshing ? 'animate-spin' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
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

              <Link
                href="/history"
                className="min-h-[42px] px-4 py-2 rounded-xl border border-[#ebe7df] bg-[#faf8f5] hover:bg-[#f5f2eb] text-[#14532d] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
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
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Lịch sử đặt bàn</span>
              </Link>

              <Link
                href="/menu"
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                <span>Gọi thêm món</span>
              </Link>
            </div>
          </div>

          {/* Filter pills */}
          <div className="pt-4 flex flex-wrap items-center gap-2">
            {FILTER_OPTIONS.map((option) => {
              const active = statusFilter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setStatusFilter(option.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#14532d] text-white border-[#14532d]'
                      : 'bg-[#faf8f5] text-[#57534e] border-[#ebe7df] hover:border-[#d6d0c4]'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="p-4 sm:p-5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2.5 text-xs sm:text-sm">
              <svg
                className="w-5 h-5 text-rose-600 shrink-0 mt-0.5"
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
            <button
              type="button"
              onClick={handleRefresh}
              className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer self-start sm:self-auto"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Empty state */}
        {!error && filteredOrders.length === 0 ? (
          <div className="p-10 bg-white border border-[#ebe7df] rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] text-center">
            <div className="w-14 h-14 bg-[#faf8f5] border border-[#ebe7df] rounded-full flex items-center justify-center mx-auto mb-3 text-[#78716c]">
              <svg
                className="w-7 h-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <h2 className="font-serif font-bold text-[#1c1917] text-lg mb-1">
              {statusFilter === 'ALL'
                ? 'Bạn chưa có đơn hàng nào'
                : 'Không có đơn hàng ở trạng thái này'}
            </h2>
            <p className="text-[#57534e] text-xs sm:text-sm max-w-md mx-auto mb-6">
              Hãy khám phá thực đơn SmaRes hoặc đặt bàn kèm thực đơn để theo dõi tiến độ phục vụ trực tiếp tại đây.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/menu"
                className="px-5 py-2.5 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white text-xs sm:text-sm font-semibold transition-colors"
              >
                Khám phá thực đơn
              </Link>
              <Link
                href="/booking"
                className="px-5 py-2.5 rounded-xl bg-[#faf8f5] hover:bg-[#f5f2eb] text-[#1c1917] border border-[#d6d0c4] text-xs sm:text-sm font-semibold transition-colors"
              >
                Đặt bàn ngay
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const normalizedStatus = normalizeOrderStatus(order.status);
              const meta = ORDER_STATUS_META[normalizedStatus];
              const displayCode = order.orderCode || `#${order._id.slice(-6).toUpperCase()}`;

              return (
                <article
                  key={order._id}
                  className="border border-[#ebe7df] rounded-2xl p-5 sm:p-6 bg-white shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] transition-all"
                >
                  {/* Top row */}
                  <div className="flex flex-wrap justify-between items-start gap-3 pb-4 border-b border-[#ebe7df]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm sm:text-base font-bold text-[#14532d]">
                          {displayCode}
                        </span>
                        {order.tableNumber && (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#f5f2eb] text-[#1c1917] border border-[#ebe7df]">
                            Bàn {order.tableNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#78716c] mt-1 flex items-center gap-1.5">
                        <svg
                          className="w-3.5 h-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>{formatDateTimeVi(order.createdAt)}</span>
                      </p>
                    </div>

                    {/* Read-only Vietnamese status badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-full border ${meta.badgeClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
                      <span>{meta.label}</span>
                    </span>
                  </div>

                  {/* Items list */}
                  <div className="py-4 space-y-3">
                    <p className="text-[11px] font-bold text-[#78716c] uppercase tracking-wider">
                      Chi tiết món đã gọi
                    </p>
                    <div className="divide-y divide-[#f5f2eb]">
                      {order.items.map((item, idx) => {
                        const labels = formatCustomizationLabels(item.customizations, {
                          includeDefaultLevels: false,
                        });

                        return (
                          <div key={`${order._id}-item-${idx}`} className="py-2.5 first:pt-0 last:pb-0">
                            <div className="flex justify-between items-start gap-4 text-xs sm:text-sm">
                              <div className="space-y-1">
                                <p className="text-[#1c1917] font-semibold">
                                  {item.name}{' '}
                                  <span className="text-[#78716c] font-normal">
                                    × {item.quantity}
                                  </span>
                                </p>
                                {labels.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {labels.map((label, lIdx) => (
                                      <span
                                        key={lIdx}
                                        className="text-[11px] px-2 py-0.5 rounded-md bg-[#faf8f5] text-[#57534e] border border-[#ebe7df]"
                                      >
                                        {label}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span className="text-[#1c1917] font-mono font-semibold whitespace-nowrap">
                                {formatCurrency(item.price * item.quantity)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {order.notes && order.notes.trim() !== '' && (
                      <div className="mt-2 px-3 py-2 rounded-xl bg-[#faf8f5] border border-[#ebe7df] text-xs text-[#57534e]">
                        <strong className="text-[#1c1917]">Ghi chú:</strong> {order.notes}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pt-3.5 border-t border-[#ebe7df] flex flex-wrap justify-between items-center gap-3 text-xs sm:text-sm">
                    <div className="text-[#57534e] flex items-center gap-3">
                      {order.phone && order.phone.trim() !== '' ? (
                        <span>
                          SĐT liên hệ: <strong className="text-[#1c1917]">{order.phone}</strong>
                        </span>
                      ) : (
                        <span>Đặt món trực tiếp tại hệ thống SmaRes</span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-[#78716c] block font-medium">
                        Tổng thanh toán
                      </span>
                      <span className="text-lg font-serif font-bold text-[#d97706]">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
