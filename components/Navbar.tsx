"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/app/context/CartContext';

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const router = useRouter();
  const { totalItems, hasActiveBooking } = useCart();

  // Tự động kiểm tra trạng thái đăng nhập khi load trang hoặc khi có sự kiện đăng nhập/đăng xuất
  useEffect(() => {
    const checkSession = () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
          const userData = JSON.parse(storedUser);
          setUserName(userData.name || 'Người dùng');
          setUserRole(userData.role || '');
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
          setUserName('');
          setUserRole('');
        }
      } catch {
        setIsLoggedIn(false);
        setUserName('');
        setUserRole('');
      }
    };

    checkSession();

    // Lắng nghe sự kiện để đồng bộ tức thì giữa các component
    window.addEventListener('storage', checkSession);
    window.addEventListener('auth-change', checkSession);

    return () => {
      window.removeEventListener('storage', checkSession);
      window.removeEventListener('auth-change', checkSession);
    };
  }, []);

  // Xử lý sự kiện Đăng xuất
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Lỗi khi gọi API logout:', err);
    }

    // Xóa dữ liệu trong localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserName('');
    setUserRole('');

    // Phát sự kiện thông báo trạng thái auth đã thay đổi
    window.dispatchEvent(new Event('auth-change'));
    router.push('/login');
  };

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 lg:px-12 py-3.5 bg-[#faf8f5]/90 backdrop-blur-md border-b border-[#ebe7df] shadow-[0_2px_12px_-2px_rgba(28,25,23,0.05)] transition-all">
      {/* Cụm Logo bên trái */}
      <Link href="/" className="group flex items-center space-x-2.5 shrink-0 cursor-pointer">
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

      {/* Cụm Menu ở giữa */}
      <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-[#57534e] shrink-0">
        <Link href="/" className="nav-link-subtle hover:text-[#14532d] py-1 whitespace-nowrap">
          Trang chủ
        </Link>
        <Link href="/menu" className="nav-link-subtle hover:text-[#14532d] py-1 whitespace-nowrap">
          Thực đơn
        </Link>
        <Link href="/table-menu" className="nav-link-subtle hover:text-[#14532d] py-1 whitespace-nowrap">
          Menu tại bàn
        </Link>
        <Link href="/about" className="nav-link-subtle hover:text-[#14532d] py-1 whitespace-nowrap">
          Về chúng tôi
        </Link>
        <Link href="/contact" className="nav-link-subtle hover:text-[#14532d] py-1 whitespace-nowrap">
          Liên hệ
        </Link>
      </div>

      {/* Cụm nút bấm bên phải */}
      <div className="flex items-center space-x-3 shrink-0">
        {isLoggedIn ? (
          <>
            <span className="text-xs sm:text-sm font-medium text-[#57534e] hidden sm:flex items-center whitespace-nowrap">
              Chào, <strong className="text-[#1c1917] ml-1 font-semibold">{userName}</strong>
              {userRole === 'admin' && (
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

            {(userRole === 'admin' || userRole === 'staff') && (
              <div className="flex items-center space-x-2">
                <Link 
                  href="/kds" 
                  className="interactive-btn text-xs font-bold bg-[#d97706] text-white hover:bg-[#b45309] px-3 py-1.5 rounded-full shadow-xs whitespace-nowrap flex items-center gap-1.5"
                  title="Màn hình Bếp KDS (Kitchen Display System)"
                >
                  {/* SVG Lightning */}
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                  <span>Bếp KDS</span>
                </Link>

                <Link 
                  href="/staff/orders" 
                  className="interactive-btn text-xs font-semibold bg-[#14532d] text-white hover:bg-[#0f3d21] px-3 py-1.5 rounded-full shadow-xs whitespace-nowrap flex items-center gap-1.5"
                  title="Trang quản lý đơn hàng dành cho Nhân viên"
                >
                  {/* SVG Clipboard */}
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <span>Đơn Staff</span>
                </Link>
              </div>
            )}

            <Link 
              href="/history" 
              className="interactive-btn text-xs sm:text-sm font-semibold text-[#14532d] hover:text-[#0f3d21] px-3 py-1.5 rounded-full hover:bg-[#f0fdf4] whitespace-nowrap"
            >
              Lịch sử
            </Link>

            <button 
              onClick={handleLogout} 
              className="interactive-btn text-xs sm:text-sm font-medium text-rose-600 hover:text-rose-700 px-3 py-1.5 border border-rose-200 rounded-full bg-rose-50/70 hover:bg-rose-100 whitespace-nowrap"
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <Link 
            href="/login" 
            className="interactive-btn text-xs sm:text-sm font-semibold text-[#57534e] hover:text-[#1c1917] px-4 py-2 border border-[#d6d0c4] rounded-full hover:bg-white whitespace-nowrap"
          >
            Đăng nhập
          </Link>
        )}

        {/* Nút Giỏ hàng với SVG Icon Vector (Không dùng Emoji) */}
        {totalItems > 0 && (
          <Link
            href={hasActiveBooking ? '/booking/menu' : '/cart'}
            className="interactive-btn relative p-2.5 text-[#57534e] hover:text-[#14532d] hover:bg-white border border-[#ebe7df] rounded-full transition-all shadow-xs flex items-center justify-center"
            title="Thực đơn đã chọn"
          >
            {/* SVG Shopping Bag */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="absolute -top-1 -right-1 bg-[#14532d] text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs border border-white">
              {totalItems}
            </span>
          </Link>
        )}

        {/* Nút Đặt bàn chính (Heritage Jade + Warm Glow) */}
        <Link 
          href="/booking" 
          className="interactive-btn bg-[#14532d] hover:bg-[#0f3d21] text-white text-xs sm:text-sm font-semibold px-5 sm:px-6 py-2.5 rounded-full shadow-[0_4px_16px_rgba(20,83,45,0.22)] whitespace-nowrap"
        >
          Đặt bàn ngay
        </Link>
      </div>
    </nav>
  );
}
