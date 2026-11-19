"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useCart } from '@/app/context/CartContext';
import { formatMoney } from '@/app/lib/format';
import { INITIAL_MENU_ITEMS, MenuItemData } from '@/app/lib/menuInitialData';
import DishCard from '@/components/menu/DishCard';
import SpecialDishModal from '@/components/menu/SpecialDishModal';
import { useToast } from '@/components/ui/Toast';

export default function MenuPage() {
  const { cart, addToCart, totalItems, totalPrice, hasActiveBooking, bookingInfo } = useCart();
  const { showToast } = useToast();

  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [menuList, setMenuList] = useState<MenuItemData[]>(INITIAL_MENU_ITEMS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [specialDishModal, setSpecialDishModal] = useState<MenuItemData | null>(null);
  const [cartPopKey, setCartPopKey] = useState<number>(0);

  const prevTotalItemsRef = useRef<number>(totalItems);

  useEffect(() => {
    if (totalItems > prevTotalItemsRef.current) {
      setCartPopKey((k) => k + 1);
    }
    prevTotalItemsRef.current = totalItems;
  }, [totalItems]);

  useEffect(() => {
    let isCancelled = false;

    const fetchMenu = async () => {
      try {
        const res = await fetch('/api/menu');
        const json = (await res.json()) as { success?: boolean; data?: MenuItemData[] };
        if (!isCancelled && res.ok && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setMenuList(json.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải thực đơn từ Database, dùng dữ liệu khởi tạo:', err);
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
  }, []);

  const handleAddToCart = (dish: MenuItemData) => {
    if (dish.isAvailable === false) {
      showToast(`Món "${dish.name}" hiện tạm hết, quý khách vui lòng chọn món khác.`, 'warning');
      return;
    }

    if (dish.isPreOrderOnly && !hasActiveBooking) {
      setSpecialDishModal(dish);
      return;
    }

    addToCart({
      _id: dish._id,
      name: dish.name,
      price: dish.price,
      imageUrl: dish.imageUrl,
      category: dish.category,
      isPreOrderOnly: dish.isPreOrderOnly,
    });
    setCartPopKey((k) => k + 1);
    showToast(`Đã thêm "${dish.name}" vào giỏ hàng!`, 'success');
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredMenu = menuList.filter((item) => {
    if (normalizedQuery !== '') {
      return (
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery)
      );
    }
    if (activeCategory === 'Tất cả') return true;
    if (activeCategory === 'Món đặc biệt') return Boolean(item.isPreOrderOnly);
    return item.category === activeCategory;
  });

  return (
    <main className="flex-1 bg-[#f4f7f5] text-[#1c1917] relative pb-24">
      {/* Banner phụ */}
      <div
        className="relative h-[34vh] min-h-[220px] bg-cover bg-center flex items-center justify-center overflow-hidden"
        style={{ backgroundImage: "url('/foods/hero-bg2.jpg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-[#0e3f2d]/85" />
        <div className="relative z-10 text-center text-white px-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#155e42]/80 border border-[#fbbf24]/40 text-[#fde68a] text-xs font-semibold uppercase tracking-widest mb-3 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
            Thực đơn SmaRes Gastronomy
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white mb-3 tracking-tight">
            Thực Đơn Nhà Hàng
          </h1>
          <p className="text-sm md:text-base text-stone-200 font-light max-w-xl mx-auto leading-relaxed">
            Sự giao thoa hoàn hảo giữa ẩm thực truyền thống Việt Nam &amp; phong cách đương đại tinh tế.
          </p>
        </div>
      </div>

      {/* Thông báo trạng thái đặt bàn nếu có */}
      {hasActiveBooking ? (
        <div className="bg-[#f0fdf4] border-b border-[#bbf7d0] py-3 px-4 shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5 text-[#155e42]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#dcfce7] text-[#155e42]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </span>
              <span>
                Bạn đang có đơn giữ chỗ: <strong className="font-semibold">Bàn {bookingInfo?.tableNumber}</strong> ({bookingInfo?.time},{' '}
                {bookingInfo?.date}) • Tất cả món đặc quyền đã được mở khóa!
              </span>
            </div>
            <Link
              href="/booking/menu"
              className="inline-flex items-center gap-1 font-bold text-[#155e42] hover:text-[#0e3f2d] underline decoration-[#155e42]/40 underline-offset-4 whitespace-nowrap ml-7 sm:ml-2"
            >
              <span>Vào giỏ đặt món theo bàn</span>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-[#fffbeb] border-b border-[#fde68a] py-2.5 px-4 shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#92400e]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#fef3c7] text-[#d97706]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                </svg>
              </span>
              <span>
                Các món đặc quyền (Phở Wagyu A5, Vịt quay mật ong rừng,...) chỉ phục vụ cho khách đặt bàn trước.
              </span>
            </div>
            <Link
              href="/booking"
              className="inline-flex items-center gap-1 font-bold text-[#b45309] hover:text-[#92400e] underline decoration-[#b45309]/40 underline-offset-4 whitespace-nowrap ml-7 sm:ml-2"
            >
              <span>Đặt bàn ngay để mở khóa</span>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* Thanh danh mục & Ô tìm kiếm */}
      <div className="py-4 border-b border-[#e2e8e4] sticky top-16 bg-[#f4f7f5]/95 backdrop-blur-md z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            {[
              { id: 'Tất cả', label: 'Tất cả' },
              { id: 'Món đặc biệt', label: 'Món Đặc Biệt (Đặt trước)', isSpecial: true },
              { id: 'Khai vị', label: 'Khai vị' },
              { id: 'Món chính', label: 'Món chính' },
              { id: 'Tráng miệng', label: 'Tráng miệng' },
              { id: 'Đồ uống', label: 'Đồ uống & Rượu' },
            ].map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(tab.id);
                    setSearchQuery('');
                  }}
                  className={`interactive-btn px-4 py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 ${
                    isActive
                      ? tab.isSpecial
                        ? 'bg-[#d97706] text-white shadow-md ring-2 ring-[#fbbf24]'
                        : 'bg-[#155e42] text-white shadow-sm ring-2 ring-[#22c55e]/30'
                      : tab.isSpecial
                      ? 'text-[#92400e] bg-[#fef3c7] hover:bg-[#fde68a] border border-[#fcd34d]'
                      : 'text-stone-700 bg-white hover:text-[#155e42] hover:bg-stone-100 border border-[#e2e8e4]'
                  }`}
                >
                  {tab.isSpecial && (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                    </svg>
                  )}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="w-full md:w-72 relative">
            <input
              type="text"
              placeholder="Tìm kiếm món ăn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-[#d6d0c4] rounded-full text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#155e42] bg-white transition-all shadow-xs"
            />
            <svg
              className="w-4 h-4 absolute right-3.5 top-2.5 text-stone-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Danh sách món ăn */}
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 min-h-[50vh]">
        <div className="mb-8 border-b border-[#e2e8e4] pb-3 flex items-center justify-between">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1c1917]">
            {searchQuery.trim() !== ''
              ? `Kết quả tìm kiếm cho: "${searchQuery}"`
              : activeCategory === 'Món đặc biệt'
              ? 'Món Ăn Đặc Quyền Của Bếp Trưởng (Pre-Order Only)'
              : `${activeCategory} SmaRes`}
          </h2>
          <span className="text-xs text-stone-500 font-medium">
            Hiển thị {filteredMenu.length} món ăn
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#e2e8e4] overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-stone-200" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-stone-200 rounded-md w-3/4" />
                  <div className="h-4 bg-stone-100 rounded-md w-full" />
                  <div className="h-4 bg-stone-100 rounded-md w-2/3" />
                  <div className="h-10 bg-stone-200 rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredMenu.length === 0 ? (
          <div className="text-center py-20 text-stone-500 bg-white rounded-2xl border border-[#e2e8e4] shadow-xs max-w-md mx-auto">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6" />
                <path d="m9 9 6 6" />
              </svg>
            </div>
            <p className="font-serif font-bold text-lg text-stone-800 mb-1">Không tìm thấy món ăn</p>
            <p className="text-xs text-stone-500">Không có kết quả nào phù hợp với &ldquo;{searchQuery}&rdquo;.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMenu.map((dish) => {
              const cartQuantity = cart
                .filter((i) => i._id === dish._id)
                .reduce((sum, i) => sum + i.quantity, 0);

              return (
                <DishCard
                  key={dish._id}
                  dish={dish}
                  onAddToCart={handleAddToCart}
                  cartQuantity={cartQuantity}
                  hasActiveBooking={hasActiveBooking}
                  actionLabel="Thêm vào giỏ hàng"
                  isSoldOut={dish.isAvailable === false}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Cart Widget */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <Link
            key={cartPopKey}
            href={hasActiveBooking ? '/booking/menu' : '/cart'}
            className="animate-cart-pop interactive-btn flex items-center gap-3 bg-[#155e42] hover:bg-[#0e3f2d] text-white px-5 py-3.5 rounded-full shadow-[0_12px_32px_-4px_rgba(21,94,66,0.45)] ring-4 ring-[#dcfce7] border border-emerald-500/30"
          >
            <div className="relative">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span className="absolute -top-2 -right-2 bg-[#d97706] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            </div>
            <div className="text-left">
              <p className="text-[11px] text-emerald-200 leading-none">Giỏ hàng</p>
              <p className="text-sm font-bold leading-tight mt-0.5">
                {totalItems} món • {formatMoney(totalPrice)}
              </p>
            </div>
            <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}

      {/* Modal món đặc quyền đặt trước dùng chung */}
      <SpecialDishModal
        dish={specialDishModal}
        onClose={() => setSpecialDishModal(null)}
      />
    </main>
  );
}