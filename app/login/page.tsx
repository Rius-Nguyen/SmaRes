"use client";

import Link from 'next/link';
import { useState } from 'react';


export default function LoginPage() {
  // Biến trạng thái quản lý ẩn/hiện mật khẩu
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="min-h-screen flex items-center justify-center bg-cover bg-center relative py-12" style={{ backgroundImage: "url('/hero-bg.jpg')" }}>
      {/* Lớp phủ đen mờ */}
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Form Đăng nhập */}
      <div className="relative z-10 bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 m-4">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-green-700 rounded-full flex items-center justify-center text-white text-xl font-bold mb-4">S</div>
          <h2 className="text-2xl font-bold text-gray-900">Đăng Nhập</h2>
          <p className="text-gray-500 text-sm mt-1">Chào mừng bạn quay lại với SmaRes</p>
        </div>

        {/* Tab chuyển đổi */}
        <div className="flex bg-gray-100 rounded-full p-1 mb-6">
          <div className="w-1/2 text-center py-2 bg-white rounded-full text-sm font-bold shadow-sm text-gray-900">
            Đăng nhập
          </div>
          <Link href="/register" className="w-1/2 text-center py-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
            Đăng ký
          </Link>
        </div>

        {/* Form nhập liệu */}
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-black-700 mb-1">Tài khoản Email *</label>
            <input type="email" placeholder="yourname@gmail.com" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700 transition-all" />
          </div>
          
          {/* Nhập Mật khẩu*/}
          <div>
            <label className="block text-sm font-semibold text-black-700 mb-1">Mật khẩu *</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700 transition-all pr-12" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-700 transition-colors"
              >
                {showPassword ? (
                  // Icon xem mật khẩu
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  // Icon ẩn mật khẩu
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-green-700 border-gray-300 rounded focus:ring-green-700" />
              <span className="text-sm text-gray-500">Ghi nhớ đăng nhập</span>
            </label>
            <a href="#" className="text-sm text-green-700 font-semibold hover:underline">Quên mật khẩu?</a>
          </div>

          <button type="button" className="w-full bg-green-800 text-white font-bold py-3 rounded-lg hover:bg-green-900 transition-colors mt-2">
            Đăng Nhập
          </button>
        </form>

        {/* Đăng nhập bằng Mạng xã hội */}
        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-400">Hoặc đăng nhập bằng</span></div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center space-x-2 border border-gray-300 rounded-lg py-2.5 hover:bg-gray-50 transition-colors">
              <span className="text-red-500 font-bold">G</span>
              <span className="text-sm font-semibold text-gray-700">Google</span>
            </button>
            <button className="flex items-center justify-center space-x-2 border border-gray-300 rounded-lg py-2.5 hover:bg-gray-50 transition-colors">
              <span className="text-blue-600 font-bold">f</span>
              <span className="text-sm font-semibold text-gray-700">Facebook</span>
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}