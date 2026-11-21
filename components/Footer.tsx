import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="print:hidden bg-[#0a1f14] text-[#d6d0c4] border-t border-[#14532d]/40 pt-16 pb-12 px-6 sm:px-10 lg:px-16 transition-colors">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-[#14532d]/30 pb-12">
        {/* Cột 1: Giới thiệu & Thương hiệu */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#14532d] border border-[#d97706]/40 flex items-center justify-center text-white font-serif font-bold text-base shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
              S
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-2xl font-bold text-white tracking-tight">
                SmaRes
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] font-semibold text-[#fbbf24] -mt-1">
                Gastronomy
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-[#a8a29e] max-w-sm">
            Định nghĩa lại ẩm thực Việt Nam đương đại bằng sự chuẩn mực trong từng nguyên liệu tươi ngon và công nghệ đặt bàn thông minh không gián đoạn.
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#14532d]/40 text-[#86efac] border border-[#14532d]">
              <span>🌿</span>
              <span>100% Nguyên liệu thảo mộc bản địa</span>
            </span>
          </div>
        </div>

        {/* Cột 2: Giờ hoạt động */}
        <div className="space-y-4">
          <h3 className="font-serif text-white font-bold text-base tracking-wide flex items-center gap-2">
            <span className="text-[#fbbf24]">⏱️</span>
            <span>Khung Giờ Phục Vụ</span>
          </h3>
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="p-3 rounded-xl bg-[#0f2e1d]/50 border border-[#14532d]/30 space-y-1">
              <p className="font-semibold text-white">Thứ Hai — Thứ Sáu</p>
              <p className="text-[#fbbf24] font-medium tracking-wide">10:00 AM — 22:30 PM</p>
            </div>
            <div className="p-3 rounded-xl bg-[#0f2e1d]/50 border border-[#14532d]/30 space-y-1">
              <p className="font-semibold text-white">Thứ Bảy — Chủ Nhật & Lễ</p>
              <p className="text-[#fbbf24] font-medium tracking-wide">09:00 AM — 23:00 PM</p>
            </div>
          </div>
        </div>

        {/* Cột 3: Liên hệ */}
        <div className="space-y-4">
          <h3 className="font-serif text-white font-bold text-base tracking-wide flex items-center gap-2">
            <span className="text-[#fbbf24]">📍</span>
            <span>Địa Chỉ & Liên Hệ</span>
          </h3>
          <ul className="text-xs sm:text-sm space-y-3 text-[#a8a29e]">
            <li className="flex items-start gap-2.5">
              {/* SVG Map Pin */}
              <svg className="w-4 h-4 text-[#fbbf24] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>TP. Đà Nẵng</span>
            </li>
            <li className="flex items-center gap-2.5">
              {/* SVG Phone */}
              <svg className="w-4 h-4 text-[#fbbf24] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>Hotline đặt tiệc: <strong className="text-white font-semibold">**** ****</strong></span>
            </li>
            <li className="flex items-center gap-2.5">
              {/* SVG Mail */}
              <svg className="w-4 h-4 text-[#fbbf24] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Email: <strong className="text-white font-semibold">smares@gmail.com</strong></span>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Bản quyền & Điều khoản */}
      <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-[#78716c] gap-4">
        <p>© 2026 SmaRes Gastronomy Restaurant. Mọi quyền được bảo lưu.</p>
        <div className="flex space-x-6">
          <Link href="/about" className="hover:text-white transition-colors">Về chúng tôi</Link>
          <Link href="/menu" className="hover:text-white transition-colors">Thực đơn</Link>
          <Link href="/about#privacy" className="hover:text-white transition-colors">Chính sách bảo mật</Link>
        </div>
      </div>
    </footer>
  );
}
