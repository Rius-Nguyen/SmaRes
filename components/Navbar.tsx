"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/app/context/CartContext';
import { useAuthSession } from '@/app/lib/useAuthSession';

const NAV_LINKS = [
  { href: '/', label: 'Trang chủ' },
  { href: '/menu', label: 'Thực đơn' },
  { href: '/about', label: 'Về chúng tôi' },
] as const;

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { totalItems, hasActiveBooking } = useCart();
  const {
    isLoggedIn,
    userName,
    userRole,
    isAdmin,
    isStaffOrAdmin,
    clearClientSession,
  } = useAuthSession();

  // Đóng menu mobile khi nhấn Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Xử lý sự kiện Đăng xuất
  const handleLogout = async () => {
    setMobileMenuOpen(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Lỗi khi gọi API logout:', err);
    }

    clearClientSession();
    router.push('/login');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const cartHref = hasActiveBooking && !isAdmin ? '/booking/menu' : '/cart';

  return (
    <>
      <header className="print:hidden sticky top-0 z-50 bg-[#faf8f5]/92 backdrop-blur-md border-b border-[#ebe7df] shadow-[0_2px_12px_-2px_rgba(28,25,23,0.05)] transition-all">
        <nav className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3.5 gap-4">
          {/* Cụm Logo bên trái */}
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="group flex items-center space-x-2.5 shrink-0 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-[#14532d] flex items-center justify-center text-white font-serif font-bold text-lg shadow-[0_4px_12px_rgba(20,83,45,0.25)] transition-transform duration-300 group-hover:scale-105 group-hover:bg-[#0f3d21]">
              S
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-2xl font-bold text-[#14532d] tracking-tight whitespace-nowrap transition-colors group-hover:text-[#0f3d21]">
                SmaRes
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-[#d97706] -mt-1 hidden sm:block">
                Gastronomy
              </span>
            </div>
          </Link>

          {/* Cụm Menu ở giữa (Desktop >= lg) */}
          <div className="hidden lg:flex items-center space-x-6 xl:space-x-7 text-sm font-semibold text-[#57534e] shrink-0">
            {NAV_LINKS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link-subtle py-1 whitespace-nowrap ${
                    isActive ? 'text-[#14532d]' : 'hover:text-[#14532d]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Cụm tài khoản & hành động chính bên phải (Desktop >= lg) */}
          <div className="hidden lg:flex items-center space-x-2.5 shrink-0">
            {isLoggedIn ? (
              <>
                <span className="text-xs font-medium text-[#57534e] flex items-center whitespace-nowrap">
                  Chào,
                  <strong
                    className="text-[#1c1917] ml-1 font-semibold max-w-[140px] xl:max-w-[210px] truncate"
                    title={userName}
                  >
                    {userName}
                  </strong>
                  {isAdmin && (
                    <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-[#fef3c7] text-[#92400e] rounded-full border border-[#fde68a]">
                      Admin
                    </span>
                  )}
                  {userRole === 'staff' && (
                    <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-[#dcfce7] text-[#14532d] rounded-full border border-[#bbf7d0]">
                      Staff
                    </span>
                  )}
                </span>

                <Link
                  href="/history"
                  className={`interactive-btn text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                    pathname === '/history'
                      ? 'bg-[#f0fdf4] text-[#0f3d21] border border-[#bbf7d0]'
                      : 'text-[#14532d] hover:text-[#0f3d21] hover:bg-[#f0fdf4]'
                  }`}
                >
                  Lịch sử
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="interactive-btn text-xs font-medium text-rose-600 hover:text-rose-700 px-3 py-1.5 border border-rose-200 rounded-full bg-rose-50/70 hover:bg-rose-100 whitespace-nowrap"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="interactive-btn text-xs sm:text-sm font-semibold text-[#57534e] hover:text-[#1c1917] px-4 py-2 border border-[#d6d0c4] rounded-full hover:bg-white whitespace-nowrap"
              >
                Đăng nhập/Đăng ký
              </Link>
            )}

            {/* Nút Giỏ hàng với SVG Icon Vector */}
            {totalItems > 0 && (
              <Link
                href={cartHref}
                className="interactive-btn relative p-2.5 text-[#57534e] hover:text-[#14532d] hover:bg-white border border-[#ebe7df] rounded-full transition-all shadow-xs flex items-center justify-center"
                title="Thực đơn đã chọn"
                aria-label={`Giỏ hàng có ${totalItems} món`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span className="absolute -top-1 -right-1 bg-[#14532d] text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs border border-white">
                  {totalItems}
                </span>
              </Link>
            )}

            {/* Nút Đặt bàn chính (Heritage Jade + Warm Glow) — ẩn với tài khoản Admin */}
            {!isAdmin && (
              <Link
                href="/booking"
                className="interactive-btn bg-[#14532d] hover:bg-[#0f3d21] text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-full shadow-[0_4px_16px_rgba(20,83,45,0.22)] whitespace-nowrap"
              >
                Đặt bàn ngay
              </Link>
            )}
          </div>

        {/* Cụm nút bấm trên Mobile / Tablet (< lg) */}
        <div className="flex lg:hidden items-center gap-2 shrink-0">
          {totalItems > 0 && (
            <Link
              href={cartHref}
              onClick={closeMobileMenu}
              className="relative p-2 text-[#57534e] hover:text-[#14532d] hover:bg-white border border-[#ebe7df] rounded-full transition-all shadow-xs flex items-center justify-center"
              title="Thực đơn đã chọn"
              aria-label={`Giỏ hàng có ${totalItems} món`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="absolute -top-1 -right-1 bg-[#14532d] text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs border border-white">
                {totalItems}
              </span>
            </Link>
          )}

          {!isAdmin && (
            <Link
              href="/booking"
              onClick={closeMobileMenu}
              className="bg-[#14532d] hover:bg-[#0f3d21] text-white text-xs font-semibold px-3.5 py-2 rounded-full shadow-xs whitespace-nowrap"
            >
              Đặt bàn
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
            className="p-2 rounded-xl border border-[#ebe7df] bg-white text-[#14532d] hover:bg-[#f5f2eb] transition-colors focus:outline-none focus:ring-2 focus:ring-[#14532d]/30"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Collapsible Mobile Menu Drawer (< lg) */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="lg:hidden border-t border-[#ebe7df] bg-[#faf8f5] shadow-[0_12px_32px_-4px_rgba(20,83,45,0.12)] animate-slideDown"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
            {isLoggedIn && (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-[#ebe7df]">
                <div className="text-xs font-medium text-[#57534e]">
                  Xin chào, <strong className="text-[#1c1917] font-semibold">{userName}</strong>
                </div>
                {isAdmin && (
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[#fef3c7] text-[#92400e] rounded-full border border-[#fde68a]">
                    Admin
                  </span>
                )}
                {userRole === 'staff' && (
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[#dcfce7] text-[#14532d] rounded-full border border-[#bbf7d0]">
                    Staff
                  </span>
                )}
              </div>
            )}

            {/* Điều hướng chính */}
            <div className="grid grid-cols-1 gap-1">
              {NAV_LINKS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-[#f0fdf4] text-[#14532d] border border-[#bbf7d0]'
                        : 'text-[#57534e] hover:text-[#14532d] hover:bg-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Khu vực Vận hành Staff / Admin */}
            {isStaffOrAdmin && (
              <div className="pt-3 border-t border-[#ebe7df] space-y-2">
                <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#78716c]">
                  Vận hành Nhà hàng
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {isAdmin && (
                    <>
                      <Link
                        href="/admin/menu"
                        onClick={closeMobileMenu}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-[#fffbeb] text-[#92400e] border border-[#fde68a] hover:bg-[#fef3c7]"
                      >
                        <svg className="w-3.5 h-3.5 text-[#d97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        <span>Quản lý thực đơn</span>
                      </Link>
                      <Link
                        href="/admin/analytics"
                        onClick={closeMobileMenu}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-[#fffbeb] text-[#92400e] border border-[#fde68a] hover:bg-[#fef3c7]"
                      >
                        <svg className="w-3.5 h-3.5 text-[#d97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M9 17V9m4 8V5m4 12v-4" />
                        </svg>
                        <span>Thống kê doanh thu</span>
                      </Link>
                    </>
                  )}
                  <Link
                    href="/kds"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-[#d97706] text-white hover:bg-[#b45309]"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    <span>Bếp KDS</span>
                  </Link>
                  <Link
                    href="/staff/orders"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#14532d] text-white hover:bg-[#0f3d21]"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>Đơn Staff</span>
                  </Link>
                  <Link
                    href="/staff/tables"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#f0fdf4] text-[#14532d] border border-[#bbf7d0] hover:bg-[#dcfce7]"
                  >
                    <svg className="w-3.5 h-3.5 text-[#14532d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm0 9a2 2 0 012-2h4a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3zm10 0a2 2 0 012-2h2a2 2 0 012 2v3a2 2 0 01-2 2h-2a2 2 0 01-2-2v-3z" />
                    </svg>
                    <span>Quản lý bàn</span>
                  </Link>
                  <Link
                    href="/staff/qr"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-white text-[#14532d] border border-[#d6d0c4] hover:bg-[#f5f2eb]"
                  >
                    <svg className="w-3.5 h-3.5 text-[#14532d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="7" height="7" strokeWidth={2} />
                      <rect x="14" y="3" width="7" height="7" strokeWidth={2} />
                      <rect x="3" y="14" width="7" height="7" strokeWidth={2} />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 14h3v3h-3zM17 17h4v4" />
                    </svg>
                    <span>Mã QR bàn</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Tài khoản & Đặt bàn */}
            <div className="pt-3 border-t border-[#ebe7df] flex flex-col gap-2">
              {isLoggedIn ? (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/history"
                    onClick={closeMobileMenu}
                    className="text-center text-xs font-semibold text-[#14532d] bg-[#f0fdf4] border border-[#bbf7d0] px-3 py-2.5 rounded-xl hover:bg-[#dcfce7]"
                  >
                    Lịch sử đặt bàn
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-center text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2.5 rounded-xl hover:bg-rose-100"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="text-center text-sm font-semibold text-[#1c1917] bg-white border border-[#d6d0c4] px-4 py-2.5 rounded-xl hover:bg-[#f5f2eb]"
                >
                  Đăng nhập / Đăng ký
                </Link>
              )}

              {!isAdmin && (
                <Link
                  href="/booking"
                  onClick={closeMobileMenu}
                  className="text-center bg-[#14532d] hover:bg-[#0f3d21] text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-xs"
                >
                  Đặt bàn ngay
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
      </header>

      {/* Thanh điều hướng tầng 2 cho Staff / Admin (Desktop >= lg) — tránh tràn ngang trên màn hình nhỏ */}
      {isStaffOrAdmin && (
        <div className="print:hidden hidden lg:block border-b border-[#ebe7df] bg-[#f5f2eb]/95">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#78716c]">
              <span
                className={`w-2 h-2 rounded-full ${
                  isAdmin ? 'bg-[#d97706]' : 'bg-[#15803d]'
                }`}
              />
              <span>{isAdmin ? 'Quản trị & Vận hành' : 'Vận hành Nhà hàng'}</span>
            </div>

            <nav
              className="flex flex-wrap items-center gap-2"
              aria-label="Điều hướng quản trị và nhân viên"
            >
              {isAdmin && (
                <>
                  <Link
                    href="/admin/menu"
                    className={`interactive-btn text-xs font-bold px-3 py-1.5 rounded-full border shadow-xs whitespace-nowrap flex items-center gap-1.5 ${
                      pathname?.startsWith('/admin/menu')
                        ? 'bg-[#fef3c7] text-[#78350f] border-[#f59e0b] ring-1 ring-[#f59e0b]/30'
                        : 'bg-[#fffbeb] text-[#92400e] border-[#fde68a] hover:bg-[#fef3c7]'
                    }`}
                    title="Quản lý thực đơn và kho món (Admin)"
                  >
                    <svg className="w-3.5 h-3.5 text-[#d97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <span>Quản lý thực đơn</span>
                  </Link>

                  <Link
                    href="/admin/analytics"
                    className={`interactive-btn text-xs font-bold px-3 py-1.5 rounded-full border shadow-xs whitespace-nowrap flex items-center gap-1.5 ${
                      pathname?.startsWith('/admin/analytics')
                        ? 'bg-[#fef3c7] text-[#78350f] border-[#f59e0b] ring-1 ring-[#f59e0b]/30'
                        : 'bg-[#fffbeb] text-[#92400e] border-[#fde68a] hover:bg-[#fef3c7]'
                    }`}
                    title="Thống kê doanh thu và vận hành (Admin)"
                  >
                    <svg className="w-3.5 h-3.5 text-[#d97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M9 17V9m4 8V5m4 12v-4" />
                    </svg>
                    <span>Thống kê</span>
                  </Link>
                </>
              )}

              <Link
                href="/kds"
                className="interactive-btn text-xs font-bold bg-[#d97706] text-white hover:bg-[#b45309] px-3 py-1.5 rounded-full shadow-xs whitespace-nowrap flex items-center gap-1.5"
                title="Màn hình Bếp KDS (Kitchen Display System)"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                <span>Bếp KDS</span>
              </Link>

              <Link
                href="/staff/orders"
                className={`interactive-btn text-xs font-semibold px-3 py-1.5 rounded-full shadow-xs whitespace-nowrap flex items-center gap-1.5 ${
                  pathname?.startsWith('/staff/orders')
                    ? 'bg-[#0f3d21] text-white ring-2 ring-[#14532d]/25'
                    : 'bg-[#14532d] text-white hover:bg-[#0f3d21]'
                }`}
                title="Trang quản lý đơn hàng dành cho Nhân viên"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span>Đơn Staff</span>
              </Link>

              <Link
                href="/staff/tables"
                className={`interactive-btn text-xs font-semibold px-3 py-1.5 rounded-full border shadow-xs whitespace-nowrap flex items-center gap-1.5 ${
                  pathname?.startsWith('/staff/tables')
                    ? 'bg-[#dcfce7] text-[#0f3d21] border-[#15803d] ring-1 ring-[#15803d]/20'
                    : 'bg-[#f0fdf4] text-[#14532d] border-[#bbf7d0] hover:bg-[#dcfce7]'
                }`}
                title="Quản lý check-in và trạng thái bàn ăn"
              >
                <svg className="w-3.5 h-3.5 text-[#14532d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm0 9a2 2 0 012-2h4a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3zm10 0a2 2 0 012-2h2a2 2 0 012 2v3a2 2 0 01-2 2h-2a2 2 0 01-2-2v-3z" />
                </svg>
                <span>Quản lý bàn</span>
              </Link>

              <Link
                href="/staff/qr"
                className={`interactive-btn text-xs font-semibold px-3 py-1.5 rounded-full border shadow-xs whitespace-nowrap flex items-center gap-1.5 ${
                  pathname === '/staff/qr' || pathname === '/qr'
                    ? 'bg-[#f0fdf4] text-[#0f3d21] border-[#14532d] ring-1 ring-[#14532d]/20'
                    : 'bg-white text-[#14532d] border-[#d6d0c4] hover:bg-[#faf8f5]'
                }`}
                title="Quản lý và in mã QR gọi món cho từng bàn"
              >
                <svg className="w-3.5 h-3.5 text-[#14532d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" strokeWidth={2} />
                  <rect x="14" y="3" width="7" height="7" strokeWidth={2} />
                  <rect x="3" y="14" width="7" height="7" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 14h3v3h-3zM17 17h4v4" />
                </svg>
                <span>Mã QR bàn</span>
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
