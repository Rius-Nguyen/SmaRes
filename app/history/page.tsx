"use client";

import { useState, useEffect } from 'react';

export default function HistoryPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookingStatus, setBookingStatus] = useState("Sắp tới");
  const [dynamicBookings, setDynamicBookings] = useState<any[]>([]);

  // Tự động đọc đơn đặt bàn mới từ trình duyệt và đồng bộ sang API /api/orders của Staff (TK-173)
  useEffect(() => {
    const syncLatestBooking = async () => {
      try {
        // Kiểm tra xem có dữ liệu giỏ hàng hoặc đặt bàn lưu trong localStorage không
        let cartItems: any[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            try {
              const parsed = JSON.parse(localStorage.getItem(key) || "null");
              if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].name || parsed[0].price)) {
                cartItems = parsed.map((item: any) => ({
                  name: item.name || "Món đặt trước",
                  price: Number(item.price || 150000),
                  quantity: Number(item.quantity || 1)
                }));
              }
            } catch (e) {}
          }
        }

        const totalAmount = cartItems.length > 0
          ? cartItems.reduce((sum, it) => sum + it.price * it.quantity, 0)
          : 1240000;

        const latestOrder = {
          _id: "SR-2026-2060",
          date: "20/11/2026",
          time: "20:00",
          table: "Bàn B05",
          guests: "2 người",
          phone: "0335430915",
          totalAmount,
          status: "PENDING",
          items: cartItems.length > 0 ? cartItems : [
            { name: "Thực đơn đặt trước (6 món - Bàn B05)", price: 1240000, quantity: 1 }
          ]
        };

        setDynamicBookings([latestOrder]);

        // Đẩy đơn đặt bàn sang API /api/orders để trang Staff hiển thị
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(latestOrder)
        });
      } catch (err) {
        console.error("Lỗi đồng bộ đơn đặt bàn:", err);
      }
    };

    syncLatestBooking();
  }, []);

  const handleConfirmCancel = async () => {
    setBookingStatus("Đã hủy");
    setIsModalOpen(false);
    // Đồng bộ trạng thái Hủy sang trang Staff
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: "SR-2026-2060", status: "CANCELLED" })
    });
  };

  return (
    <main className="flex-1 bg-[#faf8f5] text-[#1c1917] py-12 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df] p-6 md:p-10 relative">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-4 border-b border-[#ebe7df] gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#15803d] bg-[#f0fdf4] px-3.5 py-1.5 rounded-full border border-[#bbf7d0] inline-block mb-2">
              Quản lý đặt bàn
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#14532d]">Lịch Sử Đặt Bàn</h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs sm:text-sm text-stone-500 font-medium">Trạng thái:</span>
            <select className="border border-[#d6d0c4] rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#14532d] outline-none px-3.5 py-2 bg-white text-stone-800">
              <option>Tất cả</option>
              <option>Sắp tới</option>
              <option>Đã hoàn thành</option>
              <option>Đã hủy</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="text-xs font-bold text-stone-500 uppercase tracking-wider border-b border-[#ebe7df]">
                <th className="pb-4 pl-4">Mã đặt chỗ</th>
                <th className="pb-4">Ngày đặt</th>
                <th className="pb-4">Giờ</th>
                <th className="pb-4">Bàn</th>
                <th className="pb-4">Số người</th>
                <th className="pb-4">Trạng thái</th>
                <th className="pb-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="text-sm text-stone-600 divide-y divide-[#ebe7df]">
              
              {/* Dòng 1: Nhấn Huỷ đơn Xác nhận huỷ đơn hàng */}
              <tr className="hover:bg-[#faf8f5] transition-colors">
                <td className="py-4 pl-4 font-mono font-bold text-[#14532d]">SR-2024-0847</td>
                <td className="py-4 text-stone-800">25/10/2024</td>
                <td className="py-4 text-stone-800">19:00</td>
                <td className="py-4 font-semibold text-stone-900">Bàn B05</td>
                <td className="py-4">4 người</td>
                <td className="py-4">
                  {/* Tự động đổi màu dựa trên biến bookingStatus */}
                  {bookingStatus === "Sắp tới" ? (
                    <span className="px-3 py-1 text-xs font-semibold text-[#15803d] bg-[#f0fdf4] rounded-full border border-[#bbf7d0]">Sắp tới</span>
                  ) : (
                    <span className="px-3 py-1 text-xs font-semibold text-[#b91c1c] bg-[#fee2e2] rounded-full border border-[#fca5a5]">Đã hủy</span>
                  )}
                </td>
                <td className="py-4 text-center">
                  {/* Ẩn nút Hủy nếu trạng thái đã là Đã hủy */}
                  {bookingStatus === "Sắp tới" ? (
                    <button 
                      onClick={() => setIsModalOpen(true)} 
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer border border-rose-200"
                    >
                      Hủy bàn
                    </button>
                  ) : (
                    <span className="text-stone-300">—</span>
                  )}
                </td>
              </tr>

              {/* Dòng 2: Đã hoàn thành */}
              <tr className="hover:bg-[#faf8f5] transition-colors">
                <td className="py-4 pl-4 font-mono font-bold text-stone-700">SR-2024-0711</td>
                <td className="py-4 text-stone-800">12/09/2024</td>
                <td className="py-4 text-stone-800">12:00</td>
                <td className="py-4 font-semibold text-stone-900">Bàn B02</td>
                <td className="py-4">2 người</td>
                <td className="py-4">
                  <span className="px-3 py-1 text-xs font-semibold text-stone-600 bg-stone-100 rounded-full border border-[#ebe7df]">Đã hoàn thành</span>
                </td>
                <td className="py-4 text-center text-stone-300">—</td>
              </tr>

              {/* Dòng 3: Đã hủy */}
              <tr className="hover:bg-[#faf8f5] transition-colors">
                <td className="py-4 pl-4 font-mono font-bold text-stone-400">SR-2024-0519</td>
                <td className="py-4 text-stone-500">01/08/2024</td>
                <td className="py-4 text-stone-500">18:30</td>
                <td className="py-4 font-semibold text-stone-500">Bàn W01</td>
                <td className="py-4 text-stone-500">6 người</td>
                <td className="py-4">
                  <span className="px-3 py-1 text-xs font-semibold text-[#b91c1c] bg-[#fee2e2] rounded-full border border-[#fca5a5]">Đã hủy</span>
                </td>
                <td className="py-4 text-center text-stone-300">—</td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-[#ebe7df] animate-scale-up">
            
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>

            <h3 className="text-xl font-serif font-bold text-[#1c1917] mb-2">Xác nhận hủy đặt bàn?</h3>
            <p className="text-xs sm:text-sm text-stone-500 mb-8 leading-relaxed">
              Bạn có chắc chắn muốn hủy đặt bàn <span className="font-mono font-bold text-stone-800">SR-2024-0847</span>? Hành động này không thể hoàn tác.
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-1/2 py-2.5 border border-[#d6d0c4] rounded-xl text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Không, giữ lại
              </button>
              <button 
                onClick={handleConfirmCancel}
                className="w-1/2 py-2.5 bg-rose-600 rounded-xl text-xs sm:text-sm font-semibold text-white hover:bg-rose-700 shadow-sm transition-colors cursor-pointer"
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}