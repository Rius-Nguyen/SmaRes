"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BookingStepper from '@/components/BookingStepper';
import { useCart, type CartItem } from '@/app/context/CartContext';
import { formatMoney } from '@/app/lib/format';
import { INITIAL_MENU_ITEMS, MenuItemData } from '@/app/lib/menuInitialData';
import DishCard from '@/components/menu/DishCard';
import SpecialDishModal from '@/components/menu/SpecialDishModal';
import { useToast } from '@/components/ui/Toast';

export default function BookingMenuPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
    bookingInfo,
    hasActiveBooking,
    isLoaded,
    hasSpecialItems,
    getSpecialItems,
  } = useCart();

  const [activeTab, setActiveTab] = useState<string>('Tất cả');
  const [menuDishes, setMenuDishes] = useState<MenuItemData[]>(INITIAL_MENU_ITEMS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [specialDishModal, setSpecialDishModal] = useState<MenuItemData | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchMenu = async () => {
      try {
        const res = await fetch('/api/menu');
        const json = (await res.json()) as { success?: boolean; data?: MenuItemData[] };
        if (!isCancelled && res.ok && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setMenuDishes(json.data);
        }
      } catch (e) {
        console.error('Lỗi khi tải thực đơn từ API, sử dụng dữ liệu mặc định:', e);
      }
    };

    void fetchMenu();
    return () => {
      isCancelled = true;
    };
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredDishes = menuDishes.filter((dish) => {
    if (normalizedQuery !== '') {
      return (
        dish.name.toLowerCase().includes(normalizedQuery) ||
        dish.description.toLowerCase().includes(normalizedQuery)
      );
    }
    if (activeTab === 'Món đặc biệt') return Boolean(dish.isPreOrderOnly);
    if (activeTab === 'Tất cả') return true;
    return dish.category === activeTab;
  });

  const getItemQuantityInCart = (dishId: string): number => {
    return cart
      .filter((i) => i._id === dishId)
      .reduce((sum, i) => sum + i.quantity, 0);
  };

  const handleAddDish = (dish: MenuItemData) => {
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
    showToast(`Đã thêm "${dish.name}" vào thực đơn đặt trước!`, 'success');
  };

  const handleDecrementDish = (dish: MenuItemData) => {
    if (dish.isAvailable === false) return;
    const matching = cart.filter((i) => i._id === dish._id);
    if (matching.length === 0) return;

    const target: CartItem =
      matching.find((i) => !i.customizations) || matching[matching.length - 1];
    const itemKey = target.cartKey || target._id;
    updateQuantity(itemKey, target.quantity - 1);
  };

  const handleProceedToConfirm = () => {
    router.push('/booking/confirm');
  };

  const handleSkipDishes = () => {
    router.push('/booking/confirm');
  };

  if (isLoaded && !hasActiveBooking) {
    return (
      <main className="flex-1 bg-[#faf8f5] text-[#1c1917] flex flex-col min-h-screen">
        <BookingStepper currentStep={3} />
        <div className="max-w-2xl mx-auto my-auto py-16 px-4 text-center">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df]">
            <div className="w-16 h-16 bg-[#fffbeb] rounded-full flex items-center justify-center mx-auto mb-6 text-[#d97706] border border-[#fde68a]">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#1c1917] mb-3">
              Yêu cầu hoàn tất Bước 1 &amp; 2
            </h1>
            <p className="text-stone-600 text-sm leading-relaxed mb-6">
              Để bảo đảm món ăn được bếp trưởng chuẩn bị tươi ngon nhất theo đúng giờ đến, bạn cần hoàn thành
              <strong> Bước 1 (Thông tin đặt bàn)</strong> và <strong>Bước 2 (Chọn vị trí bàn trên sơ đồ)</strong> trước khi chọn thực đơn.
            </p>

            <div className="bg-[#fffbeb] p-4 rounded-xl border border-[#fde68a] text-left mb-8">
              <p className="text-xs font-bold text-[#92400e] mb-1 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>ĐẶC QUYỀN KHI ĐẶT BÀN TRƯỚC:</span>
              </p>
              <ul className="text-xs text-[#92400e] space-y-1 list-disc pl-4">
                <li>Mở khóa danh mục <strong>Món Ăn Đặc Quyền</strong> (Phở Wagyu A5, Vịt quay mật ong rừng,...)</li>
                <li>Không phải chờ đợi chế biến khi đến nhà hàng</li>
                <li>Bước chọn món là <em>tùy chọn (không bắt buộc)</em> — bạn có thể chọn hoặc bỏ qua bất kỳ lúc nào!</li>
              </ul>
            </div>

            <Link
              href="/booking"
              className="inline-flex items-center gap-2 bg-[#14532d] hover:bg-[#15803d] text-white font-semibold px-8 py-3.5 rounded-xl shadow-[0_8px_20px_-4px_rgba(20,83,45,0.4)] transition-all text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
              <span>Bắt đầu đặt bàn &amp; chọn bàn ngay</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[#faf8f5] text-[#1c1917] flex flex-col min-h-screen pb-28">
      <BookingStepper currentStep={3} />

      {/* Banner tóm tắt bàn đã chọn */}
      <div className="bg-white/95 backdrop-blur-md border-b border-[#ebe7df] shadow-xs py-4 px-4 sm:px-6 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm">
              <span className="font-semibold uppercase tracking-wider bg-[#f0fdf4] text-[#14532d] px-3 py-1 rounded-lg border border-[#bbf7d0]">
                Đã giữ chỗ: Bàn {bookingInfo?.tableNumber} ({bookingInfo?.tableType})
              </span>
              <span className="text-stone-700 font-medium">
                • {bookingInfo?.time}, ngày {bookingInfo?.date}
              </span>
              <span className="text-stone-700 font-medium">
                • Khách: {bookingInfo?.name} ({bookingInfo?.guests})
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#14532d] mt-2">
              3. Chọn Món Ăn Vào Giỏ Hàng (Tùy chọn)
            </h1>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleProceedToConfirm}
              className="w-full sm:w-auto text-xs sm:text-sm font-semibold bg-[#14532d] hover:bg-[#15803d] text-white px-6 py-3 rounded-xl shadow-[0_8px_20px_-4px_rgba(20,83,45,0.4)] transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <span>Xác nhận thực đơn ({totalItems} món)</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Ghi chú đặc quyền đặt trước */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-gradient-to-r from-[#fffbeb] via-[#fef3c7]/60 to-[#f0fdf4] rounded-3xl p-6 md:p-8 border border-[#fde68a] shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#d97706] text-white flex items-center justify-center shrink-0 shadow-sm border border-[#fbbf24]/40">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#92400e] tracking-tight">
                  Đã mở khóa các Món Ăn Đặc Quyền dành riêng cho khách Đặt bàn trước!
                </h2>
                <p className="text-sm sm:text-base text-stone-700 leading-relaxed font-normal">
                  Những món ăn chế biến công phu (Phở Wagyu A5, Vịt quay mật ong rừng,...) chỉ có thể gọi khi đặt trước.
                </p>
                <div className="bg-white/95 rounded-2xl p-4 border border-[#bbf7d0] shadow-xs mt-3">
                  <div className="flex items-start gap-3">
                    <span className="text-[#15803d] shrink-0 mt-0.5">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </span>
                    <div className="text-xs sm:text-sm text-stone-800 leading-relaxed">
                      <span className="font-bold text-[#14532d] uppercase tracking-wide mr-2">
                        Lưu ý quan trọng:
                      </span>
                      <span>
                        Bước đặt món là <strong>TÙY CHỌN (Không bắt buộc)</strong> — Quý khách có thể chọn món ngay hoặc bấm nút <strong>&ldquo;Bỏ qua chọn món&rdquo;</strong> để đến nhà hàng mới gọi món!
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('Món đặc biệt')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#92400e] bg-[#fef3c7] hover:bg-[#fde68a] px-5 py-3 rounded-xl whitespace-nowrap border border-[#fcd34d] shrink-0 shadow-xs transition-all cursor-pointer"
            >
              <span>Xem ngay món đặc biệt</span>
              <svg className="w-4 h-4 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Nội dung chính: Danh mục + Danh sách món + Giỏ hàng mini */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        {/* Cột trái (8/12 cột) */}
        <div className="lg:col-span-8">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-[#ebe7df] mb-6">
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {[
                { id: 'Tất cả', label: 'Tất cả món' },
                { id: 'Món đặc biệt', label: 'Món Đặc Biệt Đặt Trước', isSpecial: true, badge: 'Mới' },
                { id: 'Khai vị', label: 'Khai vị' },
                { id: 'Món chính', label: 'Món chính' },
                { id: 'Tráng miệng', label: 'Tráng miệng' },
                { id: 'Đồ uống', label: 'Đồ uống & Rượu' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearchQuery('');
                    }}
                    className={`interactive-btn px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? tab.isSpecial
                          ? 'bg-[#d97706] text-white shadow-md ring-2 ring-[#fbbf24]'
                          : 'bg-[#14532d] text-white shadow-sm'
                        : tab.isSpecial
                        ? 'text-[#92400e] bg-[#fef3c7] hover:bg-[#fde68a] border border-[#fcd34d]'
                        : 'text-stone-700 bg-white hover:text-[#14532d] hover:bg-stone-100 border border-[#ebe7df]'
                    }`}
                  >
                    {tab.isSpecial && (
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                      </svg>
                    )}
                    <span>{tab.label}</span>
                    {tab.badge && !isActive && (
                      <span className="text-[10px] bg-[#d97706] text-white px-2 py-0.5 rounded-full font-bold">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-64 shrink-0">
              <input
                type="text"
                placeholder="Tìm món ăn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 border border-[#d6d0c4] rounded-full text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#14532d] bg-white shadow-xs"
              />
              <svg
                className="w-4 h-4 absolute right-3.5 top-3 text-stone-400"
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

          {filteredDishes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#ebe7df] shadow-xs">
              <p className="font-serif font-bold text-lg text-[#1c1917] mb-1">
                Không tìm thấy món ăn phù hợp
              </p>
              <p className="text-xs text-stone-500">
                Vui lòng thử từ khóa hoặc danh mục khác.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredDishes.map((dish) => {
                const qtyInCart = getItemQuantityInCart(dish._id);

                return (
                  <DishCard
                    key={dish._id}
                    dish={dish}
                    variant="compact"
                    showCategoryBadge
                    cartQuantity={qtyInCart}
                    hasActiveBooking={hasActiveBooking}
                    isSoldOut={dish.isAvailable === false}
                    actionLabel="Thêm vào thực đơn"
                    onAddToCart={handleAddDish}
                    onIncrement={handleAddDish}
                    onDecrement={handleDecrementDish}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Cột phải (4/12 cột): Tóm tắt Giỏ hàng đặt trước */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df] p-6 sticky top-36">
            <div className="flex items-center justify-between border-b border-[#ebe7df] pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#f0fdf4] text-[#14532d] flex items-center justify-center border border-[#bbf7d0]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </span>
                <h2 className="font-serif font-bold text-lg text-[#1c1917]">Thực đơn đã chọn</h2>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-[#dcfce7] text-[#14532d] rounded-full">
                {totalItems} món
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-14 h-14 bg-[#faf8f5] rounded-full border border-[#ebe7df] flex items-center justify-center mx-auto text-stone-400 mb-3">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                    <path d="M7 2v20" />
                    <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                  </svg>
                </div>
                <p className="text-sm text-[#1c1917] font-semibold">Chưa chọn món nào</p>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Quý khách có thể chọn món ngay, hoặc bấm <strong>&ldquo;Bỏ qua chọn món&rdquo;</strong> bên dưới.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {cart.map((item, idx) => {
                  const itemKey = item.cartKey || item._id;

                  return (
                    <div
                      key={item.cartKey || `${item._id}-${idx}`}
                      className="flex items-center justify-between gap-3 text-sm border-b border-[#ebe7df] pb-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {item.isPreOrderOnly && (
                            <span className="text-[#d97706] shrink-0" title="Món đặc biệt">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                              </svg>
                            </span>
                          )}
                          <p className="font-semibold text-[#1c1917] leading-snug truncate">
                            {item.name}
                          </p>
                        </div>
                        <p className="text-stone-500 text-xs mt-0.5">
                          {formatMoney(item.price)} × {item.quantity} ={' '}
                          <strong className="text-[#14532d] font-bold">
                            {formatMoney(item.price * item.quantity)}
                          </strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                          aria-label={`Giảm ${item.name}`}
                          className="w-6 h-6 rounded bg-[#faf8f5] hover:bg-[#f5f2eb] border border-[#ebe7df] text-[#1c1917] font-bold flex items-center justify-center text-sm cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold text-[#1c1917] text-sm">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                          aria-label={`Tăng ${item.name}`}
                          className="w-6 h-6 rounded bg-[#faf8f5] hover:bg-[#f5f2eb] border border-[#ebe7df] text-[#1c1917] font-bold flex items-center justify-center text-sm cursor-pointer"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            removeFromCart(itemKey);
                            showToast(`Đã xóa "${item.name}" khỏi thực đơn.`, 'info');
                          }}
                          aria-label={`Xóa ${item.name}`}
                          className="w-6 h-6 ml-0.5 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {hasSpecialItems && (
              <div className="my-3 p-3 bg-[#fffbeb] rounded-xl border border-[#fde68a] text-xs text-[#92400e] flex items-center gap-2">
                <svg className="w-4 h-4 text-[#d97706] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>
                  Đã có <strong>{getSpecialItems().length} món đặc quyền</strong> sẽ được chuẩn bị trước.
                </span>
              </div>
            )}

            <div className="border-t border-[#ebe7df] pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-sm text-stone-600">
                <span>Số lượng món:</span>
                <span className="font-bold text-[#1c1917]">{totalItems} phần</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#1c1917] pt-1">
                <span>Tạm tính thực đơn:</span>
                <span className="text-[#d97706] font-serif text-lg font-bold">
                  {formatMoney(totalPrice)}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={handleProceedToConfirm}
                className="interactive-btn w-full bg-[#14532d] hover:bg-[#15803d] text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <span>Xác nhận thực đơn &amp; Tiếp tục</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>

              <button
                type="button"
                onClick={handleSkipDishes}
                className="interactive-btn w-full bg-[#f5f2eb] hover:bg-[#ebe7df] text-[#1c1917] font-semibold py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 border border-[#d6d0c4] cursor-pointer"
              >
                <span>Bỏ qua chọn món (Gọi tại bàn)</span>
                <svg className="w-4 h-4 text-stone-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 4 15 12 5 20 5 4" />
                  <line x1="19" y1="5" x2="19" y2="19" />
                </svg>
              </button>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearCart();
                    showToast('Đã xóa toàn bộ món đã chọn.', 'info');
                  }}
                  className="w-full text-center text-xs text-rose-600 hover:text-rose-700 font-medium pt-1 cursor-pointer"
                >
                  Xóa toàn bộ món đã chọn
                </button>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#ebe7df] text-center">
              <Link
                href="/booking/diagram"
                className="text-sm font-medium text-stone-500 hover:text-[#14532d] flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5" />
                  <path d="m12 19-7-7 7-7" />
                </svg>
                <span>Đổi vị trí bàn khác</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Thanh Bottom Sticky Bar trên di động */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#ebe7df] p-3 shadow-lg z-40 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] text-stone-500">Đã chọn: {totalItems} món</p>
          <p className="text-sm font-bold text-[#14532d]">{formatMoney(totalPrice)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSkipDishes}
            className="text-xs font-semibold px-3 py-2 border border-[#d6d0c4] rounded-lg text-stone-700 hover:bg-[#f5f2eb] cursor-pointer"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={handleProceedToConfirm}
            className="text-xs font-bold px-4 py-2 bg-[#14532d] text-white rounded-lg hover:bg-[#15803d] shadow cursor-pointer inline-flex items-center gap-1"
          >
            <span>Tiếp tục</span>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <SpecialDishModal
        dish={specialDishModal}
        onClose={() => setSpecialDishModal(null)}
      />
    </main>
  );
}
