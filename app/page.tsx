"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  // Tạm thời khai báo mặc định là false (chưa đăng nhập)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // State báo hiệu Client đã tải xong để tránh lỗi Hydration
  const [isMounted, setIsMounted] = useState(false);

  // Dùng useEffect để đồng bộ giao diện sau khi tải
  useEffect(() => {
    setIsMounted(true);
    // Code kiểm tra đăng nhập thực tế sẽ nằm ở đây
  }, []);

  return (
    <main className="flex flex-col min-h-screen bg-[#faf8f5] text-[#1c1917]">

      {/* 1. KHU VỰC BANNER */}
      <section
        className="relative flex flex-col items-center justify-center min-h-[76vh] bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: "url('/foods/hero-bg1.jpg')" }}
      >
        {/* Lớp phủ đa tầng: Dark vignette kết hợp ánh ngọc bích sẫm của Heritage Jade */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-[#0a1f14]/90 backdrop-blur-[1px]"></div>

        {/* Nội dung Banner */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#14532d]/60 border border-[#fbbf24]/40 text-[#fde68a] text-xs md:text-sm font-semibold tracking-widest mb-6 uppercase backdrop-blur-md shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] animate-pulse"></span>
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
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </Link>

            {/* Secondary CTA: Imperial Amber */}
            <Link 
              href="/menu" 
              className="inline-flex items-center justify-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white px-8 py-3.5 rounded-full font-semibold transition-all duration-300 shadow-[0_8px_20px_-4px_rgba(217,119,6,0.35)] hover:shadow-[0_12px_24px_-4px_rgba(217,119,6,0.5)] hover:-translate-y-0.5 active:scale-[0.98] w-full sm:w-auto border border-[#fbbf24]/30"
            >
              <svg className="w-4 h-4 text-[#fef3c7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"></path>
                <path d="M19 12a7 7 0 0 0-14 0"></path>
              </svg>
              <span>Khám phá thực đơn</span>
            </Link>
          </div>
        </div>

        {/* Ambient bottom curve separator */}
        <div className="absolute -bottom-1 left-0 right-0 h-8 bg-gradient-to-t from-[#faf8f5] to-transparent"></div>
      </section>

      {/* 2. KHU VỰC MÓN ĂN ĐẶC TRƯNG */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 w-full relative z-20 bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto text-center">
          {/* Eyebrow & Section Heading */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fef3c7] border border-[#fde68a] text-[#b45309] text-xs font-bold uppercase tracking-widest mb-3">
            <svg className="w-3.5 h-3.5 text-[#d97706]" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            Trải nghiệm đỉnh cao
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#1c1917] mb-4 tracking-tight">
            Món Ăn Đặc Trưng Tại SmaRes
          </h2>
          <p className="text-stone-600 max-w-xl mx-auto mb-14 text-sm sm:text-base font-normal">
            Tinh hoa ẩm thực ba miền được chăm chút kỹ lưỡng bởi các bếp trưởng trứ danh với nguyên liệu thượng hạng.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {/* Món 1: Phở Bò */}
            <div className="group relative bg-white border border-[#ebe7df] rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] hover:shadow-[0_16px_32px_-4px_rgba(28,25,23,0.12)] transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
              <div>
                <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                  <img 
                    src="/foods/pho_bo.jpg" 
                    alt="Phở Bò" 
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" 
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#14532d]/90 text-white backdrop-blur-sm border border-emerald-400/30 shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]"></span>
                      Signature
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-baseline mb-3 gap-2">
                    <h3 className="text-xl font-serif font-bold text-[#1c1917] group-hover:text-[#14532d] transition-colors">
                      Phở Bò Wagyu Cao Cấp
                    </h3>
                    <span className="text-[#d97706] font-bold text-lg whitespace-nowrap font-serif">
                      245.000đ
                    </span>
                  </div>
                  <p className="text-stone-600 text-sm leading-relaxed mb-4 line-clamp-2">
                    Sự kết hợp tinh túy giữa nước dùng truyền thống ninh 24 giờ cùng thịt bò Wagyu A5 mềm tan khó cưỡng.
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-0">
                {isMounted && isLoggedIn && (
                  <button className="text-sm font-semibold text-[#14532d] hover:text-[#15803d] flex items-center gap-2 transition-colors pt-3 border-t border-stone-100 w-full group/btn">
                    <span>Thêm vào giỏ hàng</span>
                    <svg className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Món 2: Chả Giò Cua Hoàng Đế */}
            <div className="group relative bg-white border border-[#ebe7df] rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] hover:shadow-[0_16px_32px_-4px_rgba(28,25,23,0.12)] transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
              <div>
                <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                  <img 
                    src="/foods/cha_gio1.jpg" 
                    alt="Chả Giò" 
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" 
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#b45309]/90 text-white backdrop-blur-sm border border-amber-400/30 shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                      Món Mới
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-baseline mb-3 gap-2">
                    <h3 className="text-xl font-serif font-bold text-[#1c1917] group-hover:text-[#14532d] transition-colors">
                      Chả Giò Cua Hoàng Đế
                    </h3>
                    <span className="text-[#d97706] font-bold text-lg whitespace-nowrap font-serif">
                      185.000đ
                    </span>
                  </div>
                  <p className="text-stone-600 text-sm leading-relaxed mb-4 line-clamp-2">
                    Bánh tráng phơi sương giòn rụm bọc nhân cua hoàng đế và măng tây tươi, ăn kèm nước mắm chua ngọt đặc chế.
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-0">
                {isMounted && isLoggedIn && (
                  <button className="text-sm font-semibold text-[#14532d] hover:text-[#15803d] flex items-center gap-2 transition-colors pt-3 border-t border-stone-100 w-full group/btn">
                    <span>Thêm vào giỏ hàng</span>
                    <svg className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Món 3: Vịt Quay Sốt Mật Ong Rừng */}
            <div className="group relative bg-white border border-[#ebe7df] rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] hover:shadow-[0_16px_32px_-4px_rgba(28,25,23,0.12)] transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
              <div>
                <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                  <img 
                    src="/foods/vit_quay.jpg" 
                    alt="Vịt Quay" 
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" 
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#14532d]/90 text-white backdrop-blur-sm border border-emerald-400/30 shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]"></span>
                      Best Seller
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-baseline mb-3 gap-2">
                    <h3 className="text-xl font-serif font-bold text-[#1c1917] group-hover:text-[#14532d] transition-colors">
                      Vịt Quay Sốt Mật Ong Rừng
                    </h3>
                    <span className="text-[#d97706] font-bold text-lg whitespace-nowrap font-serif">
                      320.000đ
                    </span>
                  </div>
                  <p className="text-stone-600 text-sm leading-relaxed mb-4 line-clamp-2">
                    Thịt vịt mềm mọng, lớp da giòn bóng bẩy tẩm ướp mật ong rừng Tây Bắc cùng thảo mộc thơm lừng.
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-0">
                {isMounted && isLoggedIn && (
                  <button className="text-sm font-semibold text-[#14532d] hover:text-[#15803d] flex items-center gap-2 transition-colors pt-3 border-t border-stone-100 w-full group/btn">
                    <span>Thêm vào giỏ hàng</span>
                    <svg className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}