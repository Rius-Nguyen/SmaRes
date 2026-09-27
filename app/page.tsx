import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen">
      
      {/* 1. KHU VỰC BANNER */}
      <section 
        className="relative flex flex-col items-center justify-center min-h-[70vh] bg-cover bg-center" 
        style={{ backgroundImage: "url('/foods/hero-bg1.jpg')" }}
      >
        {/* Lớp phủ màu đen mờ chỉ áp dụng cho Banner */}
        <div className="absolute inset-0 bg-black/60"></div>
        
        {/* Nội dung Banner */}
        <div className="relative z-10 text-center px-4">
          <p className="text-green-400 text-sm md:text-base font-semibold tracking-wider mb-4 uppercase">
            ẨM THỰC VIỆT NAM TINH TẾ & THÔNG MINH
          </p>
          <h1 className="text-4xl md:text-6xl font-sans font-bold text-white mb-6">
            Chào mừng đến với SmaRes!
          </h1>
          <p className="text-base md:text-lg text-gray-200 mb-10 max-w-2xl mx-auto font-light">
            Trải nghiệm ẩm thực Việt Nam hiện đại - Đặt bàn trực tuyến nhanh chóng, thưởng thức món ngon trọn vị hôm nay
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link href="/menu" className="bg-yellow-500 text-black px-8 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition-colors w-full sm:w-auto">
              Khám phá thực đơn
            </Link>
            <Link href="/booking" className="bg-green-800 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors w-full sm:w-auto">
              Đặt bàn ngay
            </Link>
          </div>
        </div>
      </section>

      {/* 2. KHU VỰC MÓN ĂN ĐẶC TRƯNG */}
      <section className="bg-white py-20 px-4 w-full relative z-20">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Trải nghiệm đỉnh cao</p>
          <h2 className="text-3xl md:text-4xl font-sans font-bold text-gray-900 mb-12">Món Ăn Đặc Trưng Tại SmaRes</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {/* Món 1 */}
            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
               <div className="h-56 bg-gray-200"><img src="/foods/pho_bo.jpg" alt="Phở Bò" className="w-full h-full object-cover" /></div>
               <div className="p-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-gray-900">Phở Bò Wagyu Cao Cấp</h3>
                    <span className="text-green-700 font-bold">245.000đ</span>
                  </div>
                  <p className="text-gray-500 text-sm mb-6 line-clamp-2">Sự kết hợp tinh túy giữa nước dùng truyền thống ninh 24 giờ cùng thịt bò Wagyu A5 mềm tan khó cưỡng.</p>
                  <button className="text-sm font-bold text-gray-900 hover:text-green-700 flex items-center">Thêm vào giỏ hàng <span className="ml-2">→</span></button>
               </div>
            </div>

            {/* Món 2 */}
            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
               <div className="h-56 bg-gray-200"><img src="/foods/cha_gio1.jpg" alt="Chả Giò" className="w-full h-full object-cover" /></div>
               <div className="p-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-gray-900">Chả Giò Cua Hoàng Đế</h3>
                    <span className="text-green-700 font-bold">185.000đ</span>
                  </div>
                  <p className="text-gray-500 text-sm mb-6 line-clamp-2">Bánh tráng phơi sương giòn rụm bọc nhân cua hoàng đế và măng tây tươi, ăn kèm nước mắm chua ngọt đặc chế.</p>
                  <button className="text-sm font-bold text-gray-900 hover:text-green-700 flex items-center">Thêm vào giỏ hàng <span className="ml-2">→</span></button>
               </div>
            </div>

            {/* Món 3 */}
            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
               <div className="h-56 bg-gray-200"><img src="/foods/vit_quay.jpg" alt="Vịt Quay" className="w-full h-full object-cover" /></div>
               <div className="p-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-gray-900">Vịt Quay Sốt Mật Ong Rừng</h3>
                    <span className="text-green-700 font-bold">320.000đ</span>
                  </div>
                  <p className="text-gray-500 text-sm mb-6 line-clamp-2">Thịt vịt mềm mọng, lớp da giòn bóng bẩy tẩm ướp mật ong rừng Tây Bắc cùng thảo mộc thơm lừng.</p>
                  <button className="text-sm font-bold text-gray-900 hover:text-green-700 flex items-center">Thêm vào giỏ hàng <span className="ml-2">→</span></button>
               </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}