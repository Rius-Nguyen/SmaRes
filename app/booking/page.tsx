import Link from 'next/link';

export default function BookingPage() {
  return (
    <main className="flex-1 bg-gray-50">
      {/* Banner */}
      <div className="relative h-[40vh] bg-cover bg-center flex items-center justify-center" style={{ backgroundImage: "url('/foods/hero-bg3.jpg')" }}>
         <div className="absolute inset-0 bg-black/60"></div>
         <div className="relative z-10 text-center text-white px-4 mt-10">
            <h1 className="text-4xl md:text-5xl font-bold font-sans mb-4">Đặt Bàn Trực Tuyến</h1>
            <p className="text-sm md:text-base text-gray-200 font-light max-w-2xl mx-auto">Hãy để chúng tôi chuẩn bị sẵn sàng cho trải nghiệm ẩm thực thượng hạng của bạn</p>
         </div>
      </div>

      {/* Nội dung Form */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-20 -mt-10">
        
        {/* Cột trái: Form điền thông tin (chiếm 2 phần) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-green-800 mb-2">Thông tin đặt bàn</h2>
          <p className="text-gray-500 text-sm mb-8 pb-4 border-b">Vui lòng điền đầy đủ thông tin bên dưới để SmaRes phục vụ bạn tốt nhất</p>

          <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Họ và tên *</label>
              <input type="text" placeholder="Nguyễn Văn A" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-700 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Số điện thoại *</label>
              <input type="tel" placeholder="090 1234 567" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-700 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Địa chỉ Email</label>
              <input type="email" placeholder="nguyenvana@gmail.com" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-700 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Ngày đặt bàn *</label>
              <input type="date" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-700 outline-none transition-all text-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Giờ đến *</label>
              <select className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-700 outline-none transition-all text-gray-600">
                <option>Chọn khung giờ</option>
                <option>18:00</option>
                <option>18:30</option>
                <option>19:00</option>
                <option>19:30</option>
                <option>20:00</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Số lượng khách *</label>
              <select className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-700 outline-none transition-all text-gray-600">
                <option>Số người dùng</option>
                <option>2 người</option>
                <option>4 người</option>
                <option>6 người</option>
                <option>Khác</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Yêu cầu đặc biệt (Ghi chú thêm)</label>
              <textarea rows={4} placeholder="Ví dụ: Ghế trẻ em, dị ứng hải sản, tổ chức sinh nhật..." className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-700 outline-none transition-all"></textarea>
            </div>
            <div className="md:col-span-2 mt-4">
              <Link href="/booking/diagram" className="block w-full text-center bg-green-800 text-white font-bold py-4 rounded-lg hover:bg-green-900 transition-colors shadow-md">
                Xác Nhận Đặt Bàn Ngay
              </Link>
            </div>
          </form>
        </div>

        {/* Cột phải: Thông tin thêm (chiếm 1 phần) */}
        <div className="space-y-6">
          {/* Box SmaRes Gastronomy */}
          <div className="bg-zinc-900 rounded-2xl p-8 text-white shadow-lg">
            <h3 className="text-xl font-bold text-orange-400 mb-4">SmaRes Gastronomy</h3>
            <p className="text-sm text-gray-300 mb-6 leading-relaxed">
              Hương vị truyền thống được chế tác thông minh và chuẩn mực cao cấp. Khám phá ẩm thực mới lạ trong không gian mang hơi thở Á Đông hiện đại.
            </p>
            <ul className="space-y-4 text-sm text-gray-300">
              <li className="flex items-start">
                <span className="text-orange-400 mr-3 font-bold">📍</span> Quận 1, Thành phố Hồ Chí Minh
              </li>
              <li className="flex items-start">
                <span className="text-orange-400 mr-3 font-bold">📞</span> Hotline: 1900 1234
              </li>
              <li className="flex items-start">
                <span className="text-orange-400 mr-3 font-bold">⏰</span> Giờ mở cửa: 09:00 AM - 23:00 PM
              </li>
            </ul>
          </div>

          {/* Box Lưu ý */}
          <div className="bg-white rounded-2xl p-6 border border-green-200 shadow-sm">
            <h3 className="text-green-800 font-bold mb-2">Lưu ý đặt bàn trước</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              * Vui lòng đặt bàn trước tối thiểu 30 phút để trải nghiệm dịch vụ và sự đón tiếp hoàn hảo nhất từ đội ngũ SmaRes.
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}