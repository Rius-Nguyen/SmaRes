"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/app/context/CartContext';
import { INITIAL_MENU_ITEMS, MenuItemData } from '@/app/lib/menuInitialData';

export default function MenuPage() {
  const { cart, addToCart, totalItems, totalPrice, hasActiveBooking, bookingInfo } = useCart();

  // Biến lưu trạng thái danh mục đang chọn
  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');
  // State: Lưu từ khóa tìm kiếm
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Danh sách món ăn được đồng nhất từ MongoDB
  const [menuList, setMenuList] = useState<MenuItemData[]>(INITIAL_MENU_ITEMS);
  // State loading skeleton
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal thông báo khi người dùng chưa đặt bàn nhưng bấm vào món đặc biệt
  const [specialDishModal, setSpecialDishModal] = useState<MenuItemData | null>(null);

  // Tải dữ liệu thực đơn đồng nhất từ database qua API /api/menu
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/menu');
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setMenuList(json.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải thực đơn từ Database, dùng dữ liệu khởi tạo:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const formatMoney = (val: number) => {
    return val.toLocaleString('vi-VN') + 'đ';
  };

  const handleAddToCart = (dish: MenuItemData) => {
    // Nếu là món đặc biệt (isPreOrderOnly) mà khách CHƯA đặt bàn xong:
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
  };

  // Logic Tìm kiếm & Lọc theo Tab danh mục
  const filteredMenu = menuList.filter((item) => {
    if (searchQuery.trim() !== '') {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    if (activeCategory === 'Tất cả') return true;
    if (activeCategory === 'Món đặc biệt') return item.isPreOrderOnly;
    return item.category === activeCategory;
  });

  return (
    <main className="flex-1 bg-[#faf8f5] text-[#1c1917] relative pb-24">
      {/* Banner phụ */}
      <div
        className="relative h-[34vh] min-h-[220px] bg-cover bg-center flex items-center justify-center overflow-hidden"
        style={{ backgroundImage: "url('/foods/hero-bg2.jpg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-[#0a1f14]/85"></div>
        <div className="relative z-10 text-center text-white px-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#14532d]/70 border border-[#fbbf24]/40 text-[#fde68a] text-xs font-semibold uppercase tracking-widest mb-3 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]"></span>
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
            <div className="flex items-center gap-2.5 text-[#14532d]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#dcfce7] text-[#15803d]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </span>
              <span>
                Bạn đang có đơn giữ chỗ: <strong className="font-semibold">Bàn {bookingInfo?.tableNumber}</strong> ({bookingInfo?.time},{' '}
                {bookingInfo?.date}) • Tất cả món đặc quyền đã được mở khóa!
              </span>
            </div>
            <Link
              href="/booking/menu"
              className="inline-flex items-center gap-1 font-bold text-[#14532d] hover:text-[#15803d] underline decoration-[#14532d]/40 underline-offset-4 whitespace-nowrap ml-7 sm:ml-2"
            >
              <span>Vào giỏ đặt món theo bàn</span>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
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
                  <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
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
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* Thanh danh mục & Ô tìm kiếm */}
      <div className="py-4 border-b border-[#ebe7df] sticky top-16 bg-[#faf8f5]/95 backdrop-blur-md z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Cụm nút danh mục */}
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
                  onClick={() => {
                    setActiveCategory(tab.id);
                    setSearchQuery('');
                  }}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? tab.isSpecial
                        ? 'bg-[#d97706] text-white shadow-md ring-2 ring-[#fbbf24]'
                        : 'bg-[#14532d] text-white shadow-sm ring-2 ring-[#22c55e]/30'
                      : tab.isSpecial
                      ? 'text-[#92400e] bg-[#fef3c7] hover:bg-[#fde68a] border border-[#fcd34d]'
                      : 'text-stone-700 bg-white hover:text-[#14532d] hover:bg-stone-100 border border-[#ebe7df]'
                  }`}
                >
                  {tab.isSpecial && (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
                    </svg>
                  )}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Ô Tìm kiếm món ăn góc phải */}
          <div className="w-full md:w-72 relative">
            <input
              type="text"
              placeholder="Tìm kiếm món ăn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-[#d6d0c4] rounded-full text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#14532d] bg-white transition-all shadow-xs"
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

      {/* Danh sách món ăn được Render đồng nhất từ Database */}
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 min-h-[50vh]">
        {/* Tiêu đề danh mục / kết quả tìm kiếm */}
        <div className="mb-8 border-b border-[#ebe7df] pb-3 flex items-center justify-between">
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

        {/* Skeleton loading state */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#ebe7df] overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-stone-200"></div>
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-stone-200 rounded-md w-3/4"></div>
                  <div className="h-4 bg-stone-100 rounded-md w-full"></div>
                  <div className="h-4 bg-stone-100 rounded-md w-2/3"></div>
                  <div className="h-10 bg-stone-200 rounded-xl mt-4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredMenu.length === 0 ? (
          <div className="text-center py-20 text-stone-500 bg-white rounded-2xl border border-[#ebe7df] shadow-xs max-w-md mx-auto">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="m15 9-6 6"></path>
                <path d="m9 9 6 6"></path>
              </svg>
            </div>
            <p className="font-serif font-bold text-lg text-stone-800 mb-1">Không tìm thấy món ăn</p>
            <p className="text-xs text-stone-500">Không có kết quả nào phù hợp với &ldquo;{searchQuery}&rdquo;.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMenu.map((dish) => {
              const inCart = cart.find((i) => i._id === dish._id);

              return (
                <div
                  key={dish._id}
                  className={`group bg-white rounded-2xl border overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] hover:shadow-[0_16px_32px_-4px_rgba(28,25,23,0.12)] hover:-translate-y-1 ${
                    dish.isPreOrderOnly
                      ? 'border-[#fcd34d] ring-1 ring-[#fef3c7] bg-gradient-to-b from-[#fffbeb]/40 to-white'
                      : 'border-[#ebe7df]'
                  }`}
                >
                  <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                    <img
                      src={dish.imageUrl}
                      alt={dish.name}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    {dish.isPreOrderOnly && (
                      <div className="absolute top-3 left-3 bg-[#b45309]/95 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 backdrop-blur-xs border border-[#fbbf24]/40">
                        <svg className="w-3 h-3 text-[#fef3c7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
                        </svg>
                        <span>Món Đặc Quyền Đặt Trước</span>
                      </div>
                    )}
                    {inCart && (
                      <div className="absolute top-3 right-3 bg-[#14532d] text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-emerald-400/30">
                        <svg className="w-3 h-3 text-emerald-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Đã chọn: {inCart.quantity}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2 gap-3">
                        <h3 className="font-serif font-bold text-lg text-[#1c1917] leading-snug group-hover:text-[#14532d] transition-colors">
                          {dish.name}
                        </h3>
                        <span className="text-[#d97706] font-serif font-bold whitespace-nowrap text-lg">
                          {formatMoney(dish.price)}
                        </span>
                      </div>
                      <p className="text-stone-600 text-xs sm:text-sm mb-4 leading-relaxed line-clamp-2">
                        {dish.description}
                      </p>

                      {dish.preparationNote && (
                        <div className="mb-4 text-[11px] text-[#92400e] bg-[#fffbeb] p-2.5 rounded-xl border border-[#fde68a] flex items-center gap-1.5 font-medium">
                          <svg className="w-3.5 h-3.5 text-[#d97706] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          <span>{dish.preparationNote}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      {dish.isPreOrderOnly && !hasActiveBooking ? (
                        <button
                          onClick={() => handleAddToCart(dish)}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-[#92400e] bg-[#fffbeb] hover:bg-[#fef3c7] border border-[#fcd34d] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <svg className="w-3.5 h-3.5 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
                          </svg>
                          <span>Món đặc biệt — Cần đặt bàn trước</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(dish)}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs hover:shadow-md ${
                            dish.isPreOrderOnly
                              ? 'bg-[#d97706] hover:bg-[#b45309] text-white'
                              : 'bg-[#14532d] hover:bg-[#15803d] text-white'
                          }`}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                          <span>Thêm vào giỏ hàng</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Cart Widget nếu có món trong giỏ */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <Link
            href={hasActiveBooking ? '/booking/menu' : '/cart'}
            className="flex items-center gap-3 bg-[#14532d] hover:bg-[#15803d] text-white px-5 py-3.5 rounded-full shadow-[0_12px_32px_-4px_rgba(20,83,45,0.45)] transition-all duration-300 hover:scale-105 ring-4 ring-[#dcfce7] border border-emerald-500/30"
          >
            <div className="relative">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                <path d="M3 6h18"></path>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
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
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </Link>
        </div>
      )}

      {/* MODAL THÔNG BÁO MÓN ĐẶC BIỆT CHỈ CÓ KHI ĐẶT TRƯỚC */}
      {specialDishModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-[#ebe7df] animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center mx-auto mb-4 border border-[#fde68a]">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
              </svg>
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-[#b45309] bg-[#fffbeb] px-3.5 py-1 rounded-full border border-[#fde68a] inline-block mb-2">
              Món Ăn Đặc Quyền
            </span>

            <h3 className="text-xl font-serif font-bold text-[#1c1917] mb-2">
              {specialDishModal.name}
            </h3>

            <p className="text-xs text-stone-600 leading-relaxed mb-6">
              Món ăn này được bếp trưởng chế biến kỳ công với nguyên liệu tuyển chọn tươi sống.
              <strong> Chỉ phục vụ khi quý khách đã hoàn tất đặt bàn trước.</strong>
            </p>

            <div className="space-y-2.5">
              <Link
                href="/booking"
                className="inline-flex items-center justify-center gap-2 w-full bg-[#14532d] hover:bg-[#15803d] text-white font-bold py-3.5 rounded-xl text-sm shadow-[0_8px_20px_-4px_rgba(20,83,45,0.4)] transition-all text-center"
              >
                <span>Đặt bàn ngay để mở khóa món này</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14"></path>
                  <path d="m12 5 7 7-7 7"></path>
                </svg>
              </Link>

              <button
                onClick={() => setSpecialDishModal(null)}
                className="block w-full text-xs text-stone-500 hover:text-stone-800 font-semibold py-2 transition-colors cursor-pointer"
              >
                Xem các món khác
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}