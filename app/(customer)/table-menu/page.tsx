"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart, ItemCustomizations } from '@/app/context/CartContext';
import { INITIAL_MENU_ITEMS, MenuItemData } from '@/app/lib/menuInitialData';
import DishCard from '@/components/menu/DishCard';
import CustomizationModal from '@/components/menu/CustomizationModal';
import CallWaiterModal from '@/components/menu/CallWaiterModal';

// 4 Prompt Chips gợi ý nhanh bấm 1 chạm (TK-157)
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

// Kiểu dữ liệu xác thực bàn ăn (TK-142)
type TableAccessState = 'CHECKING' | 'ALLOWED' | 'LOCKED' | 'ERROR';

interface TableAccessInfo {
  can_order: boolean;
  table_id?: string;
  table_number: string;
  zone_name?: string;
  status: string;
  reservation_id?: string | null;
  customer_name?: string;
  check_in_time?: string | Date;
  error_message?: string;
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

  // =========================================================================
  // STATE QUẢN LÝ QUYỀN TRUY CẬP BÀN ĂN (TK-142)
  // =========================================================================
  const [tableAccessState, setTableAccessState] = useState<TableAccessState>('CHECKING');
  const [tableAccessInfo, setTableAccessInfo] = useState<TableAccessInfo | null>(null);

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

  // =========================================================================
  // 1. API VALIDATE TABLE QR ACCESS (TK-142 - CHỈ MỞ KHI BÀN SEATED)
  // =========================================================================
  const validateTableAccess = async (targetTable: string) => {
    setTableAccessState('CHECKING');
    try {
      const res = await fetch('/api/v1/tables/validate-qr-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_number: targetTable }),
      });
      const json = await res.json();

      if (res.status === 200 && json.success && json.data?.can_order) {
        setTableAccessState('ALLOWED');
        setTableAccessInfo(json.data);
      } else if (res.status === 403 || json.error === 'TABLE_NOT_OCCUPIED') {
        setTableAccessState('LOCKED');
        setTableAccessInfo({
          can_order: false,
          table_number: json.data?.table_number || targetTable,
          zone_name: json.data?.zone_name || 'Khu vực chính',
          status: json.data?.status || 'AVAILABLE',
          error_message:
            json.message ||
            'Bàn ăn hiện chưa được kích hoạt phục vụ. Quý khách vui lòng làm thủ tục Check-in hoặc liên hệ nhân viên trước khi gọi món.',
        });
      } else if (res.status === 404 || json.error === 'TABLE_NOT_FOUND') {
        setTableAccessState('LOCKED');
        setTableAccessInfo({
          can_order: false,
          table_number: targetTable,
          status: 'NOT_FOUND',
          error_message: 'Không tìm thấy thông tin bàn ăn trong hệ thống SmaRes.',
        });
      } else {
        setTableAccessState('LOCKED');
        setTableAccessInfo({
          can_order: false,
          table_number: targetTable,
          status: 'UNAVAILABLE',
          error_message: json.message || 'Chưa thể xác thực phiên phục vụ của bàn ăn.',
        });
      }
    } catch (err) {
      console.error('Lỗi gọi API validate table QR access:', err);
      setTableAccessState('LOCKED');
      setTableAccessInfo({
        can_order: false,
        table_number: targetTable,
        status: 'CONNECTION_ERROR',
        error_message: 'Không thể kết nối đến máy chủ xác thực bàn ăn.',
      });
    }
  };

  useEffect(() => {
    validateTableAccess(currentTableNumber);
  }, [currentTableNumber]);

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

  // Mở modal tùy biến món (TK-160) - Đã khóa an toàn nếu bàn chưa SEATED
  const handleOpenCustomize = (dish: MenuItemData) => {
    if (tableAccessState !== 'ALLOWED') {
      setToastMessage('Bàn ăn hiện chưa mở phiên phục vụ. Quý khách vui lòng check-in trước.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
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
    if (tableAccessState !== 'ALLOWED') {
      setToastMessage('Bàn ăn hiện chưa mở phiên phục vụ.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

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
    if (tableAccessState !== 'ALLOWED') {
      setToastMessage('Bàn ăn hiện chưa mở phiên phục vụ.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
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
        }

        if (isSpicyBoldIntent) {
          const isSpicy =
            combinedText.includes('cay') ||
            combinedText.includes('sốt tiêu') ||
            combinedText.includes('nướng than') ||
            combinedText.includes('món chính') ||
            combinedText.includes('bò') ||
            dish.name.includes('Bò Wagyu') ||
            dish.name.includes('Heo');

          if (isSpicy) {
            isMatched = true;
            badgeReason = 'Hương vị đậm đà, dậy vị cay nồng chuẩn vị';
          }
        }

        if (isBestSellerIntent) {
          const isPopular =
            dish.isPreOrderOnly ||
            dish.price >= 150000 ||
            combinedText.includes('thượng hạng') ||
            dish.name.includes('Wagyu') ||
            dish.name.includes('Nem') ||
            dish.name.includes('Cá');

          if (isPopular) {
            isMatched = true;
            badgeReason = 'Món bán chạy nhất & được thực khách yêu thích';
          }
        }

        if (isRefreshingDessertIntent) {
          const isRefresh =
            dish.category === 'Đồ uống' ||
            dish.category === 'Tráng miệng' ||
            combinedText.includes('mát') ||
            combinedText.includes('chè') ||
            combinedText.includes('trà') ||
            combinedText.includes('sen');

          if (isRefresh) {
            isMatched = true;
            badgeReason = 'Món ngọt thanh mát giải nhiệt hoàn hảo';
          }
        }

        if (!isSemanticFiltering && queryNormalized !== '') {
          if (combinedText.includes(queryNormalized)) {
            isMatched = true;
            badgeReason = `Khớp từ khóa "${debouncedQuery}"`;
          }
        }

        if (!isSemanticFiltering && queryNormalized === '') {
          isMatched = true;
        }

        return {
          dish,
          isMatched,
          badgeReason,
        };
      })
      .filter((item) => {
        if (!item.isMatched) return false;
        if (activeCategory === 'Tất cả') return true;
        if (activeCategory === 'Món đặc biệt') return item.dish.isPreOrderOnly;
        return item.dish.category === activeCategory;
      })
      .map((item) => ({
        dish: item.dish,
        badge_reason: item.badgeReason,
      }));
  }, [menuList, debouncedQuery, activeFilterChip, activeCategory]);

  // =========================================================================
  // GIAO DIỆN 1: LOADING SKELETON TRANG NHÃ KHI ĐANG KIỂM TRA (CHECKING)
  // =========================================================================
  if (tableAccessState === 'CHECKING') {
    return (
      <main className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="text-center max-w-sm mx-auto p-8 rounded-3xl bg-white border border-[#EBE7DF] shadow-[0_10px_30px_-5px_rgba(28,25,23,0.05)]">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-100 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-4 border-[#14532D] border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-[#14532D]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
          </div>
          <h3 className="font-serif text-lg font-bold text-stone-900 mb-1">
            Xác Thực Bàn {currentTableNumber}
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            Đang kiểm tra tính hợp lệ của mã QR và phiên phục vụ bàn ăn...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================================
  // GIAO DIỆN 2: MÀN HÌNH KHÓA GASTRONOMY LOCK SCREEN KHI BÀN CHƯA SEATED (LOCKED)
  // =========================================================================
  if (tableAccessState === 'LOCKED') {
    return (
      <main className="min-h-screen bg-[#FAF8F5] relative flex flex-col justify-between selection:bg-[#14532d]/20 selection:text-[#14532d]">
        {/* Thanh Header tối giản */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#EBE7DF]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="w-8 h-8 rounded-xl bg-[#14532D] text-white font-serif font-bold flex items-center justify-center text-sm shadow-xs group-hover:bg-[#0F4C3A] transition-colors">
                S
              </span>
              <div>
                <span className="font-serif font-bold text-[#1C1917] text-base leading-none block">
                  SmaRes
                </span>
                <span className="text-[10px] tracking-wider uppercase text-[#14532D] font-semibold">
                  Gastronomy
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setIsCallWaiterOpen(true)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] shadow-xs active:scale-95"
            >
              <svg className="w-3.5 h-3.5 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>Gọi nhân viên</span>
            </button>
          </div>
        </header>

        {/* Khung Khóa Gastronomy Lock Card */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#EBE7DF] shadow-[0_20px_50px_-12px_rgba(28,25,23,0.1)] p-6 sm:p-8 text-center relative overflow-hidden">
            {/* Dải gradient trang trí phong cách hoàng gia */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#14532D] via-[#D97706] to-[#14532D]" />

            {/* Biểu tượng Ổ Khóa An Toàn Tinh Xảo */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] border-4 border-white shadow-md flex items-center justify-center mx-auto mb-5 text-[#B45309]">
              <svg className="w-9 h-9 text-[#92400E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                <circle cx="12" cy="16" r="1.5" />
              </svg>
            </div>

            {/* Badge Trạng thái bàn */}
            <div className="mb-3">
              {tableAccessInfo?.status === 'AVAILABLE' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Bàn Trống (Chưa Làm Thủ Tục Check-in)
                </span>
              )}
              {tableAccessInfo?.status === 'RESERVED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Bàn Đã Đặt Trước (Chưa Nhận Bàn)
                </span>
              )}
              {tableAccessInfo?.status === 'CLEANING' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-300">
                  <span className="w-2 h-2 rounded-full bg-stone-500" />
                  Bàn Đang Được Dọn Dẹp Chuẩn Bị
                </span>
              )}
              {tableAccessInfo?.status === 'NOT_FOUND' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Số Bàn Không Tồn Tại
                </span>
              )}
              {tableAccessInfo?.status !== 'AVAILABLE' &&
                tableAccessInfo?.status !== 'RESERVED' &&
                tableAccessInfo?.status !== 'CLEANING' &&
                tableAccessInfo?.status !== 'NOT_FOUND' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-300">
                    <span className="w-2 h-2 rounded-full bg-stone-400" />
                    Chưa Kích Hoạt Phục Vụ
                  </span>
                )}
            </div>

            {/* Tiêu đề & Thông điệp lịch sự */}
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] tracking-tight mb-2">
              Bàn {currentTableNumber} Chưa Mở Phiên Phục Vụ
            </h2>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md mx-auto mb-6">
              {tableAccessInfo?.error_message ||
                'Bàn ăn hiện chưa được kích hoạt phục vụ. Quý khách vui lòng làm thủ tục Check-in hoặc liên hệ nhân viên trước khi gọi món.'}
            </p>

            {/* Khối quy tắc phục vụ chuẩn Gastronomy */}
            <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-[#EBE7DF] mb-6 text-left flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white border border-[#EBE7DF] text-[#14532D] shrink-0 shadow-2xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xs text-stone-600 leading-relaxed">
                <p className="font-semibold text-stone-900 mb-0.5">
                  Quy chuẩn phục vụ SmaRes:
                </p>
                <p>
                  Mỗi đơn gọi món điện tử tại bàn phải gắn liền với khách đã Check-in hợp lệ để đảm bảo đầu bếp chế biến đúng yêu cầu và phục vụ chính xác vị trí bàn.
                </p>
              </div>
            </div>

            {/* Các nút hành động chính (CTAs) */}
            <div className="space-y-3">
              <Link
                href="/booking"
                className="w-full bg-[#14532D] hover:bg-[#0F4C3A] text-white font-medium py-3.5 px-6 rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 group cursor-pointer active:scale-98"
              >
                <svg className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span>Quét mã Check-in tại bàn</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsCallWaiterOpen(true)}
                className="w-full bg-white hover:bg-stone-50 text-[#1C1917] font-medium py-3.5 px-6 rounded-xl text-xs sm:text-sm border border-[#D6D0C4] hover:border-[#D97706] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-98"
              >
                <svg className="w-4 h-4 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>Yêu cầu nhân viên hỗ trợ</span>
              </button>

              <button
                type="button"
                onClick={() => validateTableAccess(currentTableNumber)}
                className="w-full py-2.5 text-xs text-stone-500 hover:text-stone-800 font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Kiểm tra lại sau khi đã Check-in</span>
              </button>
            </div>

            {/* Dải Demo Bàn để kiểm thử nhanh các trạng thái */}
            <div className="mt-6 pt-4 border-t border-[#EBE7DF]/80 text-[11px] text-stone-500">
              <span className="font-semibold block mb-1 text-stone-600">
                Chuyển nhanh số bàn để trải nghiệm:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {[
                  { num: 'B04', label: 'Bàn B04 (SEATED - Mở)' },
                  { num: '04', label: 'Bàn 04 (SEATED - Mở)' },
                  { num: 'B01', label: 'B01 (Trống - Khóa)' },
                  { num: 'B02', label: 'B02 (Đã đặt - Khóa)' },
                  { num: 'B03', label: 'B03 (Dọn - Khóa)' },
                ].map((demo) => (
                  <Link
                    key={demo.num}
                    href={`/table-menu?table=${demo.num}`}
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-medium transition-all ${
                      currentTableNumber === demo.num
                        ? 'bg-[#14532D] text-white border-[#14532D]'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                    }`}
                  >
                    {demo.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal gọi phục vụ vẫn sẵn sàng trong màn hình khóa */}
        <CallWaiterModal
          isOpen={isCallWaiterOpen}
          onClose={() => setIsCallWaiterOpen(false)}
          tableNumber={currentTableNumber}
          onSuccess={handleCallWaiterSuccess}
        />
      </main>
    );
  }

  // =========================================================================
  // GIAO DIỆN 3: THỰC ĐƠN ĐIỆN TỬ TẠI BÀN HOÀN CHỈNH KHI ĐÃ SEATED (ALLOWED)
  // =========================================================================
  return (
    <main className="min-h-screen bg-stone-50 pb-28 text-stone-800 font-sans selection:bg-[#14532d]/20 selection:text-[#14532d]">
      {/* Toast thông báo nổi */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1C1917] text-white text-xs px-4 py-2.5 rounded-full shadow-lg border border-stone-700 flex items-center gap-2 animate-bounce">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================================================================= */}
      {/* BANNER XÁC NHẬN PHIÊN PHỤC VỤ ĐANG HOẠT ĐỘNG (TK-142)              */}
      {/* ================================================================= */}
      <div className="bg-[#DCFCE7]/90 border-b border-[#86EFAC]/70 px-4 py-2 text-center text-xs text-[#15803D] flex flex-wrap items-center justify-center gap-2 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-bold tracking-tight">Bàn số {currentTableNumber}</span>
        <span className="text-emerald-400">•</span>
        <span className="text-stone-600">{tableAccessInfo?.zone_name || 'Khu vực chính'}</span>
        <span className="text-emerald-400">•</span>
        <span className="inline-flex items-center gap-1 font-semibold text-emerald-900">
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Phiên phục vụ đang mở
        </span>
        {tableAccessInfo?.customer_name && (
          <>
            <span className="text-emerald-400">•</span>
            <span className="text-stone-700">Chào mừng <strong>{tableAccessInfo.customer_name}</strong></span>
          </>
        )}
      </div>

      {/* ================================================================= */}
      {/* 1. THANH HEADER ĐIỀU HƯỚNG TẠI BÀN                                */}
      {/* ================================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand & Số bàn */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="w-8 h-8 rounded-xl bg-[#14532D] text-white font-serif font-bold flex items-center justify-center text-sm shadow-xs group-hover:bg-[#0F4C3A] transition-colors">
                S
              </span>
              <div className="hidden sm:block">
                <span className="font-serif font-bold text-stone-900 text-base leading-none block">
                  SmaRes
                </span>
                <span className="text-[10px] tracking-wider uppercase text-[#14532D] font-semibold">
                  Gastronomy
                </span>
              </div>
            </Link>

            <span className="h-5 w-px bg-stone-200 hidden sm:block" />

            {/* Badge hiển thị bàn ăn hiện tại */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-900 shadow-2xs">
              <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-xs font-bold tracking-tight">
                Bàn số {currentTableNumber}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            </div>
          </div>

          {/* Cụm hành động nhanh: Nút gọi phục vụ & Giỏ hàng */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCallWaiterOpen(true)}
              className="px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs active:scale-95"
            >
              <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>Gọi nhân viên</span>
            </button>

            <Link
              href="/cart"
              className="relative p-2 rounded-full text-stone-600 hover:text-emerald-800 hover:bg-stone-100 transition-colors"
              aria-label="Giỏ hàng"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#14532D] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
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
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
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
              className="w-full pl-10 pr-10 py-3 rounded-full text-xs sm:text-sm bg-stone-100/80 focus:bg-white border border-stone-300/80 focus:border-[#14532D] focus:ring-3 focus:ring-[#14532D]/15 focus:outline-none transition-all placeholder:text-stone-400 text-stone-800 shadow-2xs"
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
                      ? 'bg-[#14532D] text-white ring-2 ring-emerald-600/40 shadow-xs'
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
      {/* 4. THANH BÁO TRẠNG THÁI TÌM KIẾM TỰ NHIÊN NẾU CÓ                  */}
      {/* ================================================================= */}
      {(debouncedQuery !== '' || activeFilterChip !== null) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-950">
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 font-bold">✨ Gợi ý thông minh:</span>
              <span>
                Tìm thấy <strong>{semanticDishes.length}</strong> món phù hợp với tiêu chí &ldquo;
                <span className="italic font-semibold text-emerald-900">
                  {activeFilterChip || debouncedQuery}
                </span>
                &rdquo;
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer ml-2"
            >
              Đặt lại
            </button>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 5. DANH SÁCH MÓN ĂN (GRID DISHES)                                  */}
      {/* ================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {semanticDishes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-stone-300 p-8">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-3xl mx-auto mb-3">
              🍲
            </div>
            <h3 className="font-serif text-base font-bold text-stone-800 mb-1">
              Không tìm thấy món ăn phù hợp
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
              Không có món ăn nào khớp với câu lệnh &ldquo;{debouncedQuery || activeFilterChip}&rdquo;.
              Quý khách vui lòng thử tìm kiếm với khẩu vị khác hoặc chọn danh mục phía trên.
            </p>
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-4 py-2 bg-stone-900 text-white rounded-full text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Xem toàn bộ thực đơn
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {semanticDishes.map(({ dish, badge_reason }) => {
              const itemInCart = cart.find((i) => i._id === dish._id);
              const cartQuantity = itemInCart ? itemInCart.quantity : 0;

              return (
                <DishCard
                  key={dish._id}
                  dish={dish}
                  badge_reason={badge_reason}
                  onAddToCart={handleDirectAddToCart}
                  onCustomize={handleOpenCustomize}
                  cartQuantity={cartQuantity}
                  hasActiveBooking={hasActiveBooking}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 6. THANH TỔNG GIỎ HÀNG DƯỚI ĐÁY CỐ ĐỊNH (BOTTOM BAR)              */}
      {/* ================================================================= */}
      {totalItems > 0 && (
        <aside className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 py-3 px-4 sm:px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-slideUp">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {totalItems}
              </div>
              <div>
                <p className="text-[11px] text-stone-500 font-medium">
                  Bàn {currentTableNumber} • Đã chọn {totalItems} món
                </p>
                <p className="text-base font-bold text-stone-900 tracking-tight">
                  {formatMoney(totalPrice)}
                </p>
              </div>
            </div>

            <Link
              href="/cart"
              className="bg-[#14532D] hover:bg-[#0F4C3A] text-white px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 group active:scale-95"
            >
              <span>Xem giỏ &amp; Đặt món</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>
        </aside>
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

            <h3 className="font-serif text-lg font-bold text-stone-900 mb-1.5">
              {specialDishModal.name}
            </h3>

            <p className="text-xs text-stone-600 leading-relaxed mb-5">
              Món ăn này yêu cầu đầu bếp chuẩn bị trước qua nhiều giờ hầm nướng kỳ công.
              <strong> Cần đặt bàn trước để đảm bảo phục vụ tốt nhất.</strong>
            </p>

            <div className="space-y-2">
              <Link
                href="/booking"
                className="block w-full bg-[#14532D] hover:bg-[#0F4C3A] text-white font-bold py-3 rounded-xl text-xs shadow-sm transition-all text-center"
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
        <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-[#14532D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
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
