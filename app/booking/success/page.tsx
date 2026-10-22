"use client";

import Link from 'next/link';
import { useCart } from '@/app/context/CartContext';

export default function BookingSuccessPage() {
  const { bookingInfo, cart, totalItems, totalPrice } = useCart();

  const bookingCode = bookingInfo?.bookingCode || 'SR-2026-0847';
  const tableNumber = bookingInfo?.tableNumber || 'B05';
  const guests = bookingInfo?.guests || '4 người';
  const time = bookingInfo?.time || '19:00';
  const date = bookingInfo?.date || '2026-10-25';
  const name = bookingInfo?.name || 'Quý khách';

  return (
    <main className="flex-1 flex items-center justify-center bg-gray-100 py-16 px-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-lg w-full text-center border border-gray-100">
        {/* Icon Dấu tích xanh */}
        <div className="w-16 h-16 bg-green-700 text-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-md">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>

        <h1 className="text-3xl font-bold font-sans text-green-800 mb-1">Đặt bàn thành công!</h1>
        <p className="text-gray-500 text-sm mb-6">
          Cảm ơn bạn đã lựa chọn trải nghiệm ẩm thực tại SmaRes
        </p>

        {/* Khối thông tin chi tiết & QR Code */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-left mb-6 flex justify-between items-center gap-4">
          <div className="flex-1">
            <p className="text-[11px] text-gray-500 font-bold uppercase mb-1">MÃ ĐẶT CHỖ CHÍNH THỨC</p>
            <p className="text-xl font-bold text-gray-900 mb-3 tracking-wider text-green-800 font-mono">
              {bookingCode}
            </p>

            <ul className="text-xs space-y-1.5 text-gray-600">
              <li>
                <span className="font-semibold text-gray-800">Khách hàng:</span> {name}
              </li>
              <li>
                <span className="font-semibold text-gray-800">Vị trí:</span> Bàn {tableNumber} ({guests})
              </li>
              <li>
                <span className="font-semibold text-gray-800">Thời gian:</span> {time}, {date}
              </li>
              <li>
                <span className="font-semibold text-gray-800">Thực đơn đặt trước:</span>{' '}
                {totalItems > 0 ? (
                  <span className="text-green-700 font-bold">
                    {totalItems} món ({totalPrice.toLocaleString('vi-VN')}đ)
                  </span>
                ) : (
                  <span className="text-gray-500 italic">Gọi món tại bàn</span>
                )}
              </li>
              <li>
                <span className="font-semibold text-gray-800">Địa chỉ:</span> SmaRes - Quận 1, TP.HCM
              </li>
            </ul>
          </div>

          {/* QR Code */}
          <div className="hidden sm:flex flex-col items-center justify-center w-24 h-24 bg-white border border-gray-200 p-1.5 rounded-xl shadow-sm shrink-0">
            <img src="/foods/QR.jpg" alt="Mã QR Đặt bàn" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Các nút hành động */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => window.print()}
            className="py-2.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>🖨️</span> In / Lưu phiếu
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(bookingCode);
              alert('Đã sao chép mã đặt bàn: ' + bookingCode);
            }}
            className="py-2.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>📋</span> Sao chép mã
          </button>
        </div>

        <Link
          href="/history"
          className="interactive-btn block w-full bg-green-800 text-white font-bold py-3.5 rounded-xl hover:bg-green-900 transition-colors shadow-md text-sm"
        >
          Xem lịch sử đặt bàn & đơn hàng
        </Link>
      </div>
    </main>
  );
}