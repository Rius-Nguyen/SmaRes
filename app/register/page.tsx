import Link from 'next/link';

export default function RegisterPage() {
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

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Họ và tên *</label>
            <input type="text" placeholder="Nguyễn Văn A" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
            <input type="email" placeholder="yourname@gmail.com" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Số điện thoại *</label>
            <input type="tel" placeholder="090 123 4567" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu *</label>
            <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Xác nhận mật khẩu *</label>
            <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700 transition-all" />
          </div>

          <div className="flex items-start py-2">
            <input type="checkbox" className="mt-1 w-4 h-4 text-green-700 border-gray-300 rounded focus:ring-green-700 cursor-pointer" />
            <span className="text-sm text-gray-500 ml-2">
              Tôi đồng ý với <a href="#" className="text-green-700 font-semibold hover:underline">Điều khoản sử dụng</a> và <a href="#" className="text-green-700 font-semibold hover:underline">Chính sách bảo mật</a> của SmaRes.
            </span>
          </div>

          <button type="button" className="w-full bg-green-800 text-white font-bold py-3 rounded-lg hover:bg-green-900 transition-colors mt-2">
            Tạo Tài Khoản
          </button>
        </form>

      </div>
    </main>
  );
}