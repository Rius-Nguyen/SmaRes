import Link from 'next/link';

export default function LoginPage() {
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tài khoản Email *</label>
            <input type="email" placeholder="yourname@gmail.com" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700 transition-all" />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu *</label>
            <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700 transition-all" />
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

        {/* Đăng nhập Mạng xã hội */}
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