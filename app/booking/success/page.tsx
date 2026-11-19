"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
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
  const [dynamicQrDataUrl, setDynamicQrDataUrl] = useState<string>('');
  const [tableOrderUrl, setTableOrderUrl] = useState<string>('');

  useEffect(() => {
    // 1. Tạo hoặc lấy Token định danh phiên bàn ăn (khớp với tableNumber và bookingCode)
    const timeHash = Date.now().toString(36).toUpperCase();
    const resolvedToken =
      bookingInfo?.qr_token || `TK-${tableNumber}-${bookingCode.slice(-4)}-${timeHash}`;
    setQrToken(resolvedToken);

    // 2. Đường dẫn thực đơn tại bàn (khớp 100% với searchParams 'table' của app/(customer)/table-menu/page.tsx)
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const orderUrl = `${origin}/table-menu?table=${encodeURIComponent(tableNumber)}&token=${encodeURIComponent(resolvedToken)}&code=${encodeURIComponent(bookingCode)}`;
    setTableOrderUrl(orderUrl);

    // 3. Sinh mã QR động bằng thư viện qrcode (chuẩn màu thương hiệu Heritage Jade)
    QRCode.toDataURL(orderUrl, {
      width: 280,
      margin: 1.5,
      color: {
        dark: '#14532D', // Heritage Jade
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        setDynamicQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Lỗi khi sinh mã QR động cho bàn:', err);
      });

    // 4. Lưu phiên QR trên Server qua /api/qr (nếu có)
    fetch(`/api/qr?tableId=${encodeURIComponent(tableNumber)}`)
      .then((res) => res.json())
      .catch(() => {});

    // 5. Tự động đẩy đơn đặt bàn và món đặt trước sang API /api/orders của Staff (TK-173)
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
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_-4px_rgba(28,25,23,0.08)] p-6 sm:p-8 max-w-lg w-full text-center border border-[#ebe7df]">
        {/* Icon Dấu tích xanh */}
        <div className="w-16 h-16 bg-[#14532d] text-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_8px_20px_-4px_rgba(20,83,45,0.4)] border border-[#22c55e]/30">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>

        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#14532d] mb-1">
          Đặt bàn thành công!
        </h1>
        <p className="text-stone-500 text-xs sm:text-sm mb-6">
          Cảm ơn bạn đã lựa chọn trải nghiệm ẩm thực tại SmaRes
        </p>

        {/* Khối thông tin chi tiết & QR Code động */}
        <div className="bg-[#faf8f5] border border-[#ebe7df] rounded-2xl p-4 sm:p-5 text-left mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex-1 w-full">
            <p className="text-[11px] text-stone-500 font-bold uppercase tracking-wider mb-1">
              MÃ ĐẶT CHỖ CHÍNH THỨC
            </p>
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
              {bookingInfo?.depositAmount ? (
                <li>
                  <span className="font-semibold text-stone-800">Tiền cọc giữ bàn:</span>{' '}
                  <span className="text-[#15803d] font-bold">
                    {bookingInfo.depositAmount.toLocaleString('vi-VN')}đ (Đang xác nhận)
                  </span>
                </li>
              ) : null}
              <li>
                <span className="font-semibold text-stone-800">Địa chỉ:</span> SmaRes - Quận 1, TP.HCM
              </li>
            </ul>
          </div>

          {/* QR Code động riêng biệt cho từng bàn ăn (Hiển thị đầy đủ cả mobile & desktop) */}
          <div className="flex flex-col items-center justify-center p-2.5 bg-white border border-[#ebe7df] rounded-2xl shadow-xs shrink-0 w-32 sm:w-36">
            {dynamicQrDataUrl ? (
              <img
                src={dynamicQrDataUrl}
                alt={`Mã QR Bàn ${tableNumber}`}
                className="w-28 h-28 sm:w-32 sm:h-32 object-contain rounded-lg"
              />
            ) : (
              <div className="w-28 h-28 sm:w-32 sm:h-32 bg-stone-100 animate-pulse rounded-lg flex items-center justify-center text-[10px] text-stone-400">
                Đang tạo QR...
              </div>
            )}
            <span className="mt-1.5 text-[11px] font-bold text-[#14532d] bg-[#f0fdf4] px-2.5 py-0.5 rounded-full border border-[#bbf7d0]">
              Bàn {tableNumber}
            </span>
          </div>
        </div>

        {/* Hướng dẫn quét mã QR */}
        <p className="text-[11px] text-stone-500 mb-5 text-center leading-relaxed bg-[#f0fdf4] py-2 px-3 rounded-xl border border-[#bbf7d0] text-[#14532d]">
          💡 <strong>Khi đến nhà hàng:</strong> Quý khách chỉ cần dùng camera điện thoại quét mã QR trên để mở ngay thực đơn gọi món tại bàn {tableNumber}.
        </p>

        {/* Các nút hành động */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <button
            type="button"
            onClick={() => window.print()}
            className="py-2.5 border border-[#d6d0c4] rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            <span>In phiếu</span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(bookingCode);
              alert('Đã sao chép mã đặt bàn: ' + bookingCode);
            }}
            className="py-2.5 border border-[#d6d0c4] rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
            </svg>
            <span>Sao chép mã</span>
          </button>

          {dynamicQrDataUrl ? (
            <a
              href={dynamicQrDataUrl}
              download={`SmaRes_QR_${tableNumber}_${bookingCode}.png`}
              className="py-2.5 border border-[#d6d0c4] rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Lưu mã QR</span>
            </a>
          ) : (
            <button
              disabled
              className="py-2.5 border border-[#d6d0c4] rounded-xl text-xs font-semibold text-stone-400 opacity-60 flex items-center justify-center gap-1.5"
            >
              <span>Lưu mã QR</span>
            </button>
          )}
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
