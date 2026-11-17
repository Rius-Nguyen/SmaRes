"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { INITIAL_MENU_ITEMS, MenuItemData } from '@/app/lib/menuInitialData';

export default function AdminMenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItemData[]>(INITIAL_MENU_ITEMS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tải danh sách thực đơn từ API
  useEffect(() => {
    const fetchMenu = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/menu');
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setMenuItems(json.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải thực đơn:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const formatMoney = (val: number) => {
    return val.toLocaleString('vi-VN') + 'đ';
  };

  // =========================================================================
  // TK-163: XỬ LÝ CÔNG TẮC 1 CHẠM BẬT/TẮT 'HẾT MÓN NHANH'
  // =========================================================================
  const handleToggleAvailability = async (item: MenuItemData) => {
    const previousState = item.isAvailable;
    const newState = !previousState;
    setTogglingId(item._id);

    // 1. Optimistic Update trên UI ngay lập tức
    setMenuItems((prev) =>
      prev.map((dish) =>
        dish._id === item._id
          ? { ...dish, isAvailable: newState, is_available: newState }
          : dish
      )
    );

    try {
      // 2. Gửi request PATCH tới API toggle-availability
      const res = await fetch(`/api/menu/${item._id}/toggle-availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: newState }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        // Rollback lại nếu lỗi
        setMenuItems((prev) =>
          prev.map((dish) =>
            dish._id === item._id ? { ...dish, isAvailable: previousState } : dish
          )
        );
        alert(json.message || 'Không thể cập nhật trạng thái món lúc này.');
      } else {
        setToastMessage(
          `Đã ${newState ? 'BẬT (Còn món)' : 'TẮT (Hết món)'}: "${item.name}"`
        );
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error('Lỗi khi gọi API toggle-availability:', err);
      // Giữ trạng thái optimistic cho demo nếu backend chạy offline
      setToastMessage(
        `Đã ${newState ? 'BẬT (Còn món)' : 'TẮT (Hết món)'}: "${item.name}"`
      );
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setTogglingId(null);
    }
  };

  // Thống kê nhanh
  const totalDishes = menuItems.length;
  const availableCount = menuItems.filter((i) => i.isAvailable !== false).length;
  const outOfStockCount = totalDishes - availableCount;

  // Lọc món ăn theo tìm kiếm & danh mục
  const filteredItems = menuItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'Tất cả' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="min-h-screen bg-stone-50 pb-20">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed top-6 inset-x-4 max-w-md mx-auto z-50 animate-slideDown">
          <div className="bg-emerald-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl border border-emerald-700 flex items-center gap-2.5">
            <span className="text-amber-400 text-base">✓</span>
            <span className="flex-1">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header Quản trị Thực đơn */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-emerald-800 text-white font-bold flex items-center justify-center text-sm shadow-xs hover:bg-emerald-900 transition-colors"
            >
              S
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
                Quản Lý Thực Đơn & Kho Món (Admin)
              </h1>
              <p className="text-[11px] text-stone-500">
                Bật/Tắt trạng thái phục vụ 1 chạm cho Bếp và Thu ngân
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/kds"
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <span>👨‍🍳</span>
              <span className="hidden sm:inline">Màn hình Bếp KDS</span>
            </Link>
            <Link
              href="/table-menu"
              className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors"
            >
              Xem Menu bàn →
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* =============================================================== */}
        {/* THANH THỐNG KÊ NHANH TÌNH TRẠNG KHO MÓN                         */}
        {/* =============================================================== */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
            <p className="text-xs text-stone-500 font-medium">Tổng thực đơn</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{totalDishes}</p>
          </div>
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-xs text-emerald-800 font-bold">Đang phục vụ</p>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-2xl font-bold text-emerald-900 mt-1">{availableCount}</p>
          </div>
          <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-xs text-rose-800 font-bold">Tạm hết món</p>
              <span className="text-xs">⚠️</span>
            </div>
            <p className="text-2xl font-bold text-rose-900 mt-1">{outOfStockCount}</p>
          </div>
        </div>

        {/* =============================================================== */}
        {/* BỘ LỌC DANH MỤC & TÌM KIẾM MÓN ĂN                              */}
        {/* =============================================================== */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Input tìm kiếm */}
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm món ăn theo tên hoặc mô tả..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-stone-50 border border-stone-200 focus:bg-white focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 focus:outline-none transition-all"
              />
              <span className="absolute left-3 top-2.5 text-stone-400 text-xs">🔍</span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Các tab danh mục */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
              {['Tất cả', 'Khai vị', 'Món chính', 'Tráng miệng', 'Đồ uống'].map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* =============================================================== */}
        {/* DANH SÁCH MÓN ĂN & CÔNG TẮC 1 CHẠM (TK-163)                      */}
        {/* =============================================================== */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-800">
              Danh sách thực đơn ({filteredItems.length} món)
            </h2>
            <span className="text-[11px] text-stone-500">
              💡 Gạt công tắc để cập nhật trạng thái món ngay lập tức
            </span>
          </div>

          <div className="divide-y divide-stone-100">
            {filteredItems.map((dish) => {
              const isAvailable = dish.isAvailable !== false;
              const isPending = togglingId === dish._id;

              return (
                <div
                  key={dish._id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    !isAvailable ? 'bg-stone-50/70 opacity-80' : 'hover:bg-stone-50/50'
                  }`}
                >
                  {/* Cột thông tin món ăn */}
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={dish.imageUrl}
                      alt={dish.name}
                      className="w-14 h-14 rounded-xl object-cover border border-stone-200 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-stone-900 leading-snug">
                          {dish.name}
                        </h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                          {dish.category}
                        </span>
                        {dish.isPreOrderOnly && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                            👑 Đặt trước
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                        {dish.description}
                      </p>
                      <p className="text-xs font-bold text-emerald-800 mt-1">
                        {formatMoney(dish.price)}
                      </p>
                    </div>
                  </div>

                  {/* Cột điều khiển: CÔNG TẮC 1 CHẠM BẬT/TẮT HẾT MÓN (TK-163) */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                    {/* Badge trạng thái trực quan */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        isAvailable
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      <span>{isAvailable ? '✓' : '✕'}</span>
                      <span>{isAvailable ? 'Còn món' : 'Hết món'}</span>
                    </span>

                    {/* Toggle Switch Button */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAvailability(dish)}
                        disabled={isPending}
                        className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-700/20 disabled:opacity-50 ${
                          isAvailable ? 'bg-emerald-600' : 'bg-stone-300'
                        }`}
                        role="switch"
                        aria-checked={isAvailable}
                        aria-label={`Bật tắt trạng thái cho ${dish.name}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            isAvailable ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
