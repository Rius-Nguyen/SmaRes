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

  // Modal thông báo khi người dùng chưa đặt bàn nhưng bấm vào món đặc biệt
  const [specialDishModal, setSpecialDishModal] = useState<MenuItemData | null>(null);

  // Tải dữ liệu thực đơn đồng nhất từ database qua API /api/menu
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch('/api/menu');
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setMenuList(json.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải thực đơn từ Database, dùng dữ liệu khởi tạo:', err);
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
    <main className="flex-1 bg-white relative pb-20">
      {/* Banner phụ */}
      <div
        className="relative h-[32vh] bg-cover bg-center flex items-center justify-center"
        style={{ backgroundImage: "url('/foods/hero-bg2.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative z-10 text-center text-white px-4">
          <span className="text-xs uppercase tracking-widest text-green-400 font-bold mb-2 inline-block">
            Thực đơn SmaRes Gastronomy
          </span>
          <h1 className="text-3xl md:text-5xl font-bold font-sans mb-3">Thực Đơn Nhà Hàng</h1>
          <p className="text-sm md:text-base text-gray-200 font-light max-w-2xl mx-auto">
            Sự giao thoa hoàn hảo giữa ẩm thực truyền thống Việt Nam & phong cách ẩm thực hiện đại tinh tế
          </p>
        </div>
      </div>

      {/* Thông báo trạng thái đặt bàn nếu có */}
      {hasActiveBooking ? (
        <div className="bg-green-50 border-b border-green-200 py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-green-900">
              <span>⭐</span>
              <span>
                Bạn đang có đơn giữ chỗ: <strong>Bàn {bookingInfo?.tableNumber}</strong> ({bookingInfo?.time},{' '}
                {bookingInfo?.date}) • Tất cả món đặc quyền đã được mở khóa!
              </span>
            </div>
            <Link
              href="/booking/menu"
              className="font-bold text-green-800 underline hover:text-green-900 whitespace-nowrap ml-2"
            >
              Vào giỏ đặt món theo bàn →
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50/80 border-b border-amber-200 py-2.5 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-900">
              <span>👑</span>
              <span>
                Các món đặc biệt (Phở Wagyu A5 dát vàng, Vịt quay lu đất,...) chỉ phục vụ cho khách đặt bàn trước.
              </span>
            </div>
            <Link
              href="/booking"
              className="font-bold text-amber-800 underline hover:text-amber-950 whitespace-nowrap ml-2"
            >
              Đặt bàn ngay để mở khóa →
            </Link>
          </div>
        </div>
      )}

      {/* Thanh danh mục & Ô tìm kiếm - ĐÃ KHẮC PHỤC LỖI HIỆN THANH CUỘN KHI ĐƯA CHUỘT VÀO ĐỒ UỐNG */}
      <div className="py-5 border-b border-gray-100 sticky top-16 bg-white/95 backdrop-blur-md z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Cụm nút danh mục: sử dụng flex-wrap để không bị vỡ và không sinh thanh cuộn ngang */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {[
              { id: 'Tất cả', label: 'Tất cả' },
              { id: 'Món đặc biệt', label: '👑 Món Đặc Biệt (Đặt trước)' },
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
                  className={`interactive-btn px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? tab.id === 'Món đặc biệt'
                        ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-300'
                        : 'bg-green-800 text-white shadow-sm'
                      : tab.id === 'Món đặc biệt'
                      ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                      : 'text-gray-600 hover:text-green-800 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Ô Tìm kiếm món ăn góc phải */}
          <div className="w-full md:w-64 relative">
            <input
              type="text"
              placeholder="Tìm kiếm món ăn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-full text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-gray-50 focus:bg-white transition-all"
            />
            <svg
              className="w-4 h-4 absolute right-3.5 top-2.5 text-gray-400"
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
        <div className="mb-8 border-b pb-3 flex items-center justify-between">
          <h2 className="text-2xl font-bold font-sans text-gray-800">
            {searchQuery.trim() !== ''
              ? `Kết quả tìm kiếm cho: "${searchQuery}"`
              : activeCategory === 'Món đặc biệt'
              ? 'Món Ăn Đặc Quyền Của Bếp Trưởng (Pre-Order Only)'
              : `${activeCategory} SmaRes`}
          </h2>
          <span className="text-xs text-gray-500 font-medium">
            Hiển thị {filteredMenu.length} món ăn
          </span>
        </div>

        {filteredMenu.length === 0 ? (
          <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="text-3xl block mb-2">🍽️</span>
            <p className="font-medium text-sm">Không tìm thấy món ăn nào phù hợp với &ldquo;{searchQuery}&rdquo;.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMenu.map((dish) => {
              const inCart = cart.find((i) => i._id === dish._id);

              return (
                <div
                  key={dish._id}
                  className={`interactive-card bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:shadow-lg ${
                    dish.isPreOrderOnly
                      ? 'border-amber-300 ring-1 ring-amber-100 bg-gradient-to-b from-amber-50/20 to-white'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="h-56 bg-gray-100 relative overflow-hidden">
                    <img
                      src={dish.imageUrl}
                      alt={dish.name}
                      className="w-full h-full object-cover card-zoom-img"
                    />
                    {dish.isPreOrderOnly && (
                      <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1 backdrop-blur-sm">
                        <span>👑</span>
                        <span>Món Đặc Quyền Đặt Trước</span>
                      </div>
                    )}
                    {inCart && (
                      <div className="absolute top-3 right-3 bg-green-700 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                        Đã chọn: {inCart.quantity}
                      </div>
                    )}
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2 gap-3">
                        <h3 className="font-bold text-base md:text-lg text-gray-900 leading-snug group-hover:text-green-800 transition-colors">
                          {dish.name}
                        </h3>
                        <span className="text-green-700 font-bold whitespace-nowrap text-base">
                          {formatMoney(dish.price)}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs sm:text-sm mb-4 leading-relaxed">
                        {dish.description}
                      </p>

                      {dish.preparationNote && (
                        <div className="mb-4 text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5 font-medium">
                          <span>⏱️</span>
                          <span>{dish.preparationNote}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      {dish.isPreOrderOnly && !hasActiveBooking ? (
                        <button
                          onClick={() => handleAddToCart(dish)}
                          className="interactive-btn w-full py-2.5 px-4 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>👑</span>
                          <span>Món đặc biệt — Cần đặt bàn trước</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(dish)}
                          className={`interactive-btn w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            dish.isPreOrderOnly
                              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow'
                              : 'bg-green-800 hover:bg-green-900 text-white shadow-sm'
                          }`}
                        >
                          <span>+ Thêm vào giỏ hàng</span>
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
            className="flex items-center gap-3 bg-green-800 hover:bg-green-900 text-white px-5 py-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 ring-4 ring-green-100"
          >
            <span className="text-xl">🛒</span>
            <div className="text-left">
              <p className="text-xs text-gray-200 leading-none">Giỏ hàng</p>
              <p className="text-sm font-bold leading-tight mt-0.5">
                {totalItems} món • {formatMoney(totalPrice)}
              </p>
            </div>
            <span className="text-sm font-bold pl-1">→</span>
          </Link>
        </div>
      )}

      {/* MODAL THÔNG BÁO MÓN ĐẶC BIỆT CHỈ CÓ KHI ĐẶT TRƯỚC */}
      {specialDishModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-gray-100 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 text-3xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
              👑
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 inline-block mb-2">
              Món Ăn Đặc Quyền
            </span>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {specialDishModal.name}
            </h3>

            <p className="text-xs text-gray-600 leading-relaxed mb-6">
              Món ăn này được bếp trưởng chế biến kỳ công với nguyên liệu tuyển chọn tươi sống.
              <strong> Chỉ phục vụ khi quý khách đã hoàn tất đặt bàn trước.</strong>
            </p>

            <div className="space-y-2">
              <Link
                href="/booking"
                className="interactive-btn block w-full bg-green-800 hover:bg-green-900 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all text-center"
              >
                Đặt bàn ngay để mở khóa món này →
              </Link>

              <button
                onClick={() => setSpecialDishModal(null)}
                className="block w-full text-xs text-gray-500 hover:text-gray-800 font-semibold py-2 transition-colors cursor-pointer"
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