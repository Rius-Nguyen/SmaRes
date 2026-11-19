"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import BookingStepper from '@/components/BookingStepper';
import { useCart } from '@/app/context/CartContext';

interface CreatedReservationSnapshot {
  slotKey: string;
  bookingCode: string;
  tableId: string;
  tableNumber: string;
  date: string;
  time: string;
  guests: number;
  name: string;
  phone: string;
}

interface ReservationApiResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    bookingCode: string;
    tableId: string;
    tableNumber: string;
    customerName: string;
    date: string;
    time: string;
    guests: number;
    phone: string;
    note?: string;
  };
}

interface OrderApiResponse {
  success: boolean;
  message?: string;
  orderId?: string;
  orderCode?: string;
  totalAmount?: number;
}

const PENDING_RESERVATION_KEY = 'smares_pending_reservation';

function normalizeGuests(value: string | number | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 1) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const match = value.match(/\d+/);
    if (match) {
      const parsed = Number.parseInt(match[0], 10);
      if (Number.isFinite(parsed) && parsed >= 1) {
        return parsed;
      }
    }
  }
  return 4;
}

function readPendingReservation(expectedSlotKey: string): CreatedReservationSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_RESERVATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const rec = parsed as Partial<CreatedReservationSnapshot>;
    if (
      rec.slotKey === expectedSlotKey &&
      typeof rec.bookingCode === 'string' &&
      rec.bookingCode
    ) {
      return {
        slotKey: rec.slotKey,
        bookingCode: rec.bookingCode,
        tableId: typeof rec.tableId === 'string' ? rec.tableId : '',
        tableNumber: typeof rec.tableNumber === 'string' ? rec.tableNumber : '',
        date: typeof rec.date === 'string' ? rec.date : '',
        time: typeof rec.time === 'string' ? rec.time : '',
        guests: typeof rec.guests === 'number' ? rec.guests : 4,
        name: typeof rec.name === 'string' ? rec.name : '',
        phone: typeof rec.phone === 'string' ? rec.phone : '',
      };
    }
  } catch {
    return null;
  }
  return null;
}

export default function BookingConfirmPage() {
  const router = useRouter();
  const {
    cart,
    totalItems,
    totalPrice,
    bookingInfo,
    clearCart,
    clearBookingInfo,
    hasActiveBooking,
    isLoaded,
    hasSpecialItems,
  } = useCart();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorActionTarget, setErrorActionTarget] = useState<'diagram' | 'menu' | null>(null);

  const guestsCount = normalizeGuests(bookingInfo?.guests);

  const formatMoney = (val: number) => {
    return val.toLocaleString('vi-VN') + 'đ';
  };

  const handleFinalConfirm = async () => {
    if (!bookingInfo || !bookingInfo.tableNumber || !bookingInfo.date || !bookingInfo.time || !bookingInfo.phone) {
      setErrorMsg('Thiếu thông tin đặt bàn bắt buộc. Vui lòng kiểm tra lại từ Bước 1.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setErrorActionTarget(null);

    let selectedTableId: string | undefined;
    try {
      const storedId = sessionStorage.getItem('smares_selected_table_id');
      if (storedId && storedId.trim()) {
        selectedTableId = storedId.trim();
      }
    } catch {
      selectedTableId = undefined;
    }

    const slotKey = `${selectedTableId || bookingInfo.tableNumber}|${bookingInfo.date}|${bookingInfo.time}|${bookingInfo.phone}`;

    try {
      let reservationSnapshot = readPendingReservation(slotKey);

      if (!reservationSnapshot) {
        const resResponse = await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableId: selectedTableId,
            tableNumber: bookingInfo.tableNumber,
            date: bookingInfo.date,
            time: bookingInfo.time,
            guests: Number(guestsCount),
            phone: bookingInfo.phone,
            customerName: bookingInfo.name,
            note: bookingInfo.note || '',
          }),
        });

        const resData = (await resResponse.json()) as ReservationApiResponse;

        if (!resResponse.ok || !resData.success || !resData.data) {
          setErrorActionTarget('diagram');
          if (resResponse.status === 409) {
            setErrorMsg(
              resData.message ||
                'Bàn và khung giờ này vừa có khách đặt trước. Vui lòng chọn bàn khác hoặc đổi giờ.'
            );
          } else {
            setErrorMsg(
              resData.message || 'Không thể hoàn tất đặt bàn. Vui lòng kiểm tra lại thông tin.'
            );
          }
          setIsSubmitting(false);
          return;
        }

        reservationSnapshot = {
          slotKey,
          bookingCode: resData.data.bookingCode,
          tableId: String(resData.data.tableId || selectedTableId || ''),
          tableNumber: resData.data.tableNumber || bookingInfo.tableNumber,
          date: resData.data.date || bookingInfo.date,
          time: resData.data.time || bookingInfo.time,
          guests: resData.data.guests ?? guestsCount,
          name: resData.data.customerName || bookingInfo.name,
          phone: resData.data.phone || bookingInfo.phone,
        };
      }

      if (cart.length > 0) {
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableNumber: reservationSnapshot.tableNumber,
            tableId: reservationSnapshot.tableId || undefined,
            phone: reservationSnapshot.phone,
            notes: bookingInfo.note || '',
            items: cart.map((item) => ({
              menuItemId: item._id,
              quantity: item.quantity,
              customizations: item.customizations,
            })),
          }),
        });

        const orderData = (await orderResponse.json()) as OrderApiResponse;

        if (!orderResponse.ok || !orderData.success) {
          try {
            sessionStorage.setItem(PENDING_RESERVATION_KEY, JSON.stringify(reservationSnapshot));
          } catch {
            // Ignore storage errors
          }
          setErrorActionTarget('menu');
          setErrorMsg(
            orderData.message
              ? `Đặt bàn (${reservationSnapshot.bookingCode}) đã được giữ, nhưng thực đơn đặt trước gặp lỗi: ${orderData.message}. Vui lòng chỉnh sửa món hoặc thử xác nhận lại.`
              : `Đặt bàn (${reservationSnapshot.bookingCode}) đã được giữ, nhưng không thể gửi thực đơn đặt trước. Vui lòng thử lại.`
          );
          setIsSubmitting(false);
          return;
        }
      }

      const lastBookingPayload = {
        bookingCode: reservationSnapshot.bookingCode,
        tableId: reservationSnapshot.tableId,
        tableNumber: reservationSnapshot.tableNumber,
        tableType: bookingInfo.tableType || '',
        guests: reservationSnapshot.guests,
        date: reservationSnapshot.date,
        time: reservationSnapshot.time,
        name: reservationSnapshot.name,
        phone: reservationSnapshot.phone,
        totalPrice,
        itemCount: totalItems,
      };

      try {
        sessionStorage.setItem('smares_last_booking', JSON.stringify(lastBookingPayload));
        sessionStorage.removeItem('smares_selected_table_id');
        sessionStorage.removeItem(PENDING_RESERVATION_KEY);
      } catch {
        // Ignore storage errors
      }

      setIsRedirecting(true);
      clearCart();
      clearBookingInfo();

      router.push(
        `/booking/success?code=${encodeURIComponent(reservationSnapshot.bookingCode)}&table=${encodeURIComponent(reservationSnapshot.tableNumber)}`
      );
    } catch {
      setErrorMsg('Lỗi kết nối tới máy chủ. Vui lòng thử lại sau giây lát.');
      setIsSubmitting(false);
    }
  };

  if (isLoaded && !hasActiveBooking && !isRedirecting) {
    return (
      <main className="flex-1 bg-[#faf8f5] text-[#1c1917] flex flex-col min-h-screen">
        <BookingStepper currentStep={4} />
        <div className="max-w-xl mx-auto my-auto py-16 px-4 text-center">
          <div className="bg-white rounded-3xl p-8 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df]">
            <div className="w-14 h-14 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center mx-auto mb-4 border border-[#fde68a]">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#1c1917] mb-2">
              Chưa có thông tin đặt bàn
            </h1>
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
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <h2 className="font-serif font-bold text-xl text-[#14532d]">
                  1. Chi tiết Bàn &amp; Thời gian
                </h2>
              </div>
              <Link
                href="/booking/diagram"
                className="text-xs sm:text-sm font-semibold text-[#14532d] hover:text-[#15803d] flex items-center gap-1 transition-colors"
              >
                <span>Sửa vị trí bàn</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div className="bg-[#faf8f5] p-4 rounded-xl border border-[#ebe7df]">
                <p className="text-xs text-stone-500 mb-1">Vị trí bàn ăn</p>
                <p className="font-serif font-bold text-stone-900 text-lg">
                  Bàn {bookingInfo?.tableNumber}{' '}
                  {bookingInfo?.tableType && (
                    <span className="text-xs font-semibold text-[#15803d] bg-[#f0fdf4] px-2.5 py-0.5 rounded-full ml-1 border border-[#bbf7d0]">
                      {bookingInfo.tableType}
                    </span>
                  )}
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  Sức chứa: {bookingInfo?.tableCapacity || 4} chỗ ngồi
                </p>
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
                  SĐT: {bookingInfo?.phone} • {guestsCount} người
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
                    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                    <path d="M7 2v20" />
                    <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
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
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </Link>
            </div>

            {cart.length === 0 ? (
              <div className="p-8 bg-[#faf8f5] rounded-2xl border border-[#ebe7df] text-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-xl shadow-xs mb-3 text-stone-400 border border-[#ebe7df]">
                  <svg className="w-5 h-5 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  </svg>
                </div>
                <h3 className="font-serif font-bold text-stone-800 text-base">
                  Không chọn món ăn trước
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-md mx-auto leading-relaxed">
                  Quý khách đã chọn bước gọi món trực tiếp tại nhà hàng. Đội ngũ nhân viên sẽ phục vụ menu chi tiết ngay khi quý khách ngồi vào bàn.
                </p>
                <Link
                  href="/booking/menu"
                  className="mt-4 inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#14532d] hover:text-[#15803d] underline decoration-[#14532d]/40 underline-offset-4"
                >
                  <span>Muốn chọn món trước để bếp trưởng chuẩn bị sẵn? Nhấp vào đây</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ) : (
              <div>
                <div className="divide-y divide-[#ebe7df]">
                  {cart.map((item, idx) => (
                    <div key={`${item._id}-${idx}`} className="py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <Image
                          src={item.imageUrl || '/foods/pho_bo.jpg'}
                          alt={item.name}
                          width={64}
                          height={64}
                          unoptimized
                          className="w-16 h-16 rounded-xl object-cover border border-[#ebe7df] shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-serif font-bold text-base text-stone-900">{item.name}</h4>
                            {item.isPreOrderOnly && (
                              <span className="text-[11px] bg-[#fffbeb] text-[#92400e] font-semibold px-2 py-0.5 rounded-full border border-[#fde68a] flex items-center gap-1">
                                <svg className="w-3 h-3 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
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
                      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
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
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>Quy định giữ bàn SmaRes:</span>
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-700 leading-relaxed">
              <li>
                Nhà hàng giữ bàn tối đa <strong>15 phút</strong> so với khung giờ đã hẹn ({bookingInfo?.time}).
              </li>
              <li>
                Quý khách có thể hủy đặt bàn miễn phí trước ít nhất <strong>60 phút</strong> trước giờ hẹn (giờ Việt Nam +07:00).
              </li>
              <li>
                Thanh toán thực đơn sẽ được thực hiện trực tiếp tại nhà hàng sau khi dùng bữa.
              </li>
            </ul>
          </div>

          {/* ERROR BANNER */}
          {errorMsg && (
            <div className="p-4 sm:p-5 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{errorMsg}</span>
              </div>
              {errorActionTarget === 'diagram' ? (
                <Link
                  href="/booking/diagram"
                  className="text-xs font-semibold bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-xl whitespace-nowrap text-center transition-colors"
                >
                  Chọn lại bàn →
                </Link>
              ) : errorActionTarget === 'menu' ? (
                <Link
                  href="/booking/menu"
                  className="text-xs font-semibold bg-white border border-red-300 hover:bg-red-100 text-red-800 px-4 py-2 rounded-xl whitespace-nowrap text-center transition-colors"
                >
                  Sửa món ăn
                </Link>
              ) : null}
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
              type="button"
              onClick={handleFinalConfirm}
              disabled={isSubmitting || isRedirecting}
              className="flex-1 w-full bg-[#14532d] hover:bg-[#15803d] disabled:opacity-70 text-white font-semibold py-4 rounded-xl shadow-[0_8px_24px_-4px_rgba(20,83,45,0.45)] hover:shadow-[0_12px_28px_-4px_rgba(20,83,45,0.6)] text-base sm:text-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting || isRedirecting ? (
                <span>Đang xử lý đặt bàn...</span>
              ) : (
                <>
                  <span>Xác Nhận &amp; Hoàn Tất Đặt Bàn Ngay</span>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
