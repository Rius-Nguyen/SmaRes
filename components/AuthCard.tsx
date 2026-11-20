"use client";

import Link from 'next/link';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

interface AuthCardProps {
  initialMode?: 'login' | 'register';
}

export default function AuthCard({ initialMode = 'login' }: AuthCardProps) {
  const router = useRouter();
  const { showToast } = useToast();

  // Chế độ hiện tại: 'login' hoặc 'register'
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Chiều cao tự động của khung chứa 2 form để animation co giãn mượt mà
  const [formHeight, setFormHeight] = useState<number | undefined>(undefined);

  // Tham chiếu đến hai khối form
  const loginFormRef = useRef<HTMLDivElement>(null);
  const registerFormRef = useRef<HTMLDivElement>(null);

  // =================== STATE & LOGIC: ĐĂNG NHẬP ===================
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      let data: {
        user?: {
          id?: string;
          name?: string;
          email?: string;
          role?: string;
        };
        message?: string;
      } = {};
      try {
        data = await response.json();
      } catch {
        data = { message: `Lỗi phản hồi từ máy chủ (${response.status})` };
      }

      if (response.ok) {
        localStorage.removeItem('token');
        if (data.user) {
          const safeUser = {
            id: data.user.id ?? '',
            name: data.user.name ?? '',
            email: data.user.email ?? '',
            role: data.user.role ?? '',
          };
          localStorage.setItem('user', JSON.stringify(safeUser));
        }

        // Bắn sự kiện để Navbar cập nhật ngay lập tức mà không cần F5
        window.dispatchEvent(new Event('auth-change'));

        const redirectParam =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('redirect')
            : null;
        const safeRedirect =
          redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
            ? redirectParam
            : '/';

        showToast('Đăng nhập thành công! Chào mừng bạn quay lại SmaRes.', 'success');
        router.push(safeRedirect);
      } else {
        showToast(data.message || 'Tài khoản hoặc mật khẩu không chính xác.', 'error');
      }
    } catch (error) {
      console.error("Lỗi khi gọi API:", error);
      showToast('Đã xảy ra lỗi kết nối với máy chủ. Vui lòng thử lại.', 'error');
    } finally {
      setIsLoginLoading(false);
    }
  };

  // =================== STATE & LOGIC: ĐĂNG KÝ ===================
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegisterData({
      ...registerData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registerData.password.length < 6) {
      showToast('Mật khẩu phải có tối thiểu 6 ký tự.', 'error');
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      showToast('Mật khẩu xác nhận không khớp!', 'error');
      return;
    }

    setIsRegisterLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          phone: registerData.phone,
          password: registerData.password,
        }),
      });

      let data: { message?: string } = {};
      try {
        data = await response.json();
      } catch {
        data = { message: `Lỗi phản hồi từ máy chủ (${response.status})` };
      }

      if (response.ok) {
        showToast('Đăng ký tài khoản thành công! Xin mời đăng nhập.', 'success');
        setLoginData((prev) => ({ ...prev, email: registerData.email }));
        setRegisterData((prev) => ({ ...prev, password: '', confirmPassword: '' }));
        switchMode('login'); // Chuyển sang tab đăng nhập mượt mà không load lại trang
      } else {
        showToast(data?.message || 'Không thể đăng ký tài khoản lúc này.', 'error');
      }
    } catch (error) {
      console.error("Lỗi khi gọi API:", error);
      showToast('Đã xảy ra lỗi kết nối với máy chủ. Vui lòng thử lại.', 'error');
    } finally {
      setIsRegisterLoading(false);
    }
  };

  // =================== CHUYỂN TAB & ĐỔI URL ===================
  const switchMode = useCallback((newMode: 'login' | 'register') => {
    if (newMode === mode) return;

    // Cập nhật chiều cao ngay lập tức để đồng bộ với chuyển động trượt
    const targetRef = newMode === 'login' ? loginFormRef : registerFormRef;
    if (targetRef.current) {
      setFormHeight(targetRef.current.offsetHeight);
    }

    setMode(newMode);

    // Đổi URL trên thanh địa chỉ mà KHÔNG làm unmount component
    if (typeof window !== 'undefined') {
      const targetPath = newMode === 'login' ? '/login' : '/register';
      if (window.location.pathname !== targetPath) {
        window.history.replaceState(null, '', targetPath);
      }
    }
  }, [mode]);

  // Cập nhật chiều cao theo ResizeObserver khi form nội bộ thay đổi kích thước
  const updateActiveHeight = useCallback(() => {
    const activeEl = mode === 'login' ? loginFormRef.current : registerFormRef.current;
    if (activeEl) {
      setFormHeight(activeEl.offsetHeight);
    }
  }, [mode]);

  useEffect(() => {
    updateActiveHeight();

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const isCurrentActive =
          (mode === 'login' && entry.target === loginFormRef.current) ||
          (mode === 'register' && entry.target === registerFormRef.current);
        if (isCurrentActive) {
          const el = entry.target as HTMLElement;
          setFormHeight(el.offsetHeight);
        }
      }
    });

    if (loginFormRef.current) observer.observe(loginFormRef.current);
    if (registerFormRef.current) observer.observe(registerFormRef.current);

    return () => {
      observer.disconnect();
    };
  }, [mode, updateActiveHeight]);

  // Lắng nghe sự kiện người dùng bấm nút Back / Forward trên trình duyệt
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path.includes('register')) {
          setMode('register');
        } else if (path.includes('login')) {
          setMode('login');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <main
      className="min-h-screen flex items-center justify-center bg-stone-900 bg-cover bg-center relative py-12 px-4 sm:px-6"
      style={{ backgroundImage: "url('/foods/hero-bg1.jpg')" }}
    >
      {/* Lớp phủ đa tầng ấm áp tạo chiều sâu quang học (Dimensional Warm Overlay) */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/85 via-stone-950/75 to-stone-950/90 backdrop-blur-[3px]"></div>

      {/* Thẻ chứa Form xác thực — Chuẩn Gastronomy Warm Surface */}
      <div className="relative z-10 w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(28,25,23,0.35),0_0_0_1px_rgba(255,255,255,0.6)] p-8 sm:p-10 border border-stone-200/80 transition-all duration-300">
        
        {/* Phần đầu: Biểu tượng thương hiệu & Tiêu đề mượt mà */}
        <div className="flex flex-col items-center mb-6 text-center">
          <Link href="/" className="group flex flex-col items-center focus:outline-none focus:ring-2 focus:ring-emerald-700/40 rounded-2xl p-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-800 to-green-950 text-amber-300 flex items-center justify-center font-bold text-2xl shadow-lg shadow-green-950/20 ring-4 ring-amber-100/60 mb-3 transition-transform duration-300 group-hover:scale-105">
              S
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60 mb-2">
              SmaRes Gastronomy
            </span>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight transition-all duration-300">
            {mode === 'login' ? 'Đăng Nhập' : 'Tạo Tài Khoản'}
          </h1>
          <p className="text-stone-500 text-sm mt-1.5 max-w-xs leading-relaxed transition-all duration-300">
            {mode === 'login'
              ? 'Chào mừng bạn quay lại với trải nghiệm ẩm thực thượng hạng SmaRes'
              : 'Đăng ký để tận hưởng trải nghiệm đặt bàn ưu tiên và ưu đãi ẩm thực độc quyền'}
          </p>
        </div>

        {/* 1. Thanh tab "Đăng nhập / Đăng ký" có nền trắng trượt ngang dạng công tắc (translate-x) */}
        <div className="relative flex bg-stone-100 p-1 rounded-2xl mb-6 border border-stone-200/50 select-none">
          {/* Nền trắng trượt ngang công tắc */}
          <div
            className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-sm border border-stone-200/40 transition-transform duration-300 ease-out pointer-events-none ${
              mode === 'login' ? 'translate-x-0' : 'translate-x-full'
            }`}
          />

          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`relative z-10 w-1/2 text-center py-2.5 text-sm transition-colors duration-200 cursor-pointer ${
              mode === 'login' ? 'font-bold text-stone-900' : 'font-medium text-stone-500 hover:text-stone-800'
            }`}
          >
            Đăng nhập
          </button>

          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`relative z-10 w-1/2 text-center py-2.5 text-sm transition-colors duration-200 cursor-pointer ${
              mode === 'register' ? 'font-bold text-stone-900' : 'font-medium text-stone-500 hover:text-stone-800'
            }`}
          >
            Đăng ký
          </button>
        </div>

        {/* 2. Khung chứa 2 form đặt trên cùng một hàng ngang (w-[200%]) và trượt qua lại, co giãn mượt mà */}
        <div
          className="relative overflow-hidden transition-[height] duration-300 ease-out"
          style={{ height: formHeight ? `${formHeight}px` : undefined }}
        >
          <div
            className={`w-[200%] flex items-start transition-transform duration-300 ease-out ${
              mode === 'login' ? 'translate-x-0' : '-translate-x-1/2'
            }`}
          >
            {/* ================= FORM ĐĂNG NHẬP ================= */}
            <div
              ref={loginFormRef}
              className={`w-1/2 shrink-0 px-1 transition-opacity duration-200 ${
                mode === 'login' ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              aria-hidden={mode !== 'login'}
            >
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Trường Email */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1.5 flex items-center justify-between">
                    <span>Email hoặc Tên tài khoản <span className="text-amber-600 font-bold">*</span></span>
                  </label>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-emerald-800 transition-colors pointer-events-none">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </span>
                    <input 
                      type="text" 
                      inputMode="email"
                      name="email"
                      value={loginData.email}
                      onChange={handleLoginChange}
                      required
                      placeholder="yourname@gmail.com hoặc tên đăng nhập" 
                      className="w-full pl-11 pr-4 py-3 bg-stone-50/60 border border-stone-200 rounded-xl text-stone-900 text-sm sm:text-base placeholder:text-stone-400 focus:outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 focus:bg-white hover:border-stone-300 transition-all duration-200" 
                    />
                  </div>
                </div>
                
                {/* Trường Mật khẩu */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs sm:text-sm font-semibold text-stone-700">
                      Mật khẩu <span className="text-amber-600 font-bold">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        showToast(
                          'Vui lòng liên hệ hotline **** **** hoặc mục Liên hệ tại trang Về chúng tôi để được hỗ trợ khôi phục mật khẩu.',
                          'info'
                        )
                      }
                      className="text-xs font-semibold text-emerald-800 hover:text-amber-700 hover:underline transition-colors cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-emerald-800 transition-colors pointer-events-none">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                    <input 
                      type={showLoginPassword ? "text" : "password"} 
                      name="password"
                      value={loginData.password}
                      onChange={handleLoginChange}
                      required
                      placeholder="••••••••" 
                      className="w-full pl-11 pr-12 py-3 bg-stone-50/60 border border-stone-200 rounded-xl text-stone-900 text-sm sm:text-base placeholder:text-stone-400 focus:outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 focus:bg-white hover:border-stone-300 transition-all duration-200" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      aria-label={showLoginPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-emerald-800 p-1.5 rounded-lg hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 transition-colors"
                    >
                      {showLoginPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Nút bấm Đăng Nhập */}
                <button 
                  type="submit" 
                  disabled={isLoginLoading}
                  className={`w-full font-bold py-3.5 px-6 rounded-xl text-sm sm:text-base text-white shadow-md transition-all duration-200 flex items-center justify-center gap-2 mt-4 ${
                    isLoginLoading 
                      ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none' 
                      : 'interactive-btn bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] shadow-emerald-950/20 hover:shadow-lg hover:shadow-emerald-900/25 cursor-pointer'
                  }`}
                >
                  {isLoginLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-stone-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Đang kiểm tra...</span>
                    </>
                  ) : (
                    <span>Đăng Nhập</span>
                  )}
                </button>
              </form>
            </div>

            {/* ================= FORM ĐĂNG KÝ ================= */}
            <div
              ref={registerFormRef}
              className={`w-1/2 shrink-0 px-1 transition-opacity duration-200 ${
                mode === 'register' ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              aria-hidden={mode !== 'register'}
            >
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                {/* Trường Họ và tên */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1">
                    Họ và tên <span className="text-amber-600 font-bold">*</span>
                  </label>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-emerald-800 transition-colors pointer-events-none">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <input 
                      type="text" 
                      name="name"
                      value={registerData.name}
                      onChange={handleRegisterChange}
                      required
                      placeholder="Ví dụ: Nguyễn Văn A" 
                      className="w-full pl-11 pr-4 py-2.5 bg-stone-50/60 border border-stone-200 rounded-xl text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 focus:bg-white hover:border-stone-300 transition-all duration-200" 
                    />
                  </div>
                </div>

                {/* Cặp Email & Số điện thoại trên 2 cột */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1">
                      Email <span className="text-amber-600 font-bold">*</span>
                    </label>
                    <div className="relative group">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-emerald-800 transition-colors pointer-events-none">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </span>
                      <input 
                        type="email" 
                        name="email"
                        value={registerData.email}
                        onChange={handleRegisterChange}
                        required
                        placeholder="yourname@gmail.com" 
                        className="w-full pl-11 pr-3 py-2.5 bg-stone-50/60 border border-stone-200 rounded-xl text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 focus:bg-white hover:border-stone-300 transition-all duration-200" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1">
                      Số điện thoại <span className="text-amber-600 font-bold">*</span>
                    </label>
                    <div className="relative group">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-emerald-800 transition-colors pointer-events-none">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </span>
                      <input 
                        type="tel" 
                        name="phone"
                        value={registerData.phone}
                        onChange={handleRegisterChange}
                        required
                        placeholder="09xx xxx xxx" 
                        className="w-full pl-11 pr-3 py-2.5 bg-stone-50/60 border border-stone-200 rounded-xl text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 focus:bg-white hover:border-stone-300 transition-all duration-200" 
                      />
                    </div>
                  </div>
                </div>
                
                {/* Trường Mật khẩu */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1">
                    Mật khẩu <span className="text-amber-600 font-bold">*</span>
                  </label>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-emerald-800 transition-colors pointer-events-none">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                    <input 
                      type={showRegisterPassword ? "text" : "password"} 
                      name="password"
                      value={registerData.password}
                      onChange={handleRegisterChange}
                      required
                      placeholder="Tối thiểu 6 ký tự" 
                      className="w-full pl-11 pr-12 py-2.5 bg-stone-50/60 border border-stone-200 rounded-xl text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 focus:bg-white hover:border-stone-300 transition-all duration-200" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      aria-label={showRegisterPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-emerald-800 p-1.5 rounded-lg hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 transition-colors"
                    >
                      {showRegisterPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Trường Xác nhận Mật khẩu */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1">
                    Xác nhận mật khẩu <span className="text-amber-600 font-bold">*</span>
                  </label>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-emerald-800 transition-colors pointer-events-none">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </span>
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      name="confirmPassword"
                      value={registerData.confirmPassword}
                      onChange={handleRegisterChange}
                      required
                      placeholder="Nhập lại mật khẩu" 
                      className="w-full pl-11 pr-12 py-2.5 bg-stone-50/60 border border-stone-200 rounded-xl text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 focus:bg-white hover:border-stone-300 transition-all duration-200" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-emerald-800 p-1.5 rounded-lg hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 transition-colors"
                    >
                      {showConfirmPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Điều khoản sử dụng */}
                <div className="flex items-start gap-2.5 pt-0.5">
                  <input 
                    type="checkbox" 
                    required 
                    id="terms"
                    className="mt-1 w-4 h-4 text-emerald-800 border-stone-300 rounded focus:ring-emerald-700/30 focus:ring-2 cursor-pointer accent-emerald-800 shrink-0" 
                  />
                  <label htmlFor="terms" className="text-xs text-stone-600 leading-relaxed cursor-pointer select-none">
                    Tôi đồng ý với{' '}
                    <Link href="/about#terms" className="text-emerald-800 font-semibold hover:text-amber-700 hover:underline transition-colors">
                      Điều khoản sử dụng
                    </Link>{' '}
                    và{' '}
                    <Link href="/about#privacy" className="text-emerald-800 font-semibold hover:text-amber-700 hover:underline transition-colors">
                      Chính sách bảo mật
                    </Link>{' '}
                    của SmaRes.
                  </label>
                </div>

                {/* Nút bấm Tạo Tài Khoản */}
                <button 
                  type="submit" 
                  disabled={isRegisterLoading}
                  className={`w-full font-bold py-3.5 px-6 rounded-xl text-sm sm:text-base text-white shadow-md transition-all duration-200 flex items-center justify-center gap-2 mt-2 ${
                    isRegisterLoading 
                      ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none' 
                      : 'interactive-btn bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] shadow-emerald-950/20 hover:shadow-lg hover:shadow-emerald-900/25 cursor-pointer'
                  }`}
                >
                  {isRegisterLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-stone-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <span>Tạo Tài Khoản</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* 3. Đường dẫn phụ quay về trang chủ & hỗ trợ */}
        <div className="mt-6 pt-5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-medium text-stone-500 hover:text-emerald-800 transition-colors"
          >
            <span>←</span> Quay lại Trang chủ SmaRes
          </Link>
          <Link
            href="/about#contact"
            className="font-medium text-emerald-800 hover:text-amber-700 hover:underline transition-colors"
          >
            Hỗ trợ tài khoản →
          </Link>
        </div>

      </div>
    </main>
  );
}

