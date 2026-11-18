"use client";

import { useState, useEffect } from 'react';
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

  const [qrToken, setQrToken] = useState<string>('');
  const [dynamicQrUrl, setDynamicQrUrl] = useState<string>('/foods/QR.jpg');

  useEffect(() => {
    // 1. Thuật toán tạo Token định danh phiên và mã QR động gắn liền với Table ID (TK-141)
    const timeHash = Date.now().toString(36).toUpperCase();
    const generatedToken = `TK-${tableNumber}-${bookingCode.slice(-4)}-${timeHash}`;
    setQrToken(generatedToken);

    // Đường dẫn khi khách quét mã QR tại bàn (gồm Table ID, Token và Mã đặt chỗ)
    const tableOrderUrl = `${window.location.origin}/menu?tableId=${tableNumber}&token=${generatedToken}&code=${bookingCode}`;
    const qrApiImage = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(tableOrderUrl)}`;
    setDynamicQrUrl(qrApiImage);

    // 2. Gọi API /api/qr (nếu đã tạo ở bước trước) để lưu phiên QR trên Server
    fetch(`/api/qr?tableId=${tableNumber}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData?.data?.token) {
          setQrToken(resData.data.token);
          setDynamicQrUrl(resData.data.qrImageUrl);
        }
      })
      .catch(() => {});

    // 3. Tự động đẩy đơn đặt bàn và món đặt trước sang API /api/orders của Staff (TK-173)
    if (Array.isArray(cart) && cart.length > 0) {
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: bookingCode,
          phone: bookingInfo?.phone || '0335430915',
          totalAmount: totalPrice,
          status: 'PENDING',
          items: cart.map((item: any) => ({
            name: item.name,
            price: Number(item.price || 0),
            quantity: Number(item.quantity || 1),
          })),
        }),
      }).catch(() => {});
    }
  }, [bookingCode, tableNumber, cart, totalPrice, bookingInfo]);

  return (
    <main className="flex-1 flex items-center justify-center bg-[#faf8f5] text-[#1c1917] py-16 px-4">
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_-4px_rgba(28,25,23,0.08)] p-8 max-w-lg w-full text-center border border-[#ebe7df]">
        {/* Icon Dấu tích xanh */}
        <div className="w-16 h-16 bg-[#14532d] text-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_8px_20px_-4px_rgba(20,83,45,0.4)] border border-[#22c55e]/30">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>

        <h1 className="text-3xl font-serif font-bold text-[#14532d] mb-1">Đặt bàn thành công!</h1>
        <p className="text-stone-500 text-sm mb-6">
          Cảm ơn bạn đã lựa chọn trải nghiệm ẩm thực tại SmaRes
        </p>

        {/* Khối thông tin chi tiết & QR Code */}
        <div className="bg-[#faf8f5] border border-[#ebe7df] rounded-2xl p-5 text-left mb-6 flex justify-between items-center gap-4">
          <div className="flex-1">
            <p className="text-[11px] text-stone-500 font-bold uppercase tracking-wider mb-1">MÃ ĐẶT CHỖ CHÍNH THỨC</p>
            <p className="text-xl font-bold mb-3 tracking-wider text-[#14532d] font-mono">
              {bookingCode}
            </p>

            <ul className="text-xs space-y-1.5 text-stone-600">
              <li>
                <span className="font-semibold text-stone-800">Khách hàng:</span> {name}
              </li>
              <li>
                <span className="font-semibold text-stone-800">Vị trí:</span> Bàn {tableNumber} ({guests})
              </li>
              <li>
                <span className="font-semibold text-stone-800">Thời gian:</span> {time}, {date}
              </li>
              <li>
                <span className="font-semibold text-stone-800">Thực đơn đặt trước:</span>{' '}
                {totalItems > 0 ? (
                  <span className="text-[#d97706] font-bold">
                    {totalItems} món ({totalPrice.toLocaleString('vi-VN')}đ)
                  </span>
                ) : (
                  <span className="text-stone-400 italic">Gọi món tại bàn</span>
                )}
              </li>
              <li>
                <span className="font-semibold text-stone-800">Địa chỉ:</span> SmaRes - Quận 1, TP.HCM
              </li>
            </ul>
          </div>

          {/* QR Code */}
          <div className="hidden sm:flex flex-col items-center justify-center w-24 h-24 bg-white border border-[#ebe7df] p-1.5 rounded-xl shadow-xs shrink-0">
            <img src="/foods/QR.jpg" alt="Mã QR Đặt bàn" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Các nút hành động */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => window.print()}
            className="py-2.5 border border-[#d6d0c4] rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <svg className="w-4 h-4 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            <span>In / Lưu phiếu</span>
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(bookingCode);
              alert('Đã sao chép mã đặt bàn: ' + bookingCode);
            }}
            className="py-2.5 border border-[#d6d0c4] rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <svg className="w-4 h-4 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
            </svg>
            <span>Sao chép mã</span>
          </button>
        </div>

        <Link
          href="/history"
          className="block w-full bg-[#14532d] hover:bg-[#15803d] text-white font-semibold py-3.5 rounded-xl shadow-[0_8px_20px_-4px_rgba(20,83,45,0.4)] transition-all text-sm"
        >
          Xem lịch sử đặt bàn &amp; đơn hàng
        </Link>
      </div>
    </main>
  );
}