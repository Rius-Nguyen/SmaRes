export default function Footer() {
  return (
    <footer className="bg-zinc-900 text-gray-300 py-16 px-8 md:px-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-zinc-700 pb-12">
        {/* Cột 1: Giới thiệu */}
        <div>
          <div className="flex items-center space-x-2 mb-6">
             <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs">S</div>
             <span className="text-xl font-bold text-white tracking-tight">SmaRes</span>
          </div>
          <p className="text-sm leading-relaxed text-gray-400">
            Chúng tôi định nghĩa lại ẩm thực Việt bằng công nghệ thông minh và hương vị nguyên bản tinh tế. Trải nghiệm vị giác hoàn hảo bắt đầu từ sự chuẩn mực.
          </p>
        </div>

        {/* Cột 2: Giờ hoạt động */}
        <div>
          <h3 className="text-orange-500 font-bold mb-6 text-sm uppercase tracking-wider">Giờ hoạt động</h3>
          <ul className="text-sm space-y-3">
            <li>Thứ Hai - Thứ Sáu:<br/><span className="text-yellow-500">10:00 AM - 22:30 PM</span></li>
            <li>Thứ Bảy - Chủ Nhật:<br/><span className="text-yellow-500">09:00 AM - 23:00 PM</span></li>
          </ul>
        </div>

        {/* Cột 3: Liên hệ */}
        <div>
          <h3 className="text-orange-500 font-bold mb-6 text-sm uppercase tracking-wider">Địa chỉ liên hệ</h3>
          <ul className="text-sm space-y-3 text-gray-400">
            <li>Quận 1, Thành phố Hồ Chí Minh, Việt Nam</li>
            <li>Hotline: 1900 1234</li>
            <li>Email: contact@smares.com</li>
          </ul>
        </div>
      </div>
      
      {/* Bản quyền */}
      <div className="max-w-7xl mx-auto pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
         <p>© 2026 SmaRes Restaurant. Mọi quyền được bảo lưu.</p>
         <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition-colors">Facebook</a>
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
            <a href="#" className="hover:text-white transition-colors">TripAdvisor</a>
         </div>
      </div>
    </footer>
  );
}