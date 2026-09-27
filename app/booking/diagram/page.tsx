import Link from 'next/link';

export default function BookingDiagramPage() {
  return (
    <main className="flex-1 bg-gray-100 pb-16">
      {/* Header tối màu */}
      <div className="bg-zinc-900 py-16 text-center px-4">
        <h1 className="text-3xl md:text-4xl font-sans font-bold text-white mb-3">Sơ đồ bàn ăn — Chọn bàn phù hợp</h1>
        <p className="text-gray-400">Xem trực quan trạng thái bàn theo thời gian thực và chọn vị trí lý tưởng cho bữa tiệc của bạn</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Cột Trái: Sơ đồ bàn ăn (Chiếm 2 phần) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Chú thích trạng thái */}
          <div className="flex flex-wrap items-center justify-between border-b pb-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800">Không gian SmaRes</h2>
            <div className="flex space-x-6 text-sm font-semibold mt-4 sm:mt-0">
              <div className="flex items-center"><span className="w-4 h-4 bg-green-500 rounded-sm mr-2"></span>Trống</div>
              <div className="flex items-center"><span className="w-4 h-4 bg-red-500 rounded-sm mr-2"></span>Đã có khách</div>
              <div className="flex items-center"><span className="w-4 h-4 bg-yellow-400 rounded-sm mr-2"></span>Đang dọn (~10 phút)</div>
            </div>
          </div>

          {/* Khu vực VIP */}
          <div className="mb-10">
            <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">Khu vực VIP</h3>
            <div className="flex space-x-4">
              <div className="w-20 h-20 bg-red-500 text-white rounded-full flex flex-col items-center justify-center font-bold shadow-md opacity-80 cursor-not-allowed">
                <span>V01</span><span className="text-xs font-normal">6 chỗ</span>
              </div>
              <div className="w-20 h-20 bg-green-500 text-white rounded-full flex flex-col items-center justify-center font-bold shadow-md cursor-pointer hover:scale-105 transition-transform ring-4 ring-green-200">
                <span>V02</span><span className="text-xs font-normal">6 chỗ</span>
              </div>
              <div className="w-24 h-16 bg-yellow-400 text-white rounded-lg flex flex-col items-center justify-center font-bold shadow-md cursor-not-allowed">
                <span>V03</span><span className="text-xs font-normal">10 chỗ</span>
              </div>
            </div>
          </div>

          {/* Khu Trung tâm */}
          <div className="mb-10">
            <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">Khu Trung tâm</h3>
            <div className="grid grid-cols-4 gap-4 max-w-md">
              <div className="h-16 bg-red-500 text-white rounded-lg flex flex-col items-center justify-center font-bold shadow-md cursor-not-allowed"><span>B01</span><span className="text-xs font-normal">2 chỗ</span></div>
              <div className="h-16 bg-green-500 text-white rounded-lg flex flex-col items-center justify-center font-bold shadow-md cursor-pointer hover:scale-105 transition-transform"><span>B02</span><span className="text-xs font-normal">4 chỗ</span></div>
              <div className="h-16 bg-red-500 text-white rounded-lg flex flex-col items-center justify-center font-bold shadow-md cursor-not-allowed"><span>B03</span><span className="text-xs font-normal">4 chỗ</span></div>
              <div className="h-16 bg-yellow-400 text-white rounded-lg flex flex-col items-center justify-center font-bold shadow-md cursor-not-allowed"><span>B04</span><span className="text-xs font-normal">2 chỗ</span></div>
              
              <div className="h-16 bg-green-500 text-white rounded-lg flex flex-col items-center justify-center font-bold shadow-md cursor-pointer hover:scale-105 transition-transform ring-4 ring-green-200"><span>B05</span><span className="text-xs font-normal">4 chỗ</span></div>
              <div className="h-16 bg-green-500 text-white rounded-lg flex flex-col items-center justify-center font-bold shadow-md cursor-pointer hover:scale-105 transition-transform"><span>B06</span><span className="text-xs font-normal">4 chỗ</span></div>
              <div className="col-span-2 h-16 bg-red-500 text-white rounded-lg flex flex-col items-center justify-center font-bold shadow-md cursor-not-allowed"><span>B07</span><span className="text-xs font-normal">8 chỗ</span></div>
            </div>
          </div>

          {/* Cạnh cửa sổ */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">Cạnh cửa sổ</h3>
            <div className="flex space-x-4">
              <div className="w-24 h-16 bg-green-500 text-white rounded-lg flex flex-col items-center justify-center font-bold shadow-md cursor-pointer hover:scale-105 transition-transform"><span>W01</span><span className="text-xs font-normal">4 chỗ</span></div>
              <div className="w-24 h-16 bg-red-500 text-white rounded-lg flex flex-col items-center justify-center font-bold shadow-md cursor-not-allowed"><span>W02</span><span className="text-xs font-normal">4 chỗ</span></div>
              <div className="w-24 h-16 bg-yellow-400 text-white rounded-lg flex flex-col items-center justify-center font-bold shadow-md cursor-not-allowed"><span>W03</span><span className="text-xs font-normal">4 chỗ</span></div>
            </div>
          </div>
        </div>

        {/* Cột Phải: Form xác nhận */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-fit">
          <div className="border-b pb-4 mb-4">
            <h2 className="text-lg font-bold text-gray-800">Đặt bàn</h2>
            <p className="text-green-700 font-bold">Bàn B05 — 4 người</p>
          </div>
          
          <div className="space-y-4 text-sm mb-6">
            <div>
              <label className="block text-gray-500 mb-1">Ngày đặt bàn</label>
              <div className="font-semibold text-gray-900 border rounded-lg px-3 py-2 bg-gray-50">25 / 10 / 2024</div>
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Giờ đến</label>
              <div className="grid grid-cols-4 gap-2">
                 <div className="border rounded md text-center py-1 bg-gray-50 text-gray-400">18:00</div>
                 <div className="border rounded md text-center py-1 bg-gray-50 text-gray-400">18:30</div>
                 <div className="border-2 border-green-600 rounded md text-center py-1 bg-green-50 text-green-700 font-bold">19:00</div>
                 <div className="border rounded md text-center py-1 bg-gray-50 text-gray-400">19:30</div>
              </div>
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Họ tên & Số điện thoại</label>
              <div className="font-semibold text-gray-900">Nguyễn Văn A - 0XX XXX XXXX</div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-100">
             <p className="text-xs text-gray-500 font-bold uppercase mb-2">THÔNG TIN TÓM TẮT</p>
             <ul className="text-sm space-y-1 text-gray-700 font-medium">
               <li>Bàn đặt: <span className="text-gray-900">B05 (Khu trung tâm)</span></li>
               <li>Thời gian: <span className="text-gray-900">19:00, 25/10/2024</span></li>
               <li>Số lượng khách: <span className="text-gray-900">4 người</span></li>
             </ul>
          </div>

          <Link href="/booking/success" className="block w-full text-center bg-green-800 text-white font-bold py-3 rounded-lg hover:bg-green-900 transition-colors">
            Xác nhận đặt bàn
          </Link>
          <button className="block w-full text-center text-gray-500 font-semibold py-3 mt-2 hover:text-gray-800">
            Hủy
          </button>
        </div>

      </div>
    </main>
  );
}