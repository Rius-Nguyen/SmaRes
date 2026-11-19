"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart, ItemCustomizations } from '@/app/context/CartContext';
import { formatMoney } from '@/app/lib/format';
import { INITIAL_MENU_ITEMS, MenuItemData } from '@/app/lib/menuInitialData';
import {
  filterDishesBySemanticIntent,
  type SemanticDishResult,
} from '@/app/lib/semanticMenuSearch';
import DishCard from '@/components/menu/DishCard';
import TableSessionHeader from '@/components/menu/TableSessionHeader';
import CustomizationModal from '@/components/menu/CustomizationModal';
import CallWaiterModal from '@/components/menu/CallWaiterModal';
import SpecialDishModal from '@/components/menu/SpecialDishModal';
import { useToast } from '@/components/ui/Toast';

type PromptChipId = 'thanh-dam' | 'cay-nong' | 'best-seller' | 'giai-nhiet';

interface PromptChipOption {
  id: PromptChipId;
  label: string;
  query: string;
}

const PROMPT_CHIPS: readonly PromptChipOption[] = [
  { id: 'thanh-dam', label: 'Món thanh đạm', query: 'thanh đạm không cay' },
  { id: 'cay-nong', label: 'Món cay đậm đà', query: 'cay đậm đà' },
  { id: 'best-seller', label: 'Best Seller', query: 'best seller' },
  { id: 'giai-nhiet', label: 'Tráng miệng mát mẻ', query: 'tráng miệng giải nhiệt' },
];

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

interface ValidateQrResponse {
  success?: boolean;
  error?: string;
  message?: string;
  data?: {
    can_order?: boolean;
    table_id?: string;
    table_number?: string;
    zone_name?: string;
    status?: string;
    reservation_id?: string | null;
    customer_name?: string;
    check_in_time?: string | Date;
  };
}

async function fetchTableAccess(
  targetTable: string
): Promise<{ state: TableAccessState; info: TableAccessInfo }> {
  try {
    const res = await fetch('/api/v1/tables/validate-qr-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_number: targetTable }),
    });
    const json = (await res.json()) as ValidateQrResponse;

    if (res.status === 200 && json.success && json.data?.can_order) {
      return {
        state: 'ALLOWED',
        info: {
          can_order: true,
          table_id: json.data.table_id,
          table_number: json.data.table_number || targetTable,
          zone_name: json.data.zone_name,
          status: json.data.status || 'SEATED',
          reservation_id: json.data.reservation_id,
          customer_name: json.data.customer_name,
          check_in_time: json.data.check_in_time,
        },
      };
    }

    if (res.status === 403 || json.error === 'TABLE_NOT_OCCUPIED') {
      return {
        state: 'LOCKED',
        info: {
          can_order: false,
          table_number: json.data?.table_number || targetTable,
          zone_name: json.data?.zone_name || 'Khu vực chính',
          status: json.data?.status || 'AVAILABLE',
          error_message:
            json.message ||
            'Bàn ăn hiện chưa được kích hoạt phục vụ. Quý khách vui lòng làm thủ tục Check-in hoặc liên hệ nhân viên trước khi gọi món.',
        },
      };
    }

    if (res.status === 404 || json.error === 'TABLE_NOT_FOUND') {
      return {
        state: 'LOCKED',
        info: {
          can_order: false,
          table_number: targetTable,
          status: 'NOT_FOUND',
          error_message: 'Không tìm thấy thông tin bàn ăn trong hệ thống SmaRes.',
        },
      };
    }

    return {
      state: 'LOCKED',
      info: {
        can_order: false,
        table_number: targetTable,
        status: 'UNAVAILABLE',
        error_message: json.message || 'Chưa thể xác thực phiên phục vụ của bàn ăn.',
      },
    };
  } catch (err) {
    console.error('Lỗi gọi API validate table QR access:', err);
    return {
      state: 'LOCKED',
      info: {
        can_order: false,
        table_number: targetTable,
        status: 'CONNECTION_ERROR',
        error_message: 'Không thể kết nối đến máy chủ xác thực bàn ăn.',
      },
    };
  }
}

function PromptChipIcon({ id, isActive }: { id: PromptChipId; isActive: boolean }) {
  const colorClass = isActive ? 'text-emerald-200' : 'text-[#14532d]';
  switch (id) {
    case 'thanh-dam':
      return (
        <svg className={`w-3.5 h-3.5 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      );
    case 'cay-nong':
      return (
        <svg className={`w-3.5 h-3.5 ${isActive ? 'text-[#fbbf24]' : 'text-[#d97706]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      );
    case 'best-seller':
      return (
        <svg className={`w-3.5 h-3.5 ${isActive ? 'text-[#fbbf24]' : 'text-[#d97706]'}`} viewBox="0 0 24 24" fill="currentColor">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case 'giai-nhiet':
      return (
        <svg className={`w-3.5 h-3.5 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      );
  }
}

function TableMenuContent() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table');
  const { showToast } = useToast();

  const {
    cart,
    addToCart,
    totalItems,
    totalPrice,
    hasActiveBooking,
    bookingInfo,
  } = useCart();

  const currentTableNumber = tableParam || bookingInfo?.tableNumber || '04';

  const [tableAccessState, setTableAccessState] = useState<TableAccessState>('CHECKING');
  const [tableAccessInfo, setTableAccessInfo] = useState<TableAccessInfo | null>(null);
  const [checkedTable, setCheckedTable] = useState<string | null>(null);
  const [isManualChecking, setIsManualChecking] = useState<boolean>(false);

  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [activeFilterChip, setActiveFilterChip] = useState<string | null>(null);

  const [menuList, setMenuList] = useState<MenuItemData[]>(INITIAL_MENU_ITEMS);
  const [specialDishModal, setSpecialDishModal] = useState<MenuItemData | null>(null);
  const [customizingDish, setCustomizingDish] = useState<MenuItemData | null>(null);
  const [isCallWaiterOpen, setIsCallWaiterOpen] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    void fetchTableAccess(currentTableNumber).then(({ state, info }) => {
      if (isCancelled) return;
      setTableAccessState(state);
      setTableAccessInfo(info);
      setCheckedTable(currentTableNumber);
    });

    return () => {
      isCancelled = true;
    };
  }, [currentTableNumber]);

  const handleRecheckTableAccess = async () => {
    setIsManualChecking(true);
    const { state, info } = await fetchTableAccess(currentTableNumber);
    setTableAccessState(state);
    setTableAccessInfo(info);
    setCheckedTable(currentTableNumber);
    setIsManualChecking(false);
  };

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
        console.error('Lỗi tải thực đơn SmaRes, dùng dữ liệu mẫu:', err);
      }
    };

    void fetchMenu();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpenCustomize = (dish: MenuItemData) => {
    if (dish.isAvailable === false) {
      showToast(`Món "${dish.name}" hiện tạm hết, quý khách vui lòng chọn món khác.`, 'warning');
      return;
    }
    if (tableAccessState !== 'ALLOWED') {
      showToast('Bàn ăn hiện chưa mở phiên phục vụ. Quý khách vui lòng check-in trước.', 'warning');
      return;
    }
    if (dish.isPreOrderOnly && !hasActiveBooking) {
      setSpecialDishModal(dish);
      return;
    }
    setCustomizingDish(dish);
  };

  const handleCustomizationConfirm = (
    dish: MenuItemData,
    customizations: ItemCustomizations,
    quantity: number
  ) => {
    if (dish.isAvailable === false) {
      showToast(`Món "${dish.name}" hiện tạm hết, quý khách vui lòng chọn món khác.`, 'warning');
      return;
    }
    if (tableAccessState !== 'ALLOWED') {
      showToast('Bàn ăn hiện chưa mở phiên phục vụ.', 'warning');
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

    showToast(`Đã thêm ${quantity} phần "${dish.name}" vào giỏ hàng!`, 'success');
  };

  const handleDirectAddToCart = (dish: MenuItemData) => {
    if (dish.isAvailable === false) {
      showToast(`Món "${dish.name}" hiện tạm hết, quý khách vui lòng chọn món khác.`, 'warning');
      return;
    }
    if (tableAccessState !== 'ALLOWED') {
      showToast('Bàn ăn hiện chưa mở phiên phục vụ.', 'warning');
      return;
    }
    if (dish.isPreOrderOnly && !hasActiveBooking) {
      setSpecialDishModal(dish);
      return;
    }
    handleOpenCustomize(dish);
  };

  const handleChipClick = (chipLabel: string) => {
    if (activeFilterChip === chipLabel) {
      setActiveFilterChip(null);
    } else {
      setActiveFilterChip(chipLabel);
      setSearchQuery('');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setActiveFilterChip(null);
  };

  const semanticDishes: SemanticDishResult[] = useMemo(() => {
    return filterDishesBySemanticIntent(
      menuList,
      debouncedQuery,
      activeFilterChip,
      activeCategory
    );
  }, [menuList, debouncedQuery, activeFilterChip, activeCategory]);

  const isChecking =
    isManualChecking ||
    tableAccessState === 'CHECKING' ||
    checkedTable !== currentTableNumber;

  // =========================================================================
  // GIAO DIỆN 1: LOADING SKELETON KHI ĐANG KIỂM TRA (CHECKING)
  // =========================================================================
  if (isChecking) {
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
          <h3 className="font-serif text-lg font-bold text-[#1C1917] mb-1">
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

        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#EBE7DF] shadow-[0_20px_50px_-12px_rgba(28,25,23,0.1)] p-6 sm:p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#14532D] via-[#D97706] to-[#14532D]" />

            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] border-4 border-white shadow-md flex items-center justify-center mx-auto mb-5 text-[#B45309]">
              <svg className="w-9 h-9 text-[#92400E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                <circle cx="12" cy="16" r="1.5" />
              </svg>
            </div>

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

            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] tracking-tight mb-2">
              Bàn {currentTableNumber} Chưa Mở Phiên Phục Vụ
            </h2>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md mx-auto mb-6">
              {tableAccessInfo?.error_message ||
                'Bàn ăn hiện chưa được kích hoạt phục vụ. Quý khách vui lòng làm thủ tục Check-in hoặc liên hệ nhân viên trước khi gọi món.'}
            </p>

            <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-[#EBE7DF] mb-6 text-left flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white border border-[#EBE7DF] text-[#14532D] shrink-0 shadow-2xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xs text-stone-600 leading-relaxed">
                <p className="font-semibold text-[#1C1917] mb-0.5">
                  Quy chuẩn phục vụ SmaRes:
                </p>
                <p>
                  Mỗi đơn gọi món điện tử tại bàn phải gắn liền với khách đã Check-in hợp lệ để đảm bảo đầu bếp chế biến đúng yêu cầu và phục vụ chính xác vị trí bàn.
                </p>
              </div>
            </div>

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
                onClick={() => void handleRecheckTableAccess()}
                className="w-full py-2.5 text-xs text-stone-500 hover:text-[#1C1917] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Kiểm tra lại sau khi đã Check-in</span>
              </button>
            </div>

            {/* Chỉ hiển thị Demo Switcher ở môi trường development */}
            {process.env.NODE_ENV === 'development' && (
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
            )}
          </div>
        </div>

        <CallWaiterModal
          isOpen={isCallWaiterOpen}
          onClose={() => setIsCallWaiterOpen(false)}
          tableNumber={currentTableNumber}
        />
      </main>
    );
  }

  // =========================================================================
  // GIAO DIỆN 3: THỰC ĐƠN ĐIỆN TỬ TẠI BÀN KHI ĐÃ SEATED (ALLOWED)
  // =========================================================================
  return (
    
    <main className="min-h-screen bg-[#FAF8F5] pb-28 text-[#1C1917] font-sans selection:bg-[#14532d]/20 selection:text-[#14532d]">
      <TableSessionHeader
        tableNumber={currentTableNumber}
        zoneName={tableAccessInfo?.zone_name || 'Khu vực chính'}
        customerName={tableAccessInfo?.customer_name}
        sessionStatus="SEATED"
        canOrder={tableAccessInfo?.can_order ?? true}
        totalItems={totalItems}
        onRefresh={() => void handleRecheckTableAccess()}
        onOpenCallWaiter={() => setIsCallWaiterOpen(true)}
      />
      {/* Banner xác nhận phiên phục vụ */}

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
            <span className="text-stone-700">
              Chào mừng <strong>{tableAccessInfo.customer_name}</strong>
            </span>
          </>
        )}
      

      {/* Thanh header điều hướng tại bàn */}
      
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="w-8 h-8 rounded-xl bg-[#14532D] text-white font-serif font-bold flex items-center justify-center text-sm shadow-xs group-hover:bg-[#0F4C3A] transition-colors">
                S
              </span>
              <div className="hidden sm:block">
                <span className="font-serif font-bold text-[#1C1917] text-base leading-none block">
                  SmaRes
                </span>
                <span className="text-[10px] tracking-wider uppercase text-[#14532D] font-semibold">
                  Gastronomy
                </span>
              </div>
            </Link>

            <span className="h-5 w-px bg-[#EBE7DF] hidden sm:block" />

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-[#14532D] shadow-2xs">
              <svg className="w-3.5 h-3.5 text-[#14532D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-xs font-bold tracking-tight">
                Bàn số {currentTableNumber}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCallWaiterOpen(true)}
              className="px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] shadow-2xs active:scale-95"
            >
              <svg className="w-3.5 h-3.5 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>Gọi nhân viên</span>
            </button>

            <Link
              href="/cart"
              className="relative p-2 rounded-full text-stone-600 hover:text-[#14532D] hover:bg-[#F5F2EB] transition-colors"
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
      

      {/* Khối tìm kiếm câu lệnh tự nhiên & Prompt Chips */}
      <section className="bg-gradient-to-b from-white via-white to-[#FAF8F5] border-b border-[#EBE7DF] pt-5 pb-4 px-4 sm:px-6 shadow-2xs">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-3">
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
              Thực Đơn Điện Tử Tại Bàn
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Nhập khẩu vị mong muốn hoặc bấm chọn gợi ý nhanh bên dưới
            </p>
          </div>

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
              placeholder="Nhập yêu cầu: 'món thanh đạm không cay', 'nước ép giải nhiệt'..."
              className="w-full pl-10 pr-10 py-3 rounded-full text-xs sm:text-sm bg-[#F5F2EB]/70 focus:bg-white border border-[#D6D0C4] focus:border-[#14532D] focus:ring-3 focus:ring-[#14532D]/15 focus:outline-none transition-all placeholder:text-stone-400 text-[#1C1917] shadow-2xs"
            />

            {(searchQuery !== '' || activeFilterChip !== null) && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-700 cursor-pointer"
                aria-label="Xóa tìm kiếm"
              >
                <span className="w-5 h-5 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 flex items-center justify-center">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </span>
              </button>
            )}
          </div>

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
                  className={`px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition-all duration-200 cursor-pointer text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 ${
                    isActive
                      ? 'bg-[#14532D] text-white ring-2 ring-emerald-600/40 shadow-xs'
                      : 'bg-white hover:bg-[#F5F2EB] text-[#1C1917] border border-[#EBE7DF]'
                  }`}
                >
                  <PromptChipIcon id={chip.id} isActive={isActive} />
                  <span>{chip.label}</span>
                  {isActive && (
                    <svg className="w-3 h-3 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Thanh Tab Danh mục món ăn */}
      <section className="bg-white border-b border-[#EBE7DF] py-3 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'Tất cả', label: 'Tất cả' },
            { id: 'Khai vị', label: 'Khai vị' },
            { id: 'Món chính', label: 'Món chính' },
            { id: 'Tráng miệng', label: 'Tráng miệng' },
            { id: 'Đồ uống', label: 'Đồ uống' },
            { id: 'Món đặc biệt', label: 'Món đặc quyền', isSpecial: true },
          ].map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  isActive
                    ? tab.isSpecial
                      ? 'bg-[#D97706] text-white shadow-xs'
                      : 'bg-[#1C1917] text-white shadow-xs'
                    : tab.isSpecial
                    ? 'text-[#92400E] bg-[#FFFBEB] hover:bg-[#FEF3C7] border border-[#FDE68A]'
                    : 'text-stone-600 hover:text-[#1C1917] hover:bg-[#F5F2EB]'
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
      </section>

      {/* Thanh báo trạng thái tìm kiếm thông minh */}
      {(debouncedQuery !== '' || activeFilterChip !== null) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-[#14532D]">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[#14532D] font-bold">
                <svg className="w-3.5 h-3.5 text-[#D97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
                </svg>
                <span>Gợi ý thông minh:</span>
              </span>
              <span>
                Tìm thấy <strong>{semanticDishes.length}</strong> món phù hợp với tiêu chí &ldquo;
                <span className="italic font-semibold text-[#14532D]">
                  {activeFilterChip || debouncedQuery}
                </span>
                &rdquo;
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-[#14532D] hover:text-[#0F4C3A] font-bold underline cursor-pointer ml-2"
            >
              Đặt lại
            </button>
          </div>
        </section>
      )}

      {/* Danh sách món ăn */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {semanticDishes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#D6D0C4] p-8">
            <div className="w-16 h-16 rounded-full bg-[#FAF8F5] border border-[#EBE7DF] flex items-center justify-center text-stone-400 mx-auto mb-3">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <h3 className="font-serif text-base font-bold text-[#1C1917] mb-1">
              Không tìm thấy món ăn phù hợp
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
              Không có món ăn nào khớp với câu lệnh &ldquo;{debouncedQuery || activeFilterChip}&rdquo;.
              Quý khách vui lòng thử tìm kiếm với khẩu vị khác hoặc chọn danh mục phía trên.
            </p>
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-4 py-2 bg-[#14532D] text-white rounded-full text-xs font-semibold hover:bg-[#15803D] transition-colors cursor-pointer"
            >
              Xem toàn bộ thực đơn
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {semanticDishes.map(({ dish, badge_reason }) => {
              const cartQuantity = cart
                .filter((i) => i._id === dish._id)
                .reduce((sum, i) => sum + i.quantity, 0);

              return (
                <DishCard
                  key={dish._id}
                  dish={dish}
                  badge_reason={badge_reason}
                  variant="compact"
                  isSoldOut={dish.isAvailable === false}
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

      {/* Thanh tổng giỏ hàng cố định dưới đáy */}
      {totalItems > 0 && (
        <aside className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EBE7DF] py-3 px-4 sm:px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-slideUp">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#14532D] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {totalItems}
              </div>
              <div>
                <p className="text-[11px] text-stone-500 font-medium">
                  Bàn {currentTableNumber} • Đã chọn {totalItems} món
                </p>
                <p className="text-base font-bold text-[#1C1917] tracking-tight">
                  {formatMoney(totalPrice)}
                </p>
              </div>
            </div>

            <Link
              href="/cart"
              className="bg-[#14532D] hover:bg-[#0F4C3A] text-white px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 group active:scale-95"
            >
              <span>Xem giỏ &amp; Đặt món</span>
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </aside>
      )}

      {/* Modal Tùy biến món ăn */}
      <CustomizationModal
        dish={customizingDish}
        isOpen={customizingDish !== null}
        onClose={() => setCustomizingDish(null)}
        onConfirm={handleCustomizationConfirm}
      />

      {/* Modal Gọi phục vụ tại bàn */}
      <CallWaiterModal
        isOpen={isCallWaiterOpen}
        onClose={() => setIsCallWaiterOpen(false)}
        tableNumber={currentTableNumber}
      />

      {/* Modal Món đặc quyền đặt trước dùng chung */}
      <SpecialDishModal
        dish={specialDishModal}
        onClose={() => setSpecialDishModal(null)}
      />
    </main>
  );
}

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
