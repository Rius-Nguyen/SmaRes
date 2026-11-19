"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BookingStepper from '@/components/BookingStepper';
import DepositPaymentModal from '@/components/DepositPaymentModal';
import { useCart } from '@/app/context/CartContext';

interface SavedReservationState {
  reservationId: string;
  bookingCode: string;
  tableNumber: string;
  qr_token: string;
}

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

  const DEPOSIT_AMOUNT = 200000; // Tiền cọc giữ bàn cố định 200,000đ

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedReservation, setSavedReservation] = useState<SavedReservationState | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isProcessingDeposit, setIsProcessingDeposit] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const formatMoney = (val: number) => {
    return val.toLocaleString('vi-VN') + 'đ';
  };

  // Bước 1: Gọi POST /api/reservations trước để lấy mã đặt bàn thật từ Database
  const handleOpenDepositFlow = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Nếu đã có đơn được tạo trước đó trong phiên (ví dụ khách mở lại modal), tái sử dụng không tạo trùng
      if (savedReservation) {
        setIsDepositModalOpen(true);
        setIsSubmitting(false);
        return;
      }

      const tableIdParam = bookingInfo?.tableId || bookingInfo?.tableNumber || 'B05';
      const guestsCount =
        typeof bookingInfo?.guests === 'string'
          ? parseInt(bookingInfo.guests, 10) || 4
          : Number(bookingInfo?.guests) || 4;

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: tableIdParam,
          date: bookingInfo?.date || new Date().toISOString().split('T')[0],
          time: bookingInfo?.time || '19:00',
          guests: guestsCount,
          phone: bookingInfo?.phone || '0901234567',
          note: bookingInfo?.note || '',
        }),
      });

      const json = await res.json();

      // Xử lý lỗi nghiệp vụ mượt mà (VD: 409 trùng lịch): không throw, không console.error để tránh lỗi overlay
      if (!res.ok || !json.success) {
        setErrorMessage(json.message || 'Bàn ăn hoặc khung giờ đã chọn hiện không khả dụng. Vui lòng chọn bàn khác.');
        setIsSubmitting(false);
        return;
      }

      const resData = json.data;
      const reservationState: SavedReservationState = {
        reservationId: resData.id,
        bookingCode: resData.bookingCode,
        tableNumber: resData.tableNumber || tableIdParam,
        qr_token: resData.qr_token || `TK-${resData.tableNumber || tableIdParam}-${resData.bookingCode.slice(-4)}`,
      };

      setSavedReservation(reservationState);

      // Cập nhật thông tin đơn vào CartContext
      setBookingInfo((prev) => ({
        name: prev?.name || 'Khách hàng',
        phone: prev?.phone || '',
        email: prev?.email || '',
        date: prev?.date || '',
        time: prev?.time || '',
        guests: prev?.guests || 4,
        note: prev?.note || '',
        tableId: resData.tableId,
        tableNumber: reservationState.tableNumber,
        tableType: prev?.tableType || 'Khu trung tâm',
        tableCapacity: prev?.tableCapacity || 4,
        bookingCode: reservationState.bookingCode,
        reservationId: reservationState.reservationId,
        qr_token: reservationState.qr_token,
        depositAmount: DEPOSIT_AMOUNT,
      }));

      // Bước 2: Mở Modal thanh toán cọc với đúng bookingCode thật vừa nhận
      setIsDepositModalOpen(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Đã có lỗi xảy ra khi tạo đơn đặt bàn. Vui lòng thử lại hoặc chọn bàn khác.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bước 3: Khi khách bấm "Tôi đã chuyển khoản xong" trong Modal
  const handleConfirmDepositPayment = async () => {
    if (!savedReservation) return;

    setIsProcessingDeposit(true);
    try {
      // Gọi API POST /api/transactions tạo bản ghi giao dịch cọc
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: savedReservation.reservationId,
          amount: DEPOSIT_AMOUNT,
          provider: 'BANK_QR',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        console.warn('API transaction cảnh báo:', json.message);
      }

      // Cập nhật trạng thái paymentStatus trong context
      setBookingInfo((prev) => ({
        ...prev!,
        paymentStatus: 'PENDING',
        depositAmount: DEPOSIT_AMOUNT,
      }));

      setIsDepositModalOpen(false);
      router.push('/booking/success');
    } catch (err) {
      console.error('Lỗi khi gửi thông tin cọc:', err);
      // Vẫn cho phép điều hướng sang trang thành công nếu đã tạo reservation
      router.push('/booking/success');
    } finally {
      setIsProcessingDeposit(false);
    }
  };

  const handleCloseDepositModal = () => {
    setIsDepositModalOpen(false);
    // Nếu khách đóng modal sau khi đã tạo reservation thì chuyển sang trang thành công
    if (savedReservation) {
      router.push('/booking/success');
    }
  };

  if (isLoaded && !hasActiveBooking) {
    return (
      <main className="flex-1 bg-[#faf8f5] text-[#1c1917] flex flex-col min-h-screen">
        <BookingStepper currentStep={4} />
        <div className="max-w-xl mx-auto my-auto py-16 px-4 text-center">
          <div className="bg-white rounded-3xl p-8 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df]">
            <div className="w-14 h-14 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center mx-auto mb-4 border border-[#fde68a]">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#1c1917] mb-2">Chưa có thông tin đặt bàn</h1>
            <p className="text-stone-500 text-sm mb-6">
              Vui lòng hoàn thành thông tin bàn trước khi xem trang xác nhận.
            </p>
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 bg-[#14532d] hover:bg-[#15803d] text-white font-semibold px-6 py-3 rounded-xl shadow-xs text-sm transition-all"
            >
              <span>← Quay lại Bước 1</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[#faf8f5] text-[#1c1917] flex flex-col min-h-screen pb-20">
      {/* Workflow Stepper: Bước 4 */}
      <BookingStepper currentStep={4} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Tiêu đề trang */}
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#15803d] bg-[#f0fdf4] px-3.5 py-1.5 rounded-full border border-[#bbf7d0] inline-block mb-2">
            Bước 4 / 4 - Hoàn tất
          </span>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#1c1917]">
            Xác Nhận Đặt Bàn &amp; Thực Đơn
          </h1>
          <p className="text-sm md:text-base text-stone-600 mt-2 max-w-lg mx-auto leading-relaxed">
            Vui lòng kiểm tra lại thông tin bàn và thực đơn đã chọn trước khi hoàn tất đặt chỗ tại SmaRes.
          </p>
        </div>

        <div className="space-y-6">
          {/* KHỐI 1: THÔNG TIN BÀN ĂN */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df] p-6 md:p-8">
            <div className="flex items-center justify-between border-b border-[#ebe7df] pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-[#f0fdf4] text-[#14532d] flex items-center justify-center font-bold text-base border border-[#bbf7d0]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </span>
                <h2 className="font-serif font-bold text-xl text-[#14532d]">1. Chi tiết Bàn &amp; Thời gian</h2>
              </div>
              <Link
                href="/booking/diagram"
                className="text-xs sm:text-sm font-semibold text-[#14532d] hover:text-[#15803d] flex items-center gap-1 transition-colors"
              >
                <span>Sửa vị trí bàn</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div className="bg-[#faf8f5] p-4 rounded-xl border border-[#ebe7df]">
                <p className="text-xs text-stone-500 mb-1">Vị trí bàn ăn</p>
                <p className="font-serif font-bold text-stone-900 text-lg">
                  Bàn {bookingInfo?.tableNumber}{' '}
                  <span className="text-xs font-semibold text-[#15803d] bg-[#f0fdf4] px-2.5 py-0.5 rounded-full ml-1 border border-[#bbf7d0]">
                    {bookingInfo?.tableType}
                  </span>
                </p>
                <p className="text-xs text-stone-500 mt-1">Sức chứa: {bookingInfo?.tableCapacity || 4} chỗ ngồi</p>
              </div>

              <div className="bg-[#faf8f5] p-4 rounded-xl border border-[#ebe7df]">
                <p className="text-xs text-stone-500 mb-1">Thời gian dùng bữa</p>
                <p className="font-serif font-bold text-stone-900 text-lg">{bookingInfo?.time}</p>
                <p className="text-xs text-stone-500 mt-1">Ngày: {bookingInfo?.date}</p>
              </div>

              <div className="bg-[#faf8f5] p-4 rounded-xl border border-[#ebe7df] sm:col-span-2 lg:col-span-1">
                <p className="text-xs text-stone-500 mb-1">Khách hàng đặt bàn</p>
                <p className="font-serif font-bold text-stone-900 text-lg">{bookingInfo?.name}</p>
                <p className="text-xs text-stone-500 mt-1">
                  SĐT: {bookingInfo?.phone} • {bookingInfo?.guests}
                </p>
              </div>
            </div>

            {bookingInfo?.note && (
              <div className="mt-4 p-3.5 bg-[#fffbeb] rounded-xl border border-[#fde68a] text-xs sm:text-sm text-stone-700">
                <strong className="text-[#92400e] font-semibold">Ghi chú cho nhà hàng: </strong>
                <span>&ldquo;{bookingInfo.note}&rdquo;</span>
              </div>
            )}
          </div>

          {/* KHỐI 2: THỰC ĐƠN ĐẶT TRƯỚC */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df] p-6 md:p-8">
            <div className="flex items-center justify-between border-b border-[#ebe7df] pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-[#f0fdf4] text-[#14532d] flex items-center justify-center font-bold text-base border border-[#bbf7d0]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path>
                    <path d="M7 2v20"></path>
                    <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>
                  </svg>
                </span>
                <h2 className="font-serif font-bold text-xl text-[#14532d]">2. Thực đơn Đặt trước</h2>
              </div>
              <Link
                href="/booking/menu"
                className="text-xs sm:text-sm font-semibold text-[#14532d] hover:text-[#15803d] flex items-center gap-1 transition-colors"
              >
                <span>{cart.length > 0 ? 'Sửa món ăn' : '+ Chọn thêm món'}</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                </svg>
              </Link>
            </div>

            {cart.length === 0 ? (
              <div className="p-8 bg-[#faf8f5] rounded-2xl border border-[#ebe7df] text-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-xl shadow-xs mb-3 text-stone-400 border border-[#ebe7df]">
                  <svg className="w-5 h-5 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                  </svg>
                </div>
                <h3 className="font-serif font-bold text-stone-800 text-base">Không chọn món ăn trước</h3>
                <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-md mx-auto leading-relaxed">
                  Quý khách đã chọn bước gọi món trực tiếp tại nhà hàng. Đội ngũ nhân viên sẽ phục vụ menu chi tiết ngay khi quý khách ngồi vào bàn.
                </p>
                <Link
                  href="/booking/menu"
                  className="mt-4 inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#14532d] hover:text-[#15803d] underline decoration-[#14532d]/40 underline-offset-4"
                >
                  <span>Muốn chọn món trước để bếp trưởng chuẩn bị sẵn? Nhấp vào đây</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </Link>
              </div>
            ) : (
              <div>
                <div className="divide-y divide-[#ebe7df]">
                  {cart.map((item) => (
                    <div key={item._id} className="py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-16 h-16 rounded-xl object-cover border border-[#ebe7df] shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-serif font-bold text-base text-stone-900">{item.name}</h4>
                            {item.isPreOrderOnly && (
                              <span className="text-[11px] bg-[#fffbeb] text-[#92400e] font-semibold px-2 py-0.5 rounded-full border border-[#fde68a] flex items-center gap-1">
                                <svg className="w-3 h-3 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
                                </svg>
                                <span>Món đặc biệt</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-stone-500 mt-1">
                            {formatMoney(item.price)} × {item.quantity} phần
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-serif font-bold text-base text-[#d97706]">
                          {formatMoney(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {hasSpecialItems && (
                  <div className="mt-4 p-3.5 bg-[#fffbeb] rounded-xl border border-[#fde68a] text-xs sm:text-sm text-[#92400e] flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#d97706] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
                    </svg>
                    <span>
                      Các món đặc biệt đã được ghi chú vào đơn và sẽ được bếp trưởng sơ chế trước đúng giờ hẹn.
                    </span>
                  </div>
                )}

                <div className="border-t border-[#ebe7df] mt-6 pt-4 flex items-center justify-between text-base sm:text-lg">
                  <span className="font-semibold text-stone-800">Tổng tiền thực đơn đặt trước:</span>
                  <span className="font-serif font-bold text-[#d97706] text-2xl">{formatMoney(totalPrice)}</span>
                </div>
              </div>
            )}
          </div>

          {/* KHỐI 3: QUY ĐỊNH & LƯU Ý ĐẶT CHỖ */}
          <div className="bg-[#f0fdf4] rounded-2xl border border-[#bbf7d0] p-6 text-xs sm:text-sm text-[#14532d] space-y-2">
            <p className="font-bold text-base flex items-center gap-2">
              <svg className="w-4 h-4 text-[#15803d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>Quy định giữ bàn SmaRes:</span>
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-700 leading-relaxed">
              <li>Nhà hàng giữ bàn tối đa <strong>15 phút</strong> so với khung giờ đã hẹn ({bookingInfo?.time}).</li>
              <li>Quý khách có thể hủy hoặc thay đổi giờ đặt miễn phí trước ít nhất <strong>2 tiếng</strong>.</li>
              <li>Thanh toán thực đơn sẽ được thực hiện trực tiếp tại nhà hàng sau khi dùng bữa.</li>
            </ul>
          </div>

          {/* THÔNG BÁO LỖI NGHIỆP VỤ (VÍ DỤ TRÙNG BÀN 409) */}
          {errorMessage && (
            <div className="p-4 sm:p-5 bg-[#fffbeb] border border-[#fde68a] rounded-2xl text-[#92400e] text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center shrink-0 border border-[#fde68a]">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-stone-900 text-sm sm:text-base">{errorMessage}</p>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Khung giờ này đã có khách giữ chỗ trước. Quý khách vui lòng chọn bàn khác trên sơ đồ hoặc đổi khung giờ.
                  </p>
                </div>
              </div>
              <Link
                href="/booking/diagram"
                className="px-4 py-2.5 bg-[#14532d] hover:bg-[#15803d] text-white rounded-xl text-xs sm:text-sm font-semibold shrink-0 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-end sm:self-center"
              >
                <span>← Chọn bàn khác</span>
              </Link>
            </div>
          )}

          {/* NÚT HOÀN TẤT ĐẶT BÀN */}
          <div className="pt-3 flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/booking/menu"
              className="w-full sm:w-auto text-center font-semibold text-stone-700 hover:text-stone-900 px-6 py-4 rounded-xl border border-[#d6d0c4] hover:bg-stone-100 text-sm transition-colors"
            >
              ← Quay lại chọn món
            </Link>

            <button
              onClick={handleOpenDepositFlow}
              disabled={isSubmitting}
              className="flex-1 w-full bg-[#14532d] hover:bg-[#15803d] text-white font-semibold py-4 rounded-xl shadow-[0_8px_24px_-4px_rgba(20,83,45,0.45)] hover:shadow-[0_12px_28px_-4px_rgba(20,83,45,0.6)] text-base sm:text-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Đang xử lý tạo đơn đặt bàn...</span>
              ) : (
                <>
                  <span>Xác Nhận &amp; Thanh Toán Cọc Giữ Bàn</span>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL THANH TOÁN TIỀN CỌC (BANK QR) */}
      <DepositPaymentModal
        isOpen={isDepositModalOpen}
        onClose={handleCloseDepositModal}
        bookingCode={savedReservation?.bookingCode || bookingInfo?.bookingCode || ''}
        depositAmount={DEPOSIT_AMOUNT}
        onConfirmPayment={handleConfirmDepositPayment}
        isProcessing={isProcessingDeposit}
      />
    </main>
  );
}
