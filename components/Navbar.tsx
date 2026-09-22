import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-white sticky top-0 z-50">
      {/* Cụm Logo bên trái */}
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white font-bold">
          {/* Thay bằng icon lá cây nếu bạn có SVG */}
          S
        </div>
        <Link href="/" className="text-2xl font-bold text-green-800 tracking-tight">SmaRes</Link>
      </div>

      {/* Cụm Menu ở giữa */}
      <div className="hidden md:flex space-x-8 text-sm font-semibold text-gray-700">
        <Link href="/" className="hover:text-green-700 transition-colors">Trang chủ</Link>
        <Link href="/menu" className="hover:text-green-700 transition-colors">Thực đơn</Link>
        <Link href="/about" className="hover:text-green-700 transition-colors">Về chúng tôi</Link>
        <Link href="/contact" className="hover:text-green-700 transition-colors">Liên hệ</Link>
      </div>

      {/* Cụm nút bấm bên phải */}
      <div className="flex items-center space-x-4">
        <Link href="/login" className="text-sm font-semibold px-4 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors">
          Đăng nhập
        </Link>
        <Link href="/booking" className="bg-green-800 text-white text-sm font-semibold px-6 py-2 rounded-full hover:bg-green-900 transition-colors">
          Đặt bàn
        </Link>
      </div>
    </nav>
  );
}