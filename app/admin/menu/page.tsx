"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { INITIAL_MENU_ITEMS, MenuItemData } from '@/app/lib/menuInitialData';
import { useToast } from '@/components/ui/Toast';
import { formatMoney } from '@/app/lib/format';

interface MenuApiResponse {
  success?: boolean;
  data?: MenuItemData[];
  message?: string;
}

interface ToggleAvailabilityResponse {
  success?: boolean;
  message?: string;
  data?: {
    _id?: string;
    name?: string;
    isAvailable?: boolean;
  };
}

export default function AdminMenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItemData[]>(INITIAL_MENU_ITEMS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Tải danh sách thực đơn từ API
  useEffect(() => {
    let isCancelled = false;

    const fetchMenu = async () => {
      try {
        const res = await fetch('/api/menu', { cache: 'no-store' });
        const json = (await res.json()) as MenuApiResponse;
        if (!isCancelled && res.ok && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setMenuItems(json.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải thực đơn:', err);
        if (!isCancelled) {
          showToast('Không thể đồng bộ thực đơn mới nhất từ máy chủ, đang hiển thị dữ liệu mặc định.', 'warning');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchMenu();

    return () => {
      isCancelled = true;
    };
  }, [showToast]);

  // =========================================================================
  // TK-163: XỬ LÝ CÔNG TẮC 1 CHẠM BẬT/TẮT 'HẾT MÓN NHANH'
  // =========================================================================
  const handleToggleAvailability = async (item: MenuItemData) => {
    if (!item._id) return;

    const previousState = item.isAvailable !== false;
    const newState = !previousState;
    setTogglingId(item._id);

    // 1. Optimistic Update trên UI ngay lập tức
    setMenuItems((prev) =>
      prev.map((dish) =>
        dish._id === item._id ? { ...dish, isAvailable: newState } : dish
      )
    );

    try {
      // 2. Gửi request PATCH tới API toggle-availability (camelCase isAvailable)
      const res = await fetch(`/api/menu/${item._id}/toggle-availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: newState }),
      });

      let json: ToggleAvailabilityResponse = {};
      try {
        json = (await res.json()) as ToggleAvailabilityResponse;
      } catch {
        json = {};
      }

      if (!res.ok || !json.success) {
        // Rollback lại trạng thái cũ nếu API từ chối
        setMenuItems((prev) =>
          prev.map((dish) =>
            dish._id === item._id ? { ...dish, isAvailable: previousState } : dish
          )
        );
        showToast(json.message || 'Không thể cập nhật trạng thái món lúc này.', 'error');
        return;
      }

      const confirmedState =
        typeof json.data?.isAvailable === 'boolean' ? json.data.isAvailable : newState;

      setMenuItems((prev) =>
        prev.map((dish) =>
          dish._id === item._id ? { ...dish, isAvailable: confirmedState } : dish
        )
      );

      showToast(
        `Đã ${confirmedState ? 'BẬT (Còn món)' : 'TẮT (Hết món)'}: "${item.name}"`,
        'success'
      );
    } catch (err) {
      console.error('Lỗi khi gọi API toggle-availability:', err);
      // Rollback UI state khi mất kết nối mạng hoặc lỗi máy chủ
      setMenuItems((prev) =>
        prev.map((dish) =>
          dish._id === item._id ? { ...dish, isAvailable: previousState } : dish
        )
      );
      showToast('Mất kết nối máy chủ. Đã hoàn tác trạng thái món ăn.', 'error');
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
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !normalizedQuery ||
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.description.toLowerCase().includes(normalizedQuery);
    const matchesCategory =
      selectedCategory === 'Tất cả' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="min-h-screen bg-[#faf8f5] text-[#1c1917] pb-20">
      {/* Header Quản trị Thực đơn (AppShell tự động ẩn Navbar/Footer trên /admin/*) */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#ebe7df] sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-[#14532d] text-white font-serif font-bold flex items-center justify-center text-base shadow-xs hover:bg-[#15803d] transition-colors shrink-0"
              title="Về trang chủ SmaRes"
            >
              S
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-serif font-bold text-[#14532d] leading-tight">
                Quản Lý Thực Đơn &amp; Kho Món (Admin)
              </h1>
              <p className="text-[11px] text-[#57534e]">
                Bật/Tắt trạng thái phục vụ 1 chạm cho Bếp và Thu ngân
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/kds"
              className="px-3 py-2 rounded-xl bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <svg className="w-4 h-4 text-[#fef3c7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"></path>
                <line x1="6" y1="17" x2="18" y2="17"></line>
              </svg>
              <span>Bếp KDS</span>
            </Link>
            <Link
              href="/staff/orders"
              className="px-3 py-2 rounded-xl bg-[#14532d] hover:bg-[#0f3d21] text-white text-xs font-semibold transition-colors shadow-xs"
            >
              Đơn Staff
            </Link>
            <Link
              href="/table-menu"
              className="px-3 py-2 rounded-xl bg-[#f5f2eb] hover:bg-[#ebe7df] text-[#1c1917] text-xs font-semibold transition-colors border border-[#d6d0c4]"
            >
              Menu bàn
            </Link>
            <Link
              href="/"
              className="px-3 py-2 rounded-xl bg-white hover:bg-[#f5f2eb] text-[#57534e] text-xs font-semibold transition-colors border border-[#ebe7df]"
            >
              Trang chủ
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* =============================================================== */}
        {/* THANH THỐNG KÊ NHANH TÌNH TRẠNG KHO MÓN                         */}
        {/* =============================================================== */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-[#ebe7df] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)]">
            <p className="text-xs text-[#57534e] font-medium">Tổng thực đơn</p>
            <p className="text-2xl font-serif font-bold text-[#1c1917] mt-1">{totalDishes}</p>
          </div>
          <div className="bg-[#f0fdf4] p-4 rounded-2xl border border-[#bbf7d0] shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#15803d] font-bold">Đang phục vụ</p>
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            </div>
            <p className="text-2xl font-serif font-bold text-[#14532d] mt-1">{availableCount}</p>
          </div>
          <div className="bg-[#fee2e2]/60 p-4 rounded-2xl border border-[#fca5a5] shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#b91c1c] font-bold">Tạm hết món</p>
              <svg className="w-3.5 h-3.5 text-[#b91c1c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <p className="text-2xl font-serif font-bold text-[#b91c1c] mt-1">{outOfStockCount}</p>
          </div>
        </div>

        {/* =============================================================== */}
        {/* BỘ LỌC DANH MỤC & TÌM KIẾM MÓN ĂN                              */}
        {/* =============================================================== */}
        <div className="bg-white p-4 rounded-2xl border border-[#ebe7df] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Input tìm kiếm */}
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm món ăn theo tên hoặc mô tả..."
                className="w-full pl-9 pr-8 py-2.5 rounded-xl text-xs sm:text-sm bg-white border border-[#d6d0c4] focus:bg-white focus:border-[#14532d] focus:ring-2 focus:ring-[#14532d]/20 focus:outline-none transition-all"
              />
              <svg className="w-4 h-4 absolute left-3 top-3 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>

            {/* Các tab danh mục */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {['Tất cả', 'Khai vị', 'Món chính', 'Tráng miệng', 'Đồ uống'].map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#14532d] text-white shadow-xs'
                        : 'text-[#57534e] hover:text-[#1c1917] hover:bg-[#f5f2eb] border border-transparent'
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
        <div className="bg-white rounded-2xl border border-[#ebe7df] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] overflow-hidden">
          <div className="p-4 border-b border-[#ebe7df] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-serif font-bold text-[#1c1917]">
                Danh sách thực đơn ({filteredItems.length} món)
              </h2>
              {isLoading && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#14532d] bg-[#f0fdf4] border border-[#bbf7d0] px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#14532d] animate-ping" />
                  Đang đồng bộ...
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#57534e] flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
                <path d="M9 18h6"></path>
                <path d="M10 22h4"></path>
              </svg>
              <span>Gạt công tắc để cập nhật trạng thái món ngay lập tức</span>
            </span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-[#57534e]">
                Không tìm thấy món ăn phù hợp với bộ lọc hiện tại.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('Tất cả');
                }}
                className="px-4 py-2 rounded-xl bg-[#14532d] text-white text-xs font-semibold hover:bg-[#0f3d21] transition-colors"
              >
                Hiển thị tất cả món
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#ebe7df]">
              {filteredItems.map((dish) => {
                const isAvailable = dish.isAvailable !== false;
                const isPending = togglingId === dish._id;

                return (
                  <div
                    key={dish._id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                      !isAvailable ? 'bg-stone-50/70 opacity-80' : 'hover:bg-[#faf8f5]'
                    }`}
                  >
                    {/* Cột thông tin món ăn */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-[#ebe7df] shrink-0 bg-stone-100">
                        <Image
                          src={dish.imageUrl}
                          alt={dish.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-serif font-bold text-sm text-[#1c1917] leading-snug">
                            {dish.name}
                          </h3>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#faf8f5] text-[#57534e] border border-[#ebe7df]">
                            {dish.category}
                          </span>
                          {dish.isPreOrderOnly && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#fffbeb] text-[#92400e] border border-[#fde68a] flex items-center gap-1">
                              <svg className="w-2.5 h-2.5 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
                              </svg>
                              <span>Đặt trước</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#57534e] line-clamp-1 mt-0.5">
                          {dish.description}
                        </p>
                        <p className="text-xs font-serif font-bold text-[#d97706] mt-1">
                          {formatMoney(dish.price)}
                        </p>
                      </div>
                    </div>

                    {/* Cột điều khiển: CÔNG TẮC 1 CHẠM BẬT/TẮT HẾT MÓN (TK-163) */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#ebe7df]">
                      {/* Badge trạng thái trực quan */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          isAvailable
                            ? 'bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]'
                            : 'bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5]'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        <span>{isAvailable ? 'Còn món' : 'Hết món'}</span>
                      </span>

                      {/* Toggle Switch Button (min 44px touch-friendly container) */}
                      <div className="flex items-center gap-2 min-h-[44px]">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(dish)}
                          disabled={isPending}
                          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#14532d]/30 disabled:opacity-50 ${
                            isAvailable ? 'bg-[#14532d]' : 'bg-stone-300'
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
          )}
        </div>
      </div>
    </main>
  );
}
