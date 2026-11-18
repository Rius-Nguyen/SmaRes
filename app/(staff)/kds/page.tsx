"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  KDSOrder,
  AggregatedKitchenDish,
  groupKitchenDishes,
  getWaitMinutes,
} from '@/app/lib/kdsAggregation';

// Dữ liệu mẫu đơn hàng bàn ăn bếp SmaRes khi mới khởi tạo
const SAMPLE_KDS_ORDERS: KDSOrder[] = [
  {
    _id: 'ORD-B02-01',
    tableNumber: '02',
    phone: '0901234567',
    totalPrice: 845000,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 14 * 60000).toISOString(), // 14 phút trước
    items: [
      {
        name: 'Phở Bò Wagyu A5 Thượng Hạng Dát Vàng',
        quantity: 2,
        price: 380000,
        category: 'Món chính',
        customizations: {
          spicy_level: 'MEDIUM',
          allergy_notes: '',
        },
      },
      {
        name: 'Gỏi Cuốn Tôm Thịt Thanh Mát',
        quantity: 1,
        price: 85000,
        category: 'Khai vị',
        customizations: {
          spicy_level: 'NONE',
          allergy_notes: 'Không rắc đậu phộng',
        },
      },
    ],
  },
  {
    _id: 'ORD-B05-02',
    tableNumber: '05',
    phone: '0988776655',
    totalPrice: 465000,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 9 * 60000).toISOString(), // 9 phút trước
    items: [
      {
        name: 'Phở Bò Wagyu A5 Thượng Hạng Dát Vàng',
        quantity: 1,
        price: 380000,
        category: 'Món chính',
        customizations: {
          spicy_level: 'NONE',
          allergy_notes: 'Ít hành, nước trong',
        },
      },
      {
        name: 'Gỏi Cuốn Tôm Thịt Thanh Mát',
        quantity: 1,
        price: 85000,
        category: 'Khai vị',
        customizations: {
          spicy_level: 'NONE',
        },
      },
    ],
  },
  {
    _id: 'ORD-B04-03',
    tableNumber: '04',
    phone: '0912348899',
    totalPrice: 505000,
    status: 'COOKING',
    createdAt: new Date(Date.now() - 21 * 60000).toISOString(), // 21 phút trước
    items: [
      {
        name: 'Vịt Quay Bắc Kinh Sốt Mật Ong Rừng Tây Bắc',
        quantity: 1,
        price: 450000,
        category: 'Món chính',
        customizations: {
          spicy_level: 'HOT',
          allergy_notes: 'Da giòn, nhiều sốt mật ong',
        },
      },
      {
        name: 'Trà Sen Vàng Thượng Hạng Tây Hồ',
        quantity: 1,
        price: 55000,
        category: 'Đồ uống',
        customizations: {
          ice_level: '50%',
          sweetness_level: '50%',
        },
      },
    ],
  },
  {
    _id: 'ORD-B08-04',
    tableNumber: '08',
    phone: '0933445566',
    totalPrice: 165000,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 4 * 60000).toISOString(), // 4 phút trước
    items: [
      {
        name: 'Trà Sen Vàng Thượng Hạng Tây Hồ',
        quantity: 3,
        price: 55000,
        category: 'Đồ uống',
        customizations: {
          ice_level: '100%',
          sweetness_level: '100%',
        },
      },
    ],
  },
];

export default function KDSPage() {
  const [orders, setOrders] = useState<KDSOrder[]>(SAMPLE_KDS_ORDERS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'COOKING'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tải danh sách đơn hàng thực từ API /api/orders
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const json = await res.json();
      if (json.success && Array.isArray(json.orders) && json.orders.length > 0) {
        // Hợp nhất đơn hàng thực với dữ liệu mẫu
        setOrders(json.orders);
      }
    } catch (e) {
      console.log('Dùng dữ liệu KDS nội bộ:', e);
    }
  };

  useEffect(() => {
    fetchOrders();
    if (!autoRefresh) return;
    const interval = setInterval(fetchOrders, 10000); // Tự động làm mới mỗi 10 giây
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // =========================================================================
  // TK-164: ÁP DỤNG THUẬT TOÁN GOM MÓN CHẾ BIẾN CHO BẾP
  // =========================================================================
  const aggregatedDishes: AggregatedKitchenDish[] = useMemo(() => {
    return groupKitchenDishes(orders);
  }, [orders]);

  // Lọc danh sách thẻ đơn theo tab
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const s = String(o.status).toUpperCase();
      if (activeFilter === 'PENDING') return s === 'PENDING';
      if (activeFilter === 'COOKING') return s === 'COOKING';
      return s === 'PENDING' || s === 'COOKING';
    });
  }, [orders, activeFilter]);

  // Cập nhật trạng thái một đơn hàng
  const handleUpdateOrderStatus = (orderId: string, nextStatus: 'COOKING' | 'COMPLETED') => {
    setOrders((prev) =>
      prev.map((o) => (o._id === orderId ? { ...o, status: nextStatus } : o))
    );
    setToastMessage(`Đã cập nhật đơn ${orderId} sang "${nextStatus === 'COOKING' ? 'Đang nấu' : 'Hoàn thành'}"`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Nấu xong tất cả các phần của 1 món đang gom nhóm
  const handleBatchCookDish = (dish: AggregatedKitchenDish) => {
    const orderIds = new Set(dish.tableBreakdown.map((t) => t.orderId));
    setOrders((prev) =>
      prev.map((o) => {
        if (orderIds.has(o._id) && String(o.status).toUpperCase() === 'PENDING') {
          return { ...o, status: 'COOKING' };
        }
        return o;
      })
    );
    setToastMessage(`Đã chuyển toàn bộ cụm "${dish.dishName}" (${dish.totalQuantity} phần) sang ĐANG NẤU!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <main className="min-h-screen bg-stone-900 text-stone-100 pb-20">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed top-5 inset-x-4 max-w-md mx-auto z-50 animate-slideDown">
          <div className="bg-emerald-800 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-emerald-600 flex items-center gap-2.5">
            <span className="text-amber-400 text-base">⚡</span>
            <span className="flex-1">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header KDS */}
      <header className="bg-stone-950 border-b border-stone-800 px-4 sm:px-6 h-16 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 font-black flex items-center justify-center text-sm shadow-sm"
          >
            KDS
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg text-white leading-none">
                Bếp SmaRes — Kitchen Display System
              </h1>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Hệ thống gom nhóm chế biến thông minh &amp; Điều phối bếp
            </p>
          </div>
        </div>

        {/* Nút tác vụ nhanh */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >
            {autoRefresh ? (
              <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                <path d="M16 21h5v-5"></path>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            )}
            <span className="hidden sm:inline">
              {autoRefresh ? 'Tự cập nhật (10s)' : 'Tạm dừng'}
            </span>
          </button>

          <Link
            href="/admin/menu"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors flex items-center gap-1.5"
          >
            <span>Kho món</span>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* =============================================================== */}
        {/* KHỐI TK-164: ⚡ TỔNG HỢP CHẾ BIẾN NHANH (BATCH COOKING SUMMARY) */}
        {/* =============================================================== */}
        <section className="bg-stone-950/90 rounded-2xl border-2 border-amber-500/80 p-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Tiêu đề khối gom món */}
          <div className="flex items-center justify-between mb-4 border-b border-stone-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 font-black flex items-center justify-center text-base shadow-sm">
                ⚡
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Tổng Hợp Chế Biến Nhanh (Batch Cooking)
                </h2>
                <p className="text-xs text-amber-400/90">
                  Thuật toán tự động gom các món giống nhau giữa các bàn để nấu cùng lúc
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {aggregatedDishes.length} cụm món cần làm
            </span>
          </div>

          {/* Danh sách thẻ món gom nhóm */}
          {aggregatedDishes.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-xs">
              Hiện tại không có món nào đang chờ chế biến. Bếp đã hoàn thành tất cả đơn!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {aggregatedDishes.map((group) => {
                const waitMinutes = getWaitMinutes(group.oldestOrderTime);
                const isUrgent = waitMinutes >= 15;
                const isCooking = group.status === 'COOKING';

                return (
                  <div
                    key={group.dishKey}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      isCooking
                        ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/30'
                        : isUrgent
                        ? 'bg-rose-950/30 border-rose-600/70'
                        : 'bg-stone-900/90 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div>
                      {/* Tiêu đề: Số lượng x Tên món + Phân bổ bàn */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-start gap-2">
                          <span className="w-7 h-7 rounded-lg bg-amber-500 text-stone-950 font-black flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                            {group.totalQuantity}x
                          </span>
                          <div>
                            <h3 className="font-bold text-sm text-white leading-tight">
                              {group.dishName}
                            </h3>
                            {/* Phân bổ theo số bàn: (Bàn 2: 2, Bàn 5: 1) */}
                            <p className="text-xs font-bold text-amber-400 mt-1">
                              {group.breakdownSummary}
                            </p>
                          </div>
                        </div>

                        {/* Timer chờ */}
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap flex items-center gap-1 ${
                            isUrgent
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                              : 'bg-stone-800 text-stone-300'
                          }`}
                        >
                          <span>⏱️</span>
                          <span>{waitMinutes}p</span>
                        </span>
                      </div>

                      {/* Tóm tắt ghi chú tùy biến của khách */}
                      {group.customizationSummary.length > 0 && (
                        <div className="my-2.5 p-2 rounded-lg bg-stone-950/70 border border-stone-800 space-y-1">
                          {group.customizationSummary.map((note, idx) => (
                            <p key={idx} className="text-[11px] text-stone-300 leading-tight">
                              {note}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Nút hành động chế biến (Touch-friendly 44px) */}
                    <div className="pt-2 mt-2 border-t border-stone-800/80">
                      <button
                        type="button"
                        onClick={() => handleBatchCookDish(group)}
                        className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          isCooking
                            ? 'bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-md'
                            : 'bg-[#14532d] hover:bg-[#15803d] text-white shadow-sm'
                        }`}
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                        <span>{isCooking ? 'Đang nấu cả cụm' : 'Bắt đầu nấu cả cụm'}</span>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                Vé đơn theo từng bàn ({filteredOrders.length} đơn)
              </h2>
            </div>

            {/* Filter trạng thái */}
            <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'PENDING', label: 'Chờ nấu' },
                { id: 'COOKING', label: 'Đang nấu' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id as any)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    activeFilter === f.id
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lưới vé đơn bàn */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredOrders.map((order) => {
              const waitMinutes = getWaitMinutes(order.createdAt);
              const isPending = String(order.status).toUpperCase() === 'PENDING';
              const isCooking = String(order.status).toUpperCase() === 'COOKING';

              return (
                <div
                  key={order._id}
                  className={`bg-stone-950 rounded-2xl border flex flex-col justify-between overflow-hidden shadow-lg transition-all ${
                    isCooking
                      ? 'border-amber-500/80 ring-1 ring-amber-500/40'
                      : 'border-stone-800 hover:border-stone-700'
                  }`}
                >
                  {/* Header vé đơn */}
                  <div
                    className={`p-3.5 flex items-center justify-between border-b ${
                      isCooking
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-stone-900 border-stone-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-black text-white">
                          Bàn {order.tableNumber || order.tableId || '—'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCooking
                              ? 'bg-amber-500 text-stone-950'
                              : 'bg-stone-800 text-stone-300'
                          }`}
                        >
                          {isCooking ? 'Đang nấu' : 'Chờ nấu'}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-400 mt-0.5 font-mono">
                        {order._id}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1 justify-end">
                        <span>⏱️</span>
                        <span>{waitMinutes} phút</span>
                      </span>
                    </div>
                  </div>

                  {/* Danh sách món trong vé */}
                  <div className="p-4 flex-1 space-y-2.5 divide-y divide-stone-900">
                    {order.items.map((item, idx) => {
                      const c = item.customizations;
                      return (
                        <div key={idx} className="pt-2 first:pt-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-xs text-white">
                              {item.quantity}x {item.name}
                            </span>
                          </div>

                          {/* Chi tiết tùy biến (mức cay, đá, ngọt, dị ứng) */}
                          {c && (
                            <div className="text-[11px] text-amber-300/90 pl-3 border-l-2 border-amber-500/40 mt-1 space-y-0.5">
                              {c.spicy_level && c.spicy_level !== 'NONE' && (
                                <p>🌶️ Độ cay: {c.spicy_level}</p>
                              )}
                              {c.ice_level && <p>🧊 Đá: {c.ice_level}</p>}
                              {c.sweetness_level && <p>🍯 Ngọt: {c.sweetness_level}</p>}
                              {c.allergy_notes && (
                                <p className="text-rose-400 font-medium">
                                  ⚠️ Lưu ý: {c.allergy_notes}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Nút đổi trạng thái đơn (Touch-friendly 44px) */}
                  <div className="p-3 bg-stone-900/60 border-t border-stone-800 flex items-center gap-2">
                    {isPending ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(order._id, 'COOKING')}
                        className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span>Bắt đầu nấu</span>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 12h14"></path>
                          <path d="m12 5 7 7-7 7"></path>
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(order._id, 'COMPLETED')}
                        className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white font-bold text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Hoàn thành đơn</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
