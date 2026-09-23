"use client";

import { useState } from 'react';

export default function HistoryPage() {
  // Biến quản lý pop-up
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Biến quản lý trạng thái của đơn đặt bàn (Mặc định là "Sắp tới")
  const [bookingStatus, setBookingStatus] = useState("Sắp tới");

  // Hàm xử lý khi bấm xác nhận hủy
  const handleConfirmCancel = () => {
    setBookingStatus("Đã hủy"); // Đổi trạng thái thành Đã hủy
    setIsModalOpen(false);      // Tắt pop-up
  };

  return (
    <main className="flex-1 bg-gray-50 py-12 px-4 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-10 relative">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 pb-4 border-b">
          <h1 className="text-2xl font-bold font-sans text-gray-900 mb-4 md:mb-0">Lịch sử đặt bàn</h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Trạng thái:</span>
            <select className="border-gray-300 rounded-lg text-sm focus:ring-green-700 outline-none px-3 py-1.5 border bg-white">
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
              <tr className="text-sm font-semibold text-gray-700 border-b border-gray-100">
                <th className="pb-4 pl-4">Mã đặt chỗ</th>
                <th className="pb-4">Ngày đặt</th>
                <th className="pb-4">Giờ</th>
                <th className="pb-4">Bàn</th>
                <th className="pb-4">Số người</th>
                <th className="pb-4">Trạng thái</th>
                <th className="pb-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-600">
              
              {/* Dòng 1: Nhấn Huỷ đơn Xác nhận huỷ đơn hàng */}
              <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-4 pl-4 font-semibold text-gray-900">SR-2024-0847</td>
                <td className="py-4">25/10/2024</td>
                <td className="py-4">19:00</td>
                <td className="py-4">Bàn B05</td>
                <td className="py-4">4 người</td>
                <td className="py-4">
                  {/* Tự động đổi màu dựa trên biến bookingStatus */}
                  {bookingStatus === "Sắp tới" ? (
                    <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">Sắp tới</span>
                  ) : (
                    <span className="px-3 py-1 text-xs font-bold text-red-600 bg-red-100 rounded-full">Đã hủy</span>
                  )}
                </td>
                <td className="py-4 text-center">
                  {/* Ẩn nút Hủy nếu trạng thái đã là Đã hủy */}
                  {bookingStatus === "Sắp tới" ? (
                    <button 
                      onClick={() => setIsModalOpen(true)} 
                      className="text-red-500 font-semibold hover:text-red-700 hover:underline px-3 py-1"
                    >
                      Hủy bàn
                    </button>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>

              {/* Dòng 2: Đã hoàn thành */}
              <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-4 pl-4 font-semibold text-gray-900">SR-2024-0711</td>
                <td className="py-4">12/09/2024</td>
                <td className="py-4">12:00</td>
                <td className="py-4">Bàn B02</td>
                <td className="py-4">2 người</td>
                <td className="py-4">
                  <span className="px-3 py-1 text-xs font-bold text-gray-600 bg-gray-100 rounded-full border border-gray-200">Đã hoàn thành</span>
                </td>
                <td className="py-4 text-center text-gray-400">—</td>
              </tr>
            {/* Dòng 3: Đã hủy */}
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="py-4 pl-4 font-semibold text-gray-900">SR-2024-0519</td>
                <td className="py-4">01/08/2024</td>
                <td className="py-4">18:30</td>
                <td className="py-4">Bàn W01</td>
                <td className="py-4">6 người</td>
                <td className="py-4">
                  <span className="px-3 py-1 text-xs font-bold text-red-600 bg-red-100 rounded-full">Đã hủy</span>
                </td>
                <td className="py-4 text-center text-gray-400">—</td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Xác nhận hủy bàn */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl transform transition-all">
            
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">Xác nhận hủy đặt bàn?</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Bạn có chắc chắn muốn hủy đặt bàn <span className="font-bold text-gray-800">SR-2024-0847</span>? Hành động này không thể hoàn tác.
            </p>

            <div className="flex space-x-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-1/2 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Không, giữ lại
              </button>
              
              {/* Gọi hàm handleConfirmCancel khi bấm nút này */}
              <button 
                onClick={handleConfirmCancel}
                className="w-1/2 py-2.5 bg-red-600 rounded-lg text-sm font-bold text-white hover:bg-red-700 transition-colors"
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