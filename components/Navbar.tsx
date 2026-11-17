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
    router.push('/login'); // Tự động đẩy về trang đăng nhập
  };

  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-white/95 backdrop-blur-sm sticky top-0 z-50 gap-4 overflow-x-auto border-b border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      {/* Cụm Logo bên trái */}
      <Link href="/" className="group flex items-center space-x-2 shrink-0 cursor-pointer">
        <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white font-bold transition-transform duration-300 group-hover:scale-105 group-hover:bg-green-800 shadow-sm">
          S
        </div>
        <span className="text-2xl font-bold text-green-800 tracking-tight whitespace-nowrap transition-colors group-hover:text-green-900">SmaRes</span>
      </Link>

      {/* Cụm Menu ở giữa */}
      <div className="hidden md:flex space-x-8 text-base font-semibold text-gray-700 shrink-0">
        <Link href="/" className="nav-link-subtle hover:text-green-700 py-1 whitespace-nowrap">Trang chủ</Link>
        <Link href="/menu" className="nav-link-subtle hover:text-green-700 py-1 whitespace-nowrap">Thực đơn</Link>
        <Link href="/about" className="nav-link-subtle hover:text-green-700 py-1 whitespace-nowrap">Về chúng tôi</Link>
        <Link href="/contact" className="nav-link-subtle hover:text-green-700 py-1 whitespace-nowrap">Liên hệ</Link>
      </div>

      {/* Cụm nút bấm bên phải */}
      <div className="flex items-center space-x-4 shrink-0">
        {isLoggedIn ? (
          // Hiển thị khi ĐÃ đăng nhập
          <>
            <span className="text-sm md:text-base font-semibold text-gray-700 hidden sm:flex items-center whitespace-nowrap">
              Chào, {userName}
              {userRole === 'admin' && (
                <span className="ml-2 px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-300">Admin</span>
              )}
              {userRole === 'staff' && (
                <span className="ml-2 px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">Staff</span>
              )}
            </span>
            {(userRole === 'admin' || userRole === 'staff') && (
              <>
                <Link 
                  href="/kds" 
                  className="interactive-btn text-xs sm:text-sm font-semibold bg-amber-500 text-stone-950 hover:bg-amber-600 px-3.5 py-1.5 rounded-full shadow-sm whitespace-nowrap flex items-center gap-1.5"
                  title="Màn hình Bếp KDS (Kitchen Display System)"
                >
                  <span>⚡</span> Bếp KDS
                </Link>
                <Link 
                  href="/staff/orders" 
                  className="interactive-btn text-xs sm:text-sm font-semibold bg-emerald-800 text-white hover:bg-emerald-900 px-3.5 py-1.5 rounded-full shadow-sm whitespace-nowrap flex items-center gap-1.5"
                  title="Trang quản lý đơn hàng dành cho Nhân viên"
                >
                  <span>📋</span> Đơn Staff
                </Link>
              </>
            )}
            <Link href="/history" className="interactive-btn text-sm md:text-base font-semibold text-green-700 hover:text-green-800 px-3.5 py-1.5 rounded-full hover:bg-green-50 whitespace-nowrap">
              Lịch sử
            </Link>
            <button 
              onClick={handleLogout} 
              className="interactive-btn text-sm md:text-base font-semibold text-red-500 hover:text-red-700 px-4 py-2 border border-red-200 rounded-full bg-red-50 hover:bg-red-100 whitespace-nowrap"
            >
              Đăng xuất
            </button>
          </>
        ) : (
          // Hiển thị khi CHƯA đăng nhập
          <Link href="/login" className="interactive-btn text-sm md:text-base font-semibold px-4 py-2 border border-gray-300 rounded-full hover:border-gray-400 hover:bg-gray-50 whitespace-nowrap">
            Đăng nhập
          </Link>
        )}

        {/* Nút Giỏ hàng nếu có món */}
        {totalItems > 0 && (
          <Link
            href={hasActiveBooking ? '/booking/menu' : '/booking'}
            className="interactive-btn relative p-2 text-gray-700 hover:text-green-800 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
            title="Thực đơn đã chọn"
          >
            <span className="text-xl">🛒</span>
            <span className="absolute -top-1 -right-1 bg-green-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
              {totalItems}
            </span>
          </Link>
        )}

        {/* Nút Đặt bàn (luôn hiển thị) */}
        <Link href="/booking" className="interactive-btn bg-green-800 text-white text-sm font-semibold px-6 py-2 rounded-full hover:bg-green-900 shadow-sm whitespace-nowrap">
          Đặt bàn
        </Link>
      </div>
    </nav>
  );
}