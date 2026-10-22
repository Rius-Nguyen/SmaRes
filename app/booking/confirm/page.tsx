"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BookingStepper from '@/components/BookingStepper';
import { useCart } from '@/app/context/CartContext';

export default function BookingConfirmPage() {
  const router = useRouter();
  const {
    cart,
    totalItems,
    totalPrice,
    bookingInfo,
    setBookingInfo,
    hasActiveBooking,
    isLoaded,
    hasSpecialItems,
  } = useCart();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatMoney = (val: number) => {
    return val.toLocaleString('vi-VN') + 'đ';
  };

  const handleFinalConfirm = async () => {
    setIsSubmitting(true);

    try {
      // Tạo mã đặt bàn ngẫu nhiên chuẩn SmaRes
      const randomCode = 'SR-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

      // Cập nhật mã booking vào context
      setBookingInfo((prev) => ({
        name: prev?.name || 'Khách hàng',
        phone: prev?.phone || '',
        email: prev?.email || '',
        date: prev?.date || '',
        time: prev?.time || '',
        guests: prev?.guests || 4,
        note: prev?.note || '',
        tableNumber: prev?.tableNumber || 'B05',
        tableType: prev?.tableType || 'Khu trung tâm',
        tableCapacity: prev?.tableCapacity || 4,
        bookingCode: randomCode,
      }));

      // Chuyển sang trang đặt bàn thành công
      router.push('/booking/success');
    } catch (err) {
      console.error('Lỗi khi hoàn tất đặt bàn:', err);
      setIsSubmitting(false);
    }
  };

  if (isLoaded && !hasActiveBooking) {
    return (
      <main className="flex-1 bg-gray-50 flex flex-col min-h-screen">
        <BookingStepper currentStep={4} />
        <div className="max-w-xl mx-auto my-auto py-16 px-4 text-center">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Chưa có thông tin đặt bàn</h1>
            <p className="text-gray-500 text-sm mb-6">
              Vui lòng hoàn thành thông tin bàn trước khi xem trang xác nhận.
            </p>
            <Link
              href="/booking"
              className="inline-block bg-green-800 text-white font-bold px-6 py-3 rounded-xl hover:bg-green-900 text-sm"
            >
              ← Quay lại Bước 1
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-gray-50 flex flex-col min-h-screen pb-16">
      {/* Workflow Stepper: Bước 4 */}
      <BookingStepper currentStep={4} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Tiêu đề trang */}
        <div className="text-center mb-8">
          <span className="text-sm font-bold uppercase tracking-wider text-green-700 bg-green-50 px-3.5 py-1.5 rounded-full border border-green-200 inline-block mb-2">
            Bước 4 / 4 - Hoàn tất
          </span>
          <h1 className="text-3xl md:text-4xl font-bold font-sans text-gray-900">
            Xác Nhận Đặt Bàn & Thực Đơn
          </h1>
          <p className="text-base text-gray-600 mt-2 max-w-lg mx-auto">
            Vui lòng kiểm tra lại thông tin bàn và thực đơn đã chọn trước khi hoàn tất đặt chỗ tại SmaRes
          </p>
        </div>

        <div className="space-y-6">
          {/* KHỐI 1: THÔNG TIN BÀN ĂN */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
            <div className="flex items-center justify-between border-b pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-lg bg-green-50 text-green-800 flex items-center justify-center font-bold text-base border border-green-200">
                  📍
                </span>
                <h2 className="font-bold text-xl text-gray-900">1. Chi tiết Bàn & Thời gian</h2>
              </div>
              <Link
                href="/booking/diagram"
                className="text-sm font-semibold text-green-700 hover:text-green-800 hover:underline flex items-center gap-1"
              >
                <span>Sửa vị trí bàn</span>
                <span>✏️</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-base">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Vị trí bàn ăn</p>
                <p className="font-bold text-gray-900 text-lg">
                  Bàn {bookingInfo?.tableNumber}{' '}
                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full ml-1">
                    {bookingInfo?.tableType}
                  </span>
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Sức chứa: {bookingInfo?.tableCapacity || 4} chỗ ngồi</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Thời gian dùng bữa</p>
                <p className="font-bold text-gray-900 text-lg">{bookingInfo?.time}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Ngày: {bookingInfo?.date}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 sm:col-span-2 lg:col-span-1">
                <p className="text-sm text-gray-500 mb-1">Khách hàng đặt bàn</p>
                <p className="font-bold text-gray-900 text-lg">{bookingInfo?.name}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  SĐT: {bookingInfo?.phone} • {bookingInfo?.guests}
                </p>
              </div>
            </div>

            {bookingInfo?.note && (
              <div className="mt-4 p-3.5 bg-amber-50/60 rounded-xl border border-amber-100 text-sm text-gray-700">
                <strong className="text-amber-900 font-semibold">Ghi chú cho nhà hàng: </strong>
                <span>&ldquo;{bookingInfo.note}&rdquo;</span>
              </div>
            )}
          </div>

          {/* KHỐI 2: THỰC ĐƠN ĐẶT TRƯỚC */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
            <div className="flex items-center justify-between border-b pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-lg bg-green-50 text-green-800 flex items-center justify-center font-bold text-base border border-green-200">
                  🍽️
                </span>
                <h2 className="font-bold text-xl text-gray-900">2. Thực đơn Đặt trước</h2>
              </div>
              <Link
                href="/booking/menu"
                className="text-sm font-semibold text-green-700 hover:text-green-800 hover:underline flex items-center gap-1"
              >
                <span>{cart.length > 0 ? 'Sửa món ăn' : '+ Chọn thêm món'}</span>
                <span>✏️</span>
              </Link>
            </div>

            {cart.length === 0 ? (
              <div className="p-8 bg-gray-50 rounded-2xl border border-gray-200 text-center">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto text-2xl shadow-sm mb-3 text-gray-400">
                  📝
                </div>
                <h3 className="font-bold text-gray-800 text-base">Không chọn món ăn trước</h3>
                <p className="text-sm text-gray-600 mt-1 max-w-md mx-auto leading-relaxed">
                  Quý khách đã chọn bước gọi món trực tiếp tại nhà hàng. Đội ngũ nhân viên sẽ phục vụ menu chi tiết ngay khi quý khách ngồi vào bàn.
                </p>
                <Link
                  href="/booking/menu"
                  className="mt-4 inline-block text-sm font-bold text-green-700 hover:text-green-800 underline"
                >
                  Muốn chọn món trước để bếp trưởng chuẩn bị sẵn? Nhấp vào đây
                </Link>
              </div>
            ) : (
              <div>
                <div className="divide-y divide-gray-100">
                  {cart.map((item) => (
                    <div key={item._id} className="py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-base text-gray-900">{item.name}</h4>
                            {item.isPreOrderOnly && (
                              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                                👑 Món đặc biệt
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatMoney(item.price)} × {item.quantity} phần
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-base text-gray-900">
                          {formatMoney(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {hasSpecialItems && (
                  <div className="mt-4 p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-900 flex items-center gap-2">
                    <span className="text-lg">👑</span>
                    <span>
                      Các món đặc biệt đã được ghi chú vào đơn và sẽ được bếp trưởng sơ chế trước đúng giờ hẹn.
                    </span>
                  </div>
                )}

                <div className="border-t border-gray-200 mt-6 pt-4 flex items-center justify-between text-lg">
                  <span className="font-bold text-gray-800">Tổng tiền thực đơn đặt trước:</span>
                  <span className="font-bold text-green-800 text-2xl">{formatMoney(totalPrice)}</span>
                </div>
              </div>
            )}
          </div>

          {/* KHỐI 3: QUY ĐỊNH & LƯU Ý ĐẶT CHỖ */}
          <div className="bg-emerald-50/60 rounded-2xl border border-emerald-200 p-6 text-sm text-emerald-950 space-y-2">
            <p className="font-bold text-emerald-900 text-base flex items-center gap-2">
              <span>📌</span> Quy định giữ bàn SmaRes:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-emerald-900/90 leading-relaxed">
              <li>Nhà hàng giữ bàn tối đa <strong>15 phút</strong> so với khung giờ đã hẹn ({bookingInfo?.time}).</li>
              <li>Quý khách có thể hủy hoặc thay đổi giờ đặt miễn phí trước ít nhất <strong>2 tiếng</strong>.</li>
              <li>Thanh toán thực đơn sẽ được thực hiện trực tiếp tại nhà hàng sau khi dùng bữa.</li>
            </ul>
          </div>

          {/* NÚT HOÀN TẤT ĐẶT BÀN */}
          <div className="pt-3 flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/booking/menu"
              className="interactive-btn w-full sm:w-auto text-center font-semibold text-gray-700 hover:text-gray-900 px-6 py-4 rounded-xl border border-gray-300 hover:bg-gray-100 text-base transition-colors"
            >
              ← Quay lại chọn món
            </Link>

            <button
              onClick={handleFinalConfirm}
              disabled={isSubmitting}
              className="interactive-btn flex-1 w-full bg-green-800 hover:bg-green-900 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl text-lg transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Đang xử lý đặt bàn...</span>
              ) : (
                <>
                  <span>Xác Nhận & Hoàn Tất Đặt Bàn Ngay</span>
                  <span>✓</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
