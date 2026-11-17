"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart, ItemCustomizations } from '@/app/context/CartContext';
import { INITIAL_MENU_ITEMS, MenuItemData } from '@/app/lib/menuInitialData';
import DishCard from '@/components/menu/DishCard';
import CustomizationModal from '@/components/menu/CustomizationModal';
import CallWaiterModal from '@/components/menu/CallWaiterModal';

// 4 Prompt Chips gợi ý nhanh bấm 1 chạm
const PROMPT_CHIPS = [
  { id: 'thanh-dam', label: '🥗 Món thanh đạm', query: 'thanh đạm không cay' },
  { id: 'cay-nong', label: '🔥 Món cay đậm đà', query: 'cay đậm đà' },
  { id: 'best-seller', label: '⭐ Best Seller', query: 'best seller' },
  { id: 'giai-nhiet', label: '🍹 Tráng miệng mát mẻ', query: 'tráng miệng giải nhiệt' },
] as const;

type PromptChipId = (typeof PROMPT_CHIPS)[number]['label'];

interface SemanticDishResult {
  dish: MenuItemData;
  badge_reason?: string;
}

function TableMenuContent() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table');

  const {
    cart,
    addToCart,
    totalItems,
    totalPrice,
    hasActiveBooking,
    bookingInfo,
  } = useCart();

  // Số bàn ăn hiển thị: ưu tiên query param `table`, sau đó bookingInfo, fallback '04'
  const currentTableNumber = tableParam || bookingInfo?.tableNumber || '04';

  // State quản lý danh mục, tìm kiếm và chip (TK-157)
  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [activeFilterChip, setActiveFilterChip] = useState<PromptChipId | null>(null);

  // Danh sách món ăn từ database hoặc initial data
  const [menuList, setMenuList] = useState<MenuItemData[]>(INITIAL_MENU_ITEMS);

  // Modal thông báo khi khách bấm món đặc quyền pre-order mà chưa đặt bàn
  const [specialDishModal, setSpecialDishModal] = useState<MenuItemData | null>(null);

  // State TK-160: Modal Tùy biến món ăn
  const [customizingDish, setCustomizingDish] = useState<MenuItemData | null>(null);

  // State TK-161: Modal Gọi nhân viên / Hỗ trợ tại bàn
  const [isCallWaiterOpen, setIsCallWaiterOpen] = useState<boolean>(false);

  // Toast thông báo phản hồi thao tác người dùng
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tải dữ liệu thực đơn đồng bộ từ API /api/menu
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch('/api/menu');
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setMenuList(json.data);
        }
      } catch (err) {
        console.error('Lỗi tải thực đơn SmaRes, dùng dữ liệu mẫu:', err);
      }
    };
    fetchMenu();
  }, []);

  // Xử lý Debounce 300ms cho input tìm kiếm câu lệnh tự nhiên
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const formatMoney = (val: number) => {
    return val.toLocaleString('vi-VN') + 'đ';
  };

  // Mở modal tùy biến món (TK-160)
  const handleOpenCustomize = (dish: MenuItemData) => {
    if (dish.isPreOrderOnly && !hasActiveBooking) {
      setSpecialDishModal(dish);
      return;
    }
    setCustomizingDish(dish);
  };

  // Xác nhận thêm món từ modal tùy biến
  const handleCustomizationConfirm = (
    dish: MenuItemData,
    customizations: ItemCustomizations,
    quantity: number
  ) => {
    addToCart(
      {
        _id: dish._id,
        name: dish.name,
        price: dish.price,
        imageUrl: dish.imageUrl,
        category: dish.category,
        isPreOrderOnly: dish.isPreOrderOnly,
        customizations,
      },
      quantity
    );

    setToastMessage(`Đã thêm ${quantity} phần "${dish.name}" vào giỏ hàng!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Thêm trực tiếp vào giỏ hàng (fallback)
  const handleDirectAddToCart = (dish: MenuItemData) => {
    if (dish.isPreOrderOnly && !hasActiveBooking) {
      setSpecialDishModal(dish);
      return;
    }
    handleOpenCustomize(dish);
  };

  // Xử lý bấm Prompt Chip (1 chạm)
  const handleChipClick = (chipLabel: PromptChipId) => {
    if (activeFilterChip === chipLabel) {
      setActiveFilterChip(null);
    } else {
      setActiveFilterChip(chipLabel);
      setSearchQuery('');
    }
  };

  // Nút xóa ô tìm kiếm
  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setActiveFilterChip(null);
  };

  // Callback sau khi gọi nhân viên thành công (TK-161)
  const handleCallWaiterSuccess = (reason: string) => {
    setToastMessage(`Đã gửi yêu cầu "${reason}" đến nhân viên Bàn ${currentTableNumber}!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // =========================================================================
  // THUẬT TOÁN PHÂN TÍCH NGỮ NGHĨA (SEMANTIC REASONING & FILTERING - TK-157)
  // =========================================================================
  const semanticDishes: SemanticDishResult[] = useMemo(() => {
    const queryNormalized = debouncedQuery.toLowerCase().trim();

    // 1. Nhận diện Intent từ Prompt Chip hoặc Từ khóa tự nhiên
    const isLightHealthyIntent =
      activeFilterChip === '🥗 Món thanh đạm' ||
      queryNormalized.includes('thanh đạm') ||
      queryNormalized.includes('thanh dam') ||
      queryNormalized.includes('không cay') ||
      queryNormalized.includes('khong cay') ||
      queryNormalized.includes('ít dầu') ||
      queryNormalized.includes('it dau') ||
      queryNormalized.includes('thanh mát') ||
      queryNormalized.includes('thanh mat') ||
      queryNormalized.includes('nhẹ nhàng') ||
      queryNormalized.includes('healthy') ||
      queryNormalized.includes('chay');

    const isSpicyBoldIntent =
      activeFilterChip === '🔥 Món cay đậm đà' ||
      queryNormalized.includes('cay') ||
      queryNormalized.includes('đậm đà') ||
      queryNormalized.includes('dam da') ||
      queryNormalized.includes('nồng') ||
      queryNormalized.includes('chua cay') ||
      queryNormalized.includes('đậm vị') ||
      queryNormalized.includes('tiêu') ||
      queryNormalized.includes('ớt');

    const isBestSellerIntent =
      activeFilterChip === '⭐ Best Seller' ||
      queryNormalized.includes('best seller') ||
      queryNormalized.includes('bestseller') ||
      queryNormalized.includes('bán chạy') ||
      queryNormalized.includes('ban chay') ||
      queryNormalized.includes('nổi bật') ||
      queryNormalized.includes('ngon nhất') ||
      queryNormalized.includes('đặc sắc') ||
      queryNormalized.includes('đặc quyền') ||
      queryNormalized.includes('thượng hạng') ||
      queryNormalized.includes('dát vàng') ||
      queryNormalized.includes('signature');

    const isRefreshingDessertIntent =
      activeFilterChip === '🍹 Tráng miệng mát mẻ' ||
      queryNormalized.includes('giải nhiệt') ||
      queryNormalized.includes('giai nhiet') ||
      queryNormalized.includes('nước ép') ||
      queryNormalized.includes('nuoc ep') ||
      queryNormalized.includes('đồ uống') ||
      queryNormalized.includes('do uong') ||
      queryNormalized.includes('tráng miệng') ||
      queryNormalized.includes('trang mieng') ||
      queryNormalized.includes('mát mẻ') ||
      queryNormalized.includes('mat me') ||
      queryNormalized.includes('chè') ||
      queryNormalized.includes('trà') ||
      queryNormalized.includes('sữa chua') ||
      queryNormalized.includes('bánh');

    return menuList
      .map((dish) => {
        let isMatched = false;
        let badgeReason: string | undefined = undefined;

        const dishNameLower = dish.name.toLowerCase();
        const dishDescLower = dish.description.toLowerCase();
        const dishPrepLower = (dish.preparationNote || '').toLowerCase();
        const combinedText = `${dishNameLower} ${dishDescLower} ${dishPrepLower} ${dish.category.toLowerCase()}`;

        // Kiểm tra xem có đang tìm kiếm ngữ nghĩa hay không
        const isSemanticFiltering =
          activeFilterChip !== null ||
          isLightHealthyIntent ||
          isSpicyBoldIntent ||
          isBestSellerIntent ||
          isRefreshingDessertIntent;

        if (isLightHealthyIntent) {
          const isLight =
            combinedText.includes('thanh mát') ||
            combinedText.includes('gỏi cuốn') ||
            combinedText.includes('hoa chuối') ||
            combinedText.includes('hấp') ||
            combinedText.includes('sen') ||
            dish.category === 'Khai vị' ||
            dish.name.includes('Cá Chẽm');

          if (isLight) {
            isMatched = true;
            badgeReason = 'Phù hợp với khẩu vị thanh đạm, thanh nhẹ';
          }
        } else if (isSpicyBoldIntent) {
          const isSpicy =
            combinedText.includes('chua cay') ||
            combinedText.includes('quay') ||
            combinedText.includes('mật ong rừng') ||
            combinedText.includes('đậm đặc') ||
            combinedText.includes('đậm đà') ||
            combinedText.includes('wagyu') ||
            dish.name.includes('Vịt Quay') ||
            dish.name.includes('Vang Đỏ');

          if (isSpicy) {
            isMatched = true;
            badgeReason = 'Hương vị cay nồng, đậm đà kích thích vị giác';
          }
        } else if (isBestSellerIntent) {
          const isBest =
            dish.isPreOrderOnly ||
            dish.price >= 250000 ||
            combinedText.includes('thượng hạng') ||
            combinedText.includes('dát vàng') ||
            combinedText.includes('cua hoàng đế') ||
            dish.name.includes('Gỏi Cuốn');

          if (isBest) {
            isMatched = true;
            badgeReason = 'Món ăn đặc sắc được thực khách yêu thích nhất';
          }
        } else if (isRefreshingDessertIntent) {
          const isRefresh =
            dish.category === 'Tráng miệng' ||
            dish.category === 'Đồ uống' ||
            combinedText.includes('giải nhiệt') ||
            combinedText.includes('thanh mát') ||
            combinedText.includes('mát lành');

          if (isRefresh) {
            isMatched = true;
            badgeReason = 'Thức uống & món ngọt thanh mát giải nhiệt';
          }
        }

        // Tìm kiếm theo từ khóa tự do
        if (!isSemanticFiltering && queryNormalized !== '') {
          if (combinedText.includes(queryNormalized)) {
            isMatched = true;
            badgeReason = `Phù hợp với từ khóa "${debouncedQuery.trim()}"`;
          }
        }

        // Mặc định ban đầu
        if (!isSemanticFiltering && queryNormalized === '') {
          isMatched = true;
        }

        return {
          dish,
          badge_reason: badgeReason,
          isMatched,
        };
      })
      .filter((item) => {
        if (!item.isMatched) return false;
        if (activeCategory === 'Tất cả') return true;
        if (activeCategory === 'Món đặc biệt') return item.dish.isPreOrderOnly;
        return item.dish.category === activeCategory;
      })
      .map(({ dish, badge_reason }) => ({
        dish,
        badge_reason,
      }));
  }, [menuList, debouncedQuery, activeFilterChip, activeCategory]);

  return (
    <main className="min-h-screen bg-stone-50 pb-36">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed top-20 inset-x-4 max-w-md mx-auto z-50 animate-slideDown">
          <div className="bg-emerald-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl border border-emerald-700/80 flex items-center gap-2.5">
            <span className="text-amber-400 text-base">✓</span>
            <span className="flex-1">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 1. TOP HEADER THÔNG TIN BÀN ĂN & GỌI NHÂN VIÊN                    */}
      {/* ================================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand & Số bàn */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="w-8 h-8 rounded-xl bg-emerald-800 text-white font-bold flex items-center justify-center text-sm shadow-xs group-hover:bg-emerald-900 transition-colors">
                S
              </span>
              <div className="hidden sm:block">
                <span className="font-bold text-stone-900 text-base leading-none block">
                  SmaRes
                </span>
                <span className="text-[10px] tracking-wider uppercase text-emerald-800 font-semibold">
                  Gastronomy
                </span>
              </div>
            </Link>

            <span className="h-5 w-px bg-stone-200 hidden sm:block" />

            {/* Badge hiển thị bàn ăn hiện tại */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-900 shadow-2xs">
              <span className="text-emerald-700 text-xs">🍽️</span>
              <span className="text-xs font-bold tracking-tight">
                Bàn số {currentTableNumber}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            </div>
          </div>

          {/* Cụm hành động nhanh: Nút gọi phục vụ */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCallWaiterOpen(true)}
              className="px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs active:scale-95"
            >
              <span>🔔</span>
              <span>Gọi nhân viên</span>
            </button>

            <Link
              href="/cart"
              className="relative p-2 rounded-full text-stone-600 hover:text-emerald-800 hover:bg-stone-100 transition-colors"
              aria-label="Giỏ hàng"
            >
              <span className="text-lg">🛒</span>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ================================================================= */}
      {/* 2. KHỐI TÌM KIẾM CÂU LỆNH TỰ NHIÊN & PROMPT CHIPS 1 CHẠM (TK-157)  */}
      {/* ================================================================= */}
      <section className="bg-gradient-to-b from-white via-white to-stone-50 border-b border-stone-200/70 pt-5 pb-4 px-4 sm:px-6 shadow-2xs">
        <div className="max-w-4xl mx-auto">
          {/* Tiêu đề ngắn gọn */}
          <div className="text-center mb-3">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Thực Đơn Điện Tử Tại Bàn
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Nhập khẩu vị mong muốn hoặc bấm chọn gợi ý nhanh bên dưới
            </p>
          </div>

          {/* Ô tìm kiếm câu lệnh tự nhiên */}
          <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeFilterChip) setActiveFilterChip(null);
              }}
              placeholder="🔍 Nhập yêu cầu: 'món thanh đạm không cay', 'nước ép giải nhiệt'..."
              className="w-full pl-10 pr-10 py-3 rounded-full text-xs sm:text-sm bg-stone-100/80 focus:bg-white border border-stone-300/80 focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 focus:outline-none transition-all placeholder:text-stone-400 text-stone-800 shadow-2xs"
            />

            {/* Nút xóa nhanh (Clear Button) */}
            {(searchQuery !== '' || activeFilterChip !== null) && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-700 cursor-pointer"
                aria-label="Xóa tìm kiếm"
              >
                <span className="w-5 h-5 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 text-xs flex items-center justify-center font-bold">
                  ✕
                </span>
              </button>
            )}
          </div>

          {/* Dải nút Prompt Chips (Gợi ý 1 chạm bấm nhanh) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider whitespace-nowrap pl-0.5">
              Gợi ý:
            </span>
            {PROMPT_CHIPS.map((chip) => {
              const isActive = activeFilterChip === chip.label;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleChipClick(chip.label)}
                  className={`px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition-all duration-200 cursor-pointer text-xs flex items-center gap-1 shadow-2xs active:scale-95 ${
                    isActive
                      ? 'bg-emerald-800 text-white ring-2 ring-emerald-600/40 shadow-xs'
                      : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                  }`}
                >
                  <span>{chip.label}</span>
                  {isActive && <span className="text-[10px] ml-0.5">✕</span>}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 3. THANH TAB DANH MỤC MÓN ĂN                                      */}
      {/* ================================================================= */}
      <section className="bg-white border-b border-stone-200/70 py-3 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'Tất cả', label: 'Tất cả' },
            { id: 'Khai vị', label: '🥗 Khai vị' },
            { id: 'Món chính', label: '🥩 Món chính' },
            { id: 'Tráng miệng', label: '🍮 Tráng miệng' },
            { id: 'Đồ uống', label: '🍷 Đồ uống' },
            { id: 'Món đặc biệt', label: '👑 Món đặc quyền' },
          ].map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 4. LƯỚI HIỂN THỊ MÓN ĂN KÈM BADGE NGỮ NGHĨA (TK-158)             */}
      {/* ================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Thanh trạng thái kết quả */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-stone-900">
              {activeFilterChip
                ? `Kết quả gợi ý cho: ${activeFilterChip}`
                : debouncedQuery.trim() !== ''
                ? `Tìm kiếm: "${debouncedQuery}"`
                : activeCategory === 'Tất cả'
                ? 'Tất cả món ngon'
                : activeCategory}
            </h2>
          </div>
          <span className="text-xs text-stone-500 font-medium">
            {semanticDishes.length} món
          </span>
        </div>

        {/* Trạng thái không tìm thấy món */}
        {semanticDishes.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs max-w-md mx-auto">
            <span className="text-4xl block mb-3">🍲</span>
            <p className="font-bold text-stone-800 text-sm mb-1">
              Không tìm thấy món ăn phù hợp
            </p>
            <p className="text-xs text-stone-500 mb-4">
              Hãy thử tìm kiếm với cụm từ khác hoặc chọn các gợi ý 1 chạm ở trên.
            </p>
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Xem toàn bộ thực đơn
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {semanticDishes.map(({ dish, badge_reason }) => {
              const inCart = cart.find((i) => i._id === dish._id);
              return (
                <DishCard
                  key={dish._id}
                  dish={dish}
                  badge_reason={badge_reason}
                  onAddToCart={handleDirectAddToCart}
                  onCustomize={handleOpenCustomize}
                  cartQuantity={inCart ? inCart.quantity : 0}
                  hasActiveBooking={hasActiveBooking}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 5. TK-161: FLOATING ACTION BUTTON (FAB) GỌI NHÂN VIÊN / HỖ TRỢ     */}
      {/* ================================================================= */}
      <div className="fixed bottom-24 right-4 z-40">
        <button
          type="button"
          onClick={() => setIsCallWaiterOpen(true)}
          className="group flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-bold px-4 py-3 rounded-full shadow-2xl ring-4 ring-amber-300/40 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Gọi nhân viên phục vụ tại bàn"
        >
          <span className="text-lg">🔔</span>
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            Gọi nhân viên / Hỗ trợ
          </span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* 6. FLOATING BOTTOM BAR: GIỎ HÀNG TẠI BÀN (KHI CÓ MÓN ĐƯỢC CHỌN)   */}
      {/* ================================================================= */}
      {totalItems > 0 && (
        <div className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-40 animate-slideUp">
          <div className="bg-emerald-900/95 backdrop-blur-md text-white rounded-2xl p-3 sm:p-3.5 shadow-xl border border-emerald-700/50 flex items-center justify-between gap-3 ring-2 ring-emerald-800/20">
            <div className="flex items-center gap-3 pl-1">
              <span className="w-9 h-9 rounded-xl bg-emerald-800 flex items-center justify-center text-lg">
                🛒
              </span>
              <div>
                <p className="text-xs text-emerald-200 font-medium leading-none">
                  Bàn {currentTableNumber} • {totalItems} món
                </p>
                <p className="text-base font-bold leading-tight mt-0.5 tracking-tight text-white">
                  {formatMoney(totalPrice)}
                </p>
              </div>
            </div>

            <Link
              href="/cart"
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <span>Xem giỏ hàng</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 7. TK-160: MODAL TÙY BIẾN MÓN ĂN (CUSTOMIZATION MODAL)             */}
      {/* ================================================================= */}
      <CustomizationModal
        dish={customizingDish}
        isOpen={customizingDish !== null}
        onClose={() => setCustomizingDish(null)}
        onConfirm={handleCustomizationConfirm}
      />

      {/* ================================================================= */}
      {/* 8. TK-161: MODAL GỌI PHỤC VỤ TẠI BÀN (CALL WAITER POPOVER)        */}
      {/* ================================================================= */}
      <CallWaiterModal
        isOpen={isCallWaiterOpen}
        onClose={() => setIsCallWaiterOpen(false)}
        tableNumber={currentTableNumber}
        onSuccess={handleCallWaiterSuccess}
      />

      {/* ================================================================= */}
      {/* 9. MODAL THÔNG BÁO MÓN ĐẶC QUYỀN PRE-ORDER                        */}
      {/* ================================================================= */}
      {specialDishModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-stone-200 animate-scaleUp">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 text-2xl flex items-center justify-center mx-auto mb-3 border border-amber-200">
              👑
            </div>

            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-3 py-0.5 rounded-full border border-amber-200 inline-block mb-2">
              Món Ăn Đặc Quyền
            </span>

            <h3 className="text-lg font-bold text-stone-900 mb-1.5">
              {specialDishModal.name}
            </h3>

            <p className="text-xs text-stone-600 leading-relaxed mb-5">
              Món ăn này yêu cầu đầu bếp chuẩn bị trước qua nhiều giờ hầm nướng kỳ công.
              <strong> Cần đặt bàn trước để đảm bảo phục vụ tốt nhất.</strong>
            </p>

            <div className="space-y-2">
              <Link
                href="/booking"
                className="block w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3 rounded-xl text-xs shadow-sm transition-all text-center"
              >
                Đặt bàn trước ngay →
              </Link>
              <button
                type="button"
                onClick={() => setSpecialDishModal(null)}
                className="block w-full text-xs text-stone-500 hover:text-stone-800 font-semibold py-2 transition-colors cursor-pointer"
              >
                Chọn món ăn khác
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Bọc trong Suspense để đảm bảo Next.js App Router xử lý useSearchParams() an toàn khi build SSR
export default function TableMenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-stone-600">
              Đang tải thực đơn tại bàn...
            </p>
          </div>
        </div>
      }
    >
      <TableMenuContent />
    </Suspense>
  );
}
