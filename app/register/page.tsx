"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Thêm thư viện chuyển trang

export default function RegisterPage() {
  // Biến trạng thái ẩn/hiện mật khẩu (em đã làm)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 1. Tạo "giỏ" chứa dữ liệu form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  
  // Trạng thái load khi đang đợi API
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // 2. Hàm cập nhật dữ liệu khi người dùng gõ vào ô input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // 3. Hàm xử lý khi bấm nút Đăng ký
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Ngăn trang web bị reload

    // Kiểm tra mật khẩu xác nhận
    if (formData.password !== formData.confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }

    setIsLoading(true);

    try {
      // Gọi API đăng ký của Vũ
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Đăng ký tài khoản thành công! Xin mời đăng nhập.");
        router.push('/login'); // Chuyển hướng sang trang đăng nhập
      } else {
        alert(`Lỗi: ${data.message || "Không thể đăng ký"}`);
      }
    } catch (error) {
      console.error("Lỗi khi gọi API:", error);
      alert("Đã xảy ra lỗi kết nối với máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-cover bg-center relative py-12" style={{ backgroundImage: "url('/hero-bg.jpg')" }}>
      <div className="absolute inset-0 bg-black/60"></div>

      <div className="relative z-10 bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 m-4">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-green-700 rounded-full flex items-center justify-center text-white text-xl font-bold mb-4">S</div>
          <h2 className="text-2xl font-bold text-gray-900">Đăng Ký</h2>
          <p className="text-gray-500 text-sm mt-1">Tạo tài khoản để đặt bàn dễ dàng</p>
        </div>

        <div className="flex bg-gray-100 rounded-full p-1 mb-6">
          <Link href="/login" className="w-1/2 text-center py-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
            Đăng nhập
          </Link>
          <div className="w-1/2 text-center py-2 bg-white rounded-full text-sm font-bold shadow-sm text-gray-900">
            Đăng ký
          </div>
        </div>

        {/* Gắn handleSubmit vào sự kiện onSubmit của form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-black-700 mb-1">Họ và tên *</label>
            <input 
              type="text" 
              name="name" // Thêm name để mapping
              value={formData.name} // Gắn giá trị vào state
              onChange={handleChange} // Bắt sự kiện thay đổi
              required
              placeholder="Nguyễn Văn A" 
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700 transition-all" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black-700 mb-1">Email *</label>
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="yourname@gmail.com" 
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700 transition-all" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black-700 mb-1">Số điện thoại *</label>
            <input 
              type="tel" 
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="0XX XXX XXXX" 
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700 transition-all" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-black-700 mb-1">Mật khẩu *</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••" 
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700 transition-all pr-12" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-700 transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-black-700 mb-1">Xác nhận mật khẩu *</label>
            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="••••••••" 
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700 transition-all pr-12" 
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-700 transition-colors"
              >
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-start py-2">
            <input type="checkbox" required className="mt-1 w-4 h-4 text-green-700 border-gray-300 rounded focus:ring-green-700 cursor-pointer" />
            <span className="text-sm text-gray-500 ml-2">
              Tôi đồng ý với <a href="#" className="text-green-700 font-semibold hover:underline">Điều khoản sử dụng</a> và <a href="#" className="text-green-700 font-semibold hover:underline">Chính sách bảo mật</a> của SmaRes.
            </span>
          </div>

          {/* Đổi type thành submit và vô hiệu hóa nút khi đang đợi tải */}
          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full text-white font-bold py-3 rounded-lg mt-2 shadow-sm ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'interactive-btn bg-green-800 hover:bg-green-900'}`}
          >
            {isLoading ? 'Đang xử lý...' : 'Tạo Tài Khoản'}
          </button>
        </form>

      </div>
    </main>
  );
}