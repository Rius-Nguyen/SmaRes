"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // 1. Quản lý trạng thái form (chỉ cần email và password)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // 2. Cập nhật dữ liệu khi gõ
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // 3. Xử lý gọi API khi submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Lưu token và thông tin user vào trình duyệt để giữ trạng thái đăng nhập
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Bắn sự kiện để Navbar cập nhật ngay lập tức mà không cần F5
        window.dispatchEvent(new Event('auth-change'));

        alert("Đăng nhập thành công!");
        router.push('/'); // Chuyển hướng về trang chủ SmaRes
      } else {
        alert(`Lỗi: ${data.message || "Tài khoản hoặc mật khẩu không chính xác"}`);
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
          <h2 className="text-2xl font-bold text-gray-900">Đăng Nhập</h2>
          <p className="text-gray-500 text-sm mt-1">Chào mừng bạn quay lại SmaRes</p>
        </div>

        {/* Nút chuyển đổi Đăng nhập / Đăng ký */}
        <div className="flex bg-gray-100 rounded-full p-1 mb-6">
          <div className="w-1/2 text-center py-2 bg-white rounded-full text-sm font-bold shadow-sm text-gray-900">
            Đăng nhập
          </div>
          <Link href="/register" className="w-1/2 text-center py-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
            Đăng ký
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu *</label>
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
            <div className="flex justify-end mt-2">
              <a href="#" className="text-sm text-green-700 font-semibold hover:underline">Quên mật khẩu?</a>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full text-white font-bold py-3 rounded-lg mt-4 shadow-sm ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'interactive-btn bg-green-800 hover:bg-green-900'}`}
          >
            {isLoading ? 'Đang kiểm tra...' : 'Đăng Nhập'}
          </button>
        </form>

      </div>
    </main>
  );
}