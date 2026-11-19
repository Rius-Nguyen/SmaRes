"use client";

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { INITIAL_MENU_ITEMS, MenuItemData } from '@/app/lib/menuInitialData';
import { useCart } from '@/app/context/CartContext';
import { useToast } from '@/components/ui/Toast';
import { formatMoney } from '@/app/lib/format';

const FEATURED_DISH_IDS = [
  '6717a01a1e0011a100000004', // Phở Bò Wagyu A5 Thượng Hạng Dát Vàng - 380.000đ
  '6717a01a1e0011a100000002', // Chả Giò Cua Hoàng Đế & Trứng Cá Tầm Caviar - 295.000đ
  '6717a01a1e0011a100000005', // Vịt Quay Bắc Kinh Sốt Mật Ong Rừng Tây Bắc - 450.000đ
] as const;

const FEATURED_BADGES: Record<string, { label: string; style: string; dot: string }> = {
  '6717a01a1e0011a100000004': {
    label: 'Signature',
    style: 'bg-[#14532d]/90 text-white border-emerald-400/30',
    dot: 'bg-[#fbbf24]',
  },
  '6717a01a1e0011a100000002': {
    label: 'Thượng Hạng',
    style: 'bg-[#b45309]/90 text-white border-amber-400/30',
    dot: 'bg-white',
  },
  '6717a01a1e0011a100000005': {
    label: 'Best Seller',
    style: 'bg-[#14532d]/90 text-white border-emerald-400/30',
    dot: 'bg-[#fbbf24]',
  },
};

function getInitialFeaturedDishes(): MenuItemData[] {
  return FEATURED_DISH_IDS
    .map((id) => INITIAL_MENU_ITEMS.find((item) => item._id === id))
    .filter((item): item is MenuItemData => Boolean(item));
}

function ForbiddenQueryNotifier() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (notifiedRef.current) return;
    if (searchParams.get('error') === 'forbidden') {
      notifiedRef.current = true;
      showToast('Bạn không có quyền truy cập trang quản trị vừa rồi.', 'error');
      router.replace('/', { scroll: false });
    }
  }, [searchParams, router, showToast]);

  return null;
}

export default function Home() {
  const router = useRouter();
  const { addToCart, hasActiveBooking, bookingInfo, isLoaded } = useCart();
  const { showToast } = useToast();
  const [featuredDishes, setFeaturedDishes] = useState<MenuItemData[]>(getInitialFeaturedDishes);

  // Đồng bộ trạng thái còn món / hết món mới nhất từ MongoDB nếu có
  useEffect(() => {
    let isCancelled = false;

    const syncFeaturedMenu = async () => {
      try {
        const res = await fetch('/api/menu', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as { success?: boolean; data?: MenuItemData[] };
        if (isCancelled || !json.success || !Array.isArray(json.data)) return;

        const synced = FEATURED_DISH_IDS
          .map(
            (id) =>
              json.data?.find((item) => item._id === id) ??
              INITIAL_MENU_ITEMS.find((item) => item._id === id)
          )
          .filter((item): item is MenuItemData => Boolean(item));

        if (synced.length > 0) {
          setFeaturedDishes(synced);
        }
      } catch {
        // Giữ nguyên dữ liệu chuẩn từ INITIAL_MENU_ITEMS nếu mạng tạm gián đoạn
      }
    };

    void syncFeaturedMenu();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleFeaturedAction = (dish: MenuItemData) => {
    if (dish.isAvailable === false) {
      showToast(`Món "${dish.name}" hiện đang tạm hết.`, 'warning');
      return;
    }

    if (dish.isPreOrderOnly && !hasActiveBooking) {
      showToast(
        'Món đặc biệt chỉ phục vụ khi đặt bàn trước. Vui lòng chọn bàn trước khi thêm vào thực đơn!',
        'info'
      );
      router.push('/booking');
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
    showToast(`Đã thêm "${dish.name}" vào giỏ hàng!`, 'success');
  };

  return (
    <main className="flex flex-col min-h-screen bg-[#faf8f5] text-[#1c1917]">
      <Suspense fallback={null}>
        <ForbiddenQueryNotifier />
      </Suspense>

      {/* 1. KHU VỰC BANNER */}
      <section className="relative flex flex-col items-center justify-center min-h-[76vh] overflow-hidden bg-[#0a1f14]">
        <Image
          src="/foods/hero-bg1.jpg"
          alt="Không gian ẩm thực đương đại SmaRes Gastronomy"
          fill
          preload
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Lớp phủ đa tầng: Dark vignette kết hợp ánh ngọc bích sẫm của Heritage Jade */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-[#0a1f14]/90 backdrop-blur-[1px]" />

        {/* Nội dung Banner */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto py-16">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#14532d]/60 border border-[#fbbf24]/40 text-[#fde68a] text-xs md:text-sm font-semibold tracking-widest mb-6 uppercase backdrop-blur-md shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] animate-pulse" />
            ẨM THỰC VIỆT NAM TINH TẾ &amp; THÔNG MINH
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-6 tracking-tight leading-[1.15] drop-shadow-md">
            Chào mừng đến với <span className="text-[#fbbf24] italic font-normal">SmaRes!</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-[#e7e5e4] mb-10 max-w-2xl mx-auto font-light leading-relaxed drop-shadow">
            Trải nghiệm ẩm thực Việt Nam hiện đại — Đặt bàn trực tuyến nhanh chóng, thưởng thức món ngon trọn vị hôm nay.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full max-w-md mx-auto sm:max-w-none">
            {/* Primary CTA: Heritage Jade with subtle amber touch */}
            <Link
              href="/booking"
              className="group relative inline-flex items-center justify-center gap-2 bg-[#14532d] hover:bg-[#15803d] text-white px-8 py-3.5 rounded-full font-semibold transition-all duration-300 shadow-[0_8px_24px_-4px_rgba(20,83,45,0.45)] hover:shadow-[0_12px_28px_-4px_rgba(20,83,45,0.6)] hover:-translate-y-0.5 active:scale-[0.98] w-full sm:w-auto border border-[#22c55e]/30"
            >
              <span>Đặt bàn ngay</span>
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>

            {/* Secondary CTA: Imperial Amber */}
            <Link
              href="/menu"
              className="inline-flex items-center justify-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white px-8 py-3.5 rounded-full font-semibold transition-all duration-300 shadow-[0_8px_20px_-4px_rgba(217,119,6,0.35)] hover:shadow-[0_12px_24px_-4px_rgba(217,119,6,0.5)] hover:-translate-y-0.5 active:scale-[0.98] w-full sm:w-auto border border-[#fbbf24]/30"
            >
              <svg className="w-4 h-4 text-[#fef3c7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" />
                <path d="M19 12a7 7 0 0 0-14 0" />
              </svg>
              <span>Khám phá thực đơn</span>
            </Link>
          </div>
        </div>

        {/* Ambient bottom curve separator */}
        <div className="absolute -bottom-1 left-0 right-0 h-8 bg-gradient-to-t from-[#faf8f5] to-transparent" />
      </section>

      {/* 2. KHU VỰC MÓN ĂN ĐẶC TRƯNG */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 w-full relative z-20 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto text-center">
          {/* Eyebrow & Section Heading */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fef3c7] border border-[#fde68a] text-[#b45309] text-xs font-bold uppercase tracking-widest mb-3">
            <svg className="w-3.5 h-3.5 text-[#d97706]" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Trải nghiệm đỉnh cao
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#1c1917] mb-4 tracking-tight">
            Món Ăn Đặc Trưng Tại SmaRes
          </h2>
          <p className="text-[#57534e] max-w-xl mx-auto mb-6 text-sm sm:text-base font-normal">
            Tinh hoa ẩm thực ba miền được chăm chút kỹ lưỡng bởi các bếp trưởng trứ danh với nguyên liệu thượng hạng.
          </p>

          {isLoaded && hasActiveBooking && bookingInfo?.tableNumber && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] text-[#14532d] text-xs sm:text-sm font-semibold mb-10">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
              <span>
                Đang chọn thực đơn cho bàn <strong>{bookingInfo.tableNumber}</strong> — có thể đặt trước các món Signature
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left mt-8">
            {featuredDishes.map((dish) => {
              const badge = FEATURED_BADGES[dish._id] ?? {
                label: 'Signature',
                style: 'bg-[#14532d]/90 text-white border-emerald-400/30',
                dot: 'bg-[#fbbf24]',
              };
              const isSoldOut = dish.isAvailable === false;
              const needsBookingFirst = Boolean(dish.isPreOrderOnly && (!isLoaded || !hasActiveBooking));

              return (
                <div
                  key={dish._id}
                  className="group relative bg-white border border-[#ebe7df] rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] hover:shadow-[0_16px_32px_-4px_rgba(28,25,23,0.12)] transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                      <Image
                        src={dish.imageUrl}
                        alt={dish.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className={`object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${
                          isSoldOut ? 'grayscale opacity-70' : ''
                        }`}
                      />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border shadow-sm flex items-center gap-1 ${badge.style}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                        {dish.isPreOrderOnly && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#fffbeb]/95 text-[#92400e] border border-[#fde68a] backdrop-blur-sm shadow-sm">
                            Đặt trước
                          </span>
                        )}
                      </div>
                      {isSoldOut && (
                        <div className="absolute inset-0 bg-stone-900/45 backdrop-blur-[1px] flex items-center justify-center">
                          <span className="px-3.5 py-1.5 rounded-full bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5] text-xs font-bold shadow-md">
                            Tạm hết món
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-baseline mb-3 gap-2">
                        <h3 className="text-xl font-serif font-bold text-[#1c1917] group-hover:text-[#14532d] transition-colors leading-snug">
                          {dish.name}
                        </h3>
                        <span className="text-[#d97706] font-bold text-lg whitespace-nowrap font-serif">
                          {formatMoney(dish.price)}
                        </span>
                      </div>
                      <p className="text-[#57534e] text-sm leading-relaxed mb-4 line-clamp-2">
                        {dish.description}
                      </p>
                    </div>
                  </div>
                  <div className="px-6 pb-6 pt-0">
                    <button
                      type="button"
                      disabled={isSoldOut}
                      onClick={() => handleFeaturedAction(dish)}
                      className={`text-sm font-semibold flex items-center justify-between transition-colors pt-3.5 border-t border-[#ebe7df] w-full group/btn ${
                        isSoldOut
                          ? 'text-stone-400 cursor-not-allowed'
                          : needsBookingFirst
                            ? 'text-[#b45309] hover:text-[#d97706] cursor-pointer'
                            : 'text-[#14532d] hover:text-[#15803d] cursor-pointer'
                      }`}
                    >
                      <span>
                        {isSoldOut
                          ? 'Tạm hết món'
                          : needsBookingFirst
                            ? 'Đặt bàn trước để chọn món'
                            : 'Thêm vào giỏ hàng'}
                      </span>
                      <svg className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12">
            <Link
              href="/menu"
              className="interactive-btn inline-flex items-center gap-2 px-7 py-3 rounded-full border border-[#d6d0c4] bg-white hover:bg-[#f5f2eb] text-[#14532d] text-sm font-semibold shadow-xs"
            >
              <span>Xem toàn bộ thực đơn SmaRes</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
