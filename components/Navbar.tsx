"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const router = useRouter();

  // Tự động kiểm tra trạng thái đăng nhập khi load trang hoặc khi có sự kiện đăng nhập/đăng xuất
  useEffect(() => {
    const checkSession = () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
          const userData = JSON.parse(storedUser);
          setUserName(userData.name || 'Người dùng');
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
          setUserName('');
        }
      } catch {
        setIsLoggedIn(false);
        setUserName('');
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

    // Phát sự kiện thông báo trạng thái auth đã thay đổi
    window.dispatchEvent(new Event('auth-change'));
    router.push('/login'); // Tự động đẩy về trang đăng nhập
  };

  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-white sticky top-0 z-50 gap-4 overflow-x-auto">
      {/* Cụm Logo bên trái */}
      <div className="flex items-center space-x-2 shrink-0">
        <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white font-bold">
          S
        </div>
        <Link href="/" className="text-2xl font-bold text-green-800 tracking-tight whitespace-nowrap">SmaRes</Link>
      </div>

      {/* Cụm Menu ở giữa */}
      <div className="hidden md:flex space-x-8 text-sm font-semibold text-gray-700 shrink-0">
        <Link href="/" className="hover:text-green-700 transition-colors whitespace-nowrap">Trang chủ</Link>
        <Link href="/menu" className="hover:text-green-700 transition-colors whitespace-nowrap">Thực đơn</Link>
        <Link href="/about" className="hover:text-green-700 transition-colors whitespace-nowrap">Về chúng tôi</Link>
        <Link href="/contact" className="hover:text-green-700 transition-colors whitespace-nowrap">Liên hệ</Link>
      </div>

      {/* Cụm nút bấm bên phải */}
      <div className="flex items-center space-x-4 shrink-0">
        {isLoggedIn ? (
          // Hiển thị khi ĐÃ đăng nhập
          <>
            <span className="text-sm font-semibold text-gray-700 hidden sm:block whitespace-nowrap">Chào, {userName}</span>
            <Link href="/history" className="text-sm font-semibold text-green-700 hover:underline whitespace-nowrap">
              Lịch sử
            </Link>
            <button 
              onClick={handleLogout} 
              className="text-sm font-semibold text-red-500 hover:text-red-700 transition-colors px-4 py-2 border border-red-200 rounded-full bg-red-50 whitespace-nowrap"
            >
              Đăng xuất
            </button>
          </>
        ) : (
          // Hiển thị khi CHƯA đăng nhập
          <Link href="/login" className="text-sm font-semibold px-4 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors whitespace-nowrap">
            Đăng nhập
          </Link>
        )}

        {/* Nút Đặt bàn (luôn hiển thị) */}
        <Link href="/booking" className="bg-green-800 text-white text-sm font-semibold px-6 py-2 rounded-full hover:bg-green-900 transition-colors whitespace-nowrap">
          Đặt bàn
        </Link>
      </div>
    </nav>
  );
}