"use client";

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import BookingStepper from '@/components/BookingStepper';
import LockCountdownBanner from '@/components/booking/LockCountdownBanner';
import DepositPaymentModal, {
  type DepositBookingSummary,
} from '@/components/payment/DepositPaymentModal';
import {
  getOrCreateLockSessionId,
  readActiveTableLock,
  releaseClientTableLock,
  writeActiveTableLock,
  type ClientTableLockState,
} from '@/app/lib/bookingLockClient';
import { useCart } from '@/app/context/CartContext';
import { useToast } from '@/components/ui/Toast';
import { formatMoney } from '@/app/lib/format';
import {
  evaluateLateNightDiningNotice,
  isSlotEligibleForSpecialPreOrder,
} from '@/app/lib/reservationHelpers';
import {
  calculateDepositAmount,
  type DepositTier,
} from '@/app/lib/payments/depositRules';

interface CreatedReservationSnapshot {
  slotKey: string;
  reservationId: string;
  bookingCode: string;
  tableId: string;
  tableNumber: string;
  date: string;
  time: string;
  guests: number;
  name: string;
  phone: string;
  orderSubmitted?: boolean;
}

interface TableLockApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    lockId?: string;
    lockKey?: string;
    tableId?: string;
    tableNumber?: string;
    sessionId?: string;
    expiresAt?: string;
    lockedUntil?: string | null;
  };
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

interface ActiveDepositSession {
  booking: DepositBookingSummary;
  depositAmount: number;
  baseTableDeposit: number;
  preOrderDeposit: number;
  depositTier: DepositTier;
  lockSessionId: string;
  lockExpiresAt: string;
}

const PENDING_RESERVATION_KEY = 'smares_pending_reservation';

function normalizePositiveInt(value: string | number | undefined, fallback: number): number {
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
  return fallback;
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
      typeof rec.reservationId === 'string' &&
      rec.reservationId &&
      typeof rec.bookingCode === 'string' &&
      rec.bookingCode
    ) {
      return {
        slotKey: rec.slotKey,
        reservationId: rec.reservationId,
        bookingCode: rec.bookingCode,
        tableId: typeof rec.tableId === 'string' ? rec.tableId : '',
        tableNumber: typeof rec.tableNumber === 'string' ? rec.tableNumber : '',
        date: typeof rec.date === 'string' ? rec.date : '',
        time: typeof rec.time === 'string' ? rec.time : '',
        guests: typeof rec.guests === 'number' ? rec.guests : 4,
        name: typeof rec.name === 'string' ? rec.name : '',
        phone: typeof rec.phone === 'string' ? rec.phone : '',
        orderSubmitted: Boolean(rec.orderSubmitted),
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
    totalPrice,
    bookingInfo,
    setBookingInfo,
    clearCart,
    clearBookingInfo,
    hasActiveBooking,
    isLoaded,
    hasSpecialItems,
  } = useCart();
  const { showToast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isReleasingBannerLock, setIsReleasingBannerLock] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorActionTarget, setErrorActionTarget] = useState<'diagram' | 'menu' | null>(null);
  const [depositSession, setDepositSession] = useState<ActiveDepositSession | null>(null);
  const [activeLock, setActiveLock] = useState<ClientTableLockState | null>(() =>
    readActiveTableLock()
  );

  const guestsCount = normalizePositiveInt(bookingInfo?.guests, 4);
  const tableCapacityCount = normalizePositiveInt(bookingInfo?.tableCapacity, 4);
  const bookingDate = bookingInfo?.date ?? '';
  const bookingTime = bookingInfo?.time ?? '';
  const lateNotice = useMemo(() => {
    if (!bookingDate || !bookingTime) return null;
    const notice = evaluateLateNightDiningNotice(bookingDate, bookingTime);
    return notice.severity !== 'NONE' ? notice : null;
  }, [bookingDate, bookingTime]);

  const depositPreview = useMemo(
    () =>
      calculateDepositAmount({
        tableNumber: bookingInfo?.tableNumber,
        zoneName: bookingInfo?.tableType,
        capacity: tableCapacityCount,
        guests: guestsCount,
        preOrderTotal: totalPrice,
      }),
    [bookingInfo?.tableNumber, bookingInfo?.tableType, tableCapacityCount, guestsCount, totalPrice]
  );

  const preOrderItemsPayload = useMemo(
    () =>
      cart.map((item) => ({
        menuItemId: item._id,
        quantity: item.quantity,
      })),
    [cart]
  );

  const releaseLockSafely = useCallback(
    async (params: {
      tableId: string;
      date: string;
      time: string;
      reservationId?: string;
      sessionId: string;
      reason: 'USER_CANCELLED' | 'EXPIRED';
    }) => {
      try {
        await fetch('/api/table-locks/release', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
      } catch {
        // Bỏ qua lỗi mạng khi dọn lock phía client
      }
    },
    []
  );

  const handleOpenDepositModal = async () => {
    if (
      !bookingInfo ||
      !bookingInfo.tableNumber ||
      !bookingInfo.date ||
      !bookingInfo.time ||
      !bookingInfo.phone
    ) {
      const msg = 'Thiếu thông tin đặt bàn bắt buộc. Vui lòng kiểm tra lại từ Bước 1.';
      setErrorMsg(msg);
      showToast(msg, 'warning');
      return;
    }

    const hasSpecialInCart = cart.some((item) => item.isPreOrderOnly === true);
    if (
      hasSpecialInCart &&
      !isSlotEligibleForSpecialPreOrder(bookingInfo.date, bookingInfo.time)
    ) {
      const msg =
        'Các món đặc quyền chế biến công phu chỉ phục vụ khi đặt bàn trước giờ hẹn tối thiểu 5 tiếng. Vui lòng cập nhật lại thực đơn trước khi thanh toán.';
      setErrorActionTarget('menu');
      setErrorMsg(msg);
      showToast(msg, 'warning');
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

    const sessionId =
      depositSession?.lockSessionId ||
      activeLock?.sessionId ||
      getOrCreateLockSessionId();
    const slotKey = `${selectedTableId || bookingInfo.tableNumber}|${bookingInfo.date}|${bookingInfo.time}|${bookingInfo.phone}`;

    try {
      let reservationSnapshot = readPendingReservation(slotKey);

      // Bước 1: Acquire Distributed Lock TTL 10 phút (TK-129)
      const lockResponse = await fetch('/api/table-locks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: selectedTableId || undefined,
          tableNumber: bookingInfo.tableNumber,
          date: bookingInfo.date,
          time: bookingInfo.time,
          sessionId,
          reservationId: reservationSnapshot?.reservationId || undefined,
        }),
      });

      const lockData = (await lockResponse.json()) as TableLockApiResponse;

      if (!lockResponse.ok || !lockData.success || !lockData.data?.expiresAt) {
        const msg =
          lockData.message ||
          'Bàn này vừa được khách hàng khác giữ chỗ thanh toán. Vui lòng chọn bàn khác.';
        setErrorActionTarget('diagram');
        setErrorMsg(msg);
        showToast(msg, 'error');
        setIsSubmitting(false);
        return;
      }

      const resolvedTableId = lockData.data.tableId || selectedTableId || '';
      const resolvedSessionId = lockData.data.sessionId || sessionId;
      let resolvedExpiresAt = lockData.data.expiresAt;

      // Bước 2: Tạo đơn Reservation PENDING cọc nếu chưa tạo trong phiên hiện tại
      if (!reservationSnapshot) {
        const resResponse = await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableId: resolvedTableId || undefined,
            tableNumber: bookingInfo.tableNumber,
            date: bookingInfo.date,
            time: bookingInfo.time,
            guests: Number(guestsCount),
            phone: bookingInfo.phone,
            customerName: bookingInfo.name,
            customerEmail: bookingInfo.email || '',
            note: bookingInfo.note || '',
          }),
        });

        const resData = (await resResponse.json()) as ReservationApiResponse;

        if (!resResponse.ok || !resData.success || !resData.data) {
          await releaseLockSafely({
            tableId: resolvedTableId,
            date: bookingInfo.date,
            time: bookingInfo.time,
            sessionId: resolvedSessionId,
            reason: 'USER_CANCELLED',
          });

          const msg =
            resResponse.status === 409
              ? resData.message ||
                'Bàn và khung giờ này vừa có khách đặt trước. Vui lòng chọn bàn khác hoặc đổi giờ.'
              : resData.message ||
                'Không thể tạo đơn đặt bàn. Vui lòng kiểm tra lại thông tin.';
          setErrorActionTarget('diagram');
          setErrorMsg(msg);
          showToast(msg, 'error');
          setIsSubmitting(false);
          return;
        }

        reservationSnapshot = {
          slotKey,
          reservationId: String(resData.data.id),
          bookingCode: resData.data.bookingCode,
          tableId: String(resData.data.tableId || resolvedTableId),
          tableNumber: resData.data.tableNumber || bookingInfo.tableNumber,
          date: resData.data.date || bookingInfo.date,
          time: resData.data.time || bookingInfo.time,
          guests: resData.data.guests ?? guestsCount,
          name: resData.data.customerName || bookingInfo.name,
          phone: resData.data.phone || bookingInfo.phone,
          orderSubmitted: false,
        };

        try {
          const bindRes = await fetch('/api/table-locks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tableId: reservationSnapshot.tableId,
              tableNumber: reservationSnapshot.tableNumber,
              date: reservationSnapshot.date,
              time: reservationSnapshot.time,
              sessionId: resolvedSessionId,
              reservationId: reservationSnapshot.reservationId,
            }),
          });
          const bindData = (await bindRes.json()) as TableLockApiResponse;
          if (bindRes.ok && bindData.success && bindData.data?.expiresAt) {
            resolvedExpiresAt = bindData.data.expiresAt;
          }
        } catch {
          // Tiếp tục mở modal với lock hiện có
        }
      }

      // Bước 3: Lưu đơn đặt món trước (nếu có trong giỏ hàng)
      if (cart.length > 0 && !reservationSnapshot.orderSubmitted) {
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservationId: reservationSnapshot.reservationId,
            bookingDate: reservationSnapshot.date,
            bookingTime: reservationSnapshot.time,
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
            sessionStorage.setItem(
              PENDING_RESERVATION_KEY,
              JSON.stringify(reservationSnapshot)
            );
          } catch {
            // Bỏ qua lỗi sessionStorage
          }
          const msg = orderData.message
            ? `Đơn bàn (${reservationSnapshot.bookingCode}) đang giữ chỗ, nhưng thực đơn đặt trước gặp lỗi: ${orderData.message}.`
            : `Đơn bàn (${reservationSnapshot.bookingCode}) đang giữ chỗ, nhưng không thể gửi thực đơn đặt trước.`;
          setErrorActionTarget('menu');
          setErrorMsg(msg);
          showToast(msg, 'warning');
          setIsSubmitting(false);
          return;
        }

        reservationSnapshot.orderSubmitted = true;
      }

      try {
        sessionStorage.setItem(
          PENDING_RESERVATION_KEY,
          JSON.stringify(reservationSnapshot)
        );
      } catch {
        // Bỏ qua lỗi sessionStorage
      }

      const syncedLock: ClientTableLockState = {
        lockKey:
          lockData.data.lockKey ||
          `${reservationSnapshot.tableId}:${reservationSnapshot.date}:${reservationSnapshot.time}`,
        tableId: reservationSnapshot.tableId,
        tableNumber: reservationSnapshot.tableNumber,
        date: reservationSnapshot.date,
        time: reservationSnapshot.time,
        sessionId: resolvedSessionId,
        expiresAt: resolvedExpiresAt,
        reservationId: reservationSnapshot.reservationId,
      };
      writeActiveTableLock(syncedLock);
      setActiveLock(syncedLock);

      // Bước 4: Mở Modal chọn phương thức thanh toán cọc (TK-132)
      setDepositSession({
        booking: {
          reservationId: reservationSnapshot.reservationId,
          bookingCode: reservationSnapshot.bookingCode,
          tableId: reservationSnapshot.tableId,
          tableNumber: reservationSnapshot.tableNumber,
          tableType: bookingInfo.tableType || '',
          date: reservationSnapshot.date,
          time: reservationSnapshot.time,
          guests: reservationSnapshot.guests,
          customerName: reservationSnapshot.name,
          phone: reservationSnapshot.phone,
        },
        depositAmount: depositPreview.amount,
        baseTableDeposit: depositPreview.baseTableDeposit,
        preOrderDeposit: depositPreview.preOrderDeposit,
        depositTier: depositPreview.depositTier,
        lockSessionId: resolvedSessionId,
        lockExpiresAt: resolvedExpiresAt,
      });
    } catch {
      const msg = 'Lỗi kết nối tới máy chủ. Vui lòng thử lại sau giây lát.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAndRelease = useCallback(
    async (reason: 'USER_CANCELLED' | 'EXPIRED') => {
      const current = depositSession;
      if (reason === 'USER_CANCELLED') {
        setIsRedirecting(true);
      }
      setDepositSession(null);
      writeActiveTableLock(null);
      setActiveLock(null);

      try {
        sessionStorage.removeItem(PENDING_RESERVATION_KEY);
        if (reason === 'USER_CANCELLED') {
          sessionStorage.removeItem('smares_selected_table_id');
        }
      } catch {
        // Bỏ qua lỗi sessionStorage
      }

      if (current) {
        await releaseLockSafely({
          tableId: current.booking.tableId,
          date: current.booking.date,
          time: current.booking.time,
          reservationId: current.booking.reservationId,
          sessionId: current.lockSessionId,
          reason,
        });
      }

      if (reason === 'EXPIRED') {
        const msg =
          'Phiên giữ chỗ 10 phút đã hết hạn. Bàn đã được tự động giải phóng cho khách hàng khác.';
        setErrorMsg(msg);
        setErrorActionTarget('diagram');
        showToast(msg, 'warning');
      } else {
        setBookingInfo((prev) =>
          prev
            ? {
                ...prev,
                tableId: undefined,
                tableNumber: undefined,
                tableType: undefined,
                tableCapacity: undefined,
              }
            : null
        );
        showToast(
          'Đã hủy thanh toán và giải phóng khóa bàn. Đang quay về Bước 1.',
          'info'
        );
        router.push('/booking');
      }
    },
    [depositSession, releaseLockSafely, setBookingInfo, showToast, router]
  );

  const handleBannerLockRelease = useCallback(
    async (lock: ClientTableLockState, reason: 'USER_CANCELLED' | 'EXPIRED') => {
      setIsReleasingBannerLock(true);
      try {
        if (reason === 'USER_CANCELLED') {
          setIsRedirecting(true);
        }
        await releaseClientTableLock(lock, reason);
        setActiveLock(null);
        try {
          sessionStorage.removeItem(PENDING_RESERVATION_KEY);
          if (reason === 'USER_CANCELLED') {
            sessionStorage.removeItem('smares_selected_table_id');
          }
        } catch {
          // Bỏ qua lỗi sessionStorage
        }
        if (reason === 'EXPIRED') {
          const msg =
            'Phiên giữ chỗ 10 phút đã hết hạn. Bàn đã được tự động giải phóng cho khách hàng khác.';
          setErrorMsg(msg);
          setErrorActionTarget('diagram');
          showToast(msg, 'warning');
        } else {
          setBookingInfo((prev) =>
            prev
              ? {
                  ...prev,
                  tableId: undefined,
                  tableNumber: undefined,
                  tableType: undefined,
                  tableCapacity: undefined,
                }
              : null
          );
          showToast(`Đã hủy giữ khóa Bàn ${lock.tableNumber}. Đang quay về Bước 1.`, 'info');
          router.push('/booking');
        }
      } finally {
        setIsReleasingBannerLock(false);
      }
    },
    [setBookingInfo, showToast, router]
  );

  const handleBankQrComplete = useCallback(
    (_transactionRef: string, amountPaid: number) => {
      const current = depositSession;
      setIsRedirecting(true);
      setDepositSession(null);
      writeActiveTableLock(null);
      setActiveLock(null);

      try {
        sessionStorage.removeItem(PENDING_RESERVATION_KEY);
        sessionStorage.removeItem('smares_selected_table_id');
      } catch {
        // Bỏ qua lỗi sessionStorage
      }

      clearCart();
      clearBookingInfo();
      showToast(
        `Đặt bàn thành công! Đã ghi nhận tiền cọc ${formatMoney(amountPaid)}.`,
        'success'
      );

      if (current) {
        router.push(
          `/booking/success?code=${encodeURIComponent(current.booking.bookingCode)}&table=${encodeURIComponent(current.booking.tableNumber)}`
        );
      } else {
        router.push('/booking/success');
      }
    },
    [depositSession, clearCart, clearBookingInfo, showToast, router]
  );

  if (!isLoaded && !depositSession && !isRedirecting) {
    return (
      <main className="flex-1 bg-[#f4f7f5] text-[#1c1917] flex flex-col min-h-screen pb-20">
        <BookingStepper currentStep={4} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-6 animate-pulse">
          <div className="h-24 bg-white rounded-2xl border border-[#e2e8e4]" />
          <div className="h-48 bg-white rounded-2xl border border-[#e2e8e4]" />
          <div className="h-44 bg-white rounded-2xl border border-[#e2e8e4]" />
        </div>
      </main>
    );
  }

  if (isLoaded && !hasActiveBooking && !depositSession && !isRedirecting) {
    return (
      <main className="flex-1 bg-[#f4f7f5] text-[#1c1917] flex flex-col min-h-screen">
        <BookingStepper currentStep={4} />
        <div className="max-w-xl mx-auto my-auto py-16 px-4 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#e2e8e4]">
            <div className="w-14 h-14 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center mx-auto mb-4 border border-[#fde68a]">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#1c1917] mb-2">
              Chưa có thông tin đặt bàn
            </h1>
            <p className="text-stone-600 text-sm mb-6">
              Vui lòng hoàn thành thông tin bàn trước khi xem trang xác nhận.
            </p>
            <Link
              href="/booking"
              className="interactive-btn inline-flex items-center gap-2 bg-[#155e42] hover:bg-[#0e3f2d] text-white font-semibold px-6 py-3 rounded-xl shadow-xs text-sm"
            >
              <span>← Quay lại Bước 1</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[#f4f7f5] text-[#1c1917] flex flex-col min-h-screen pb-20">
      <BookingStepper currentStep={4} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Tiêu đề trang */}
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#155e42] bg-[#f0fdf4] px-3.5 py-1.5 rounded-full border border-[#bbf7d0] inline-block mb-2">
            Bước 4 / 4 - Xác nhận &amp; Đặt cọc
          </span>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#1c1917]">
            Xác Nhận Đặt Bàn &amp; Thực Đơn
          </h1>
          <p className="text-sm md:text-base text-stone-600 mt-2 max-w-lg mx-auto leading-relaxed">
            Vui lòng kiểm tra lại thông tin bàn, thực đơn và mức tiền cọc giữ chỗ trước khi thanh toán tại SmaRes.
          </p>
        </div>

        <div className="space-y-6">
          {/* Thanh đếm ngược giữ khóa bàn đồng bộ từ Bước 2 -> 3 -> 4 (ẩn khi modal đã mở để tránh trùng bộ đếm) */}
          {activeLock && !depositSession && (
            <LockCountdownBanner
              lock={activeLock}
              isReleasing={isReleasingBannerLock}
              onExpired={(expired) => void handleBannerLockRelease(expired, 'EXPIRED')}
              onRelease={(lock) => void handleBannerLockRelease(lock, 'USER_CANCELLED')}
            />
          )}

          {/* KHỐI 1: THÔNG TIN BÀN ĂN */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#e2e8e4] p-6 md:p-8">
            <div className="flex items-center justify-between border-b border-[#e2e8e4] pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-[#f0fdf4] text-[#155e42] flex items-center justify-center font-bold text-base border border-[#bbf7d0]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <h2 className="font-serif font-bold text-xl text-[#155e42]">
                  1. Chi tiết Bàn &amp; Thời gian
                </h2>
                {lateNotice && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#fff7ed] text-[#9a3412] border border-[#fdba74]">
                    Khung giờ muộn • Đóng cửa {lateNotice.closingTimeLabel}
                  </span>
                )}
              </div>
              <Link
                href="/booking/diagram"
                className="text-xs sm:text-sm font-semibold text-[#155e42] hover:text-[#0e3f2d] flex items-center gap-1 transition-colors"
              >
                <span>Sửa vị trí bàn</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div className="bg-[#f4f7f5] p-4 rounded-xl border border-[#e2e8e4]">
                <p className="text-xs text-stone-500 mb-1">Vị trí bàn ăn</p>
                <p className="font-serif font-bold text-[#1c1917] text-lg">
                  Bàn {bookingInfo?.tableNumber}{' '}
                  {bookingInfo?.tableType && (
                    <span className="text-xs font-semibold text-[#155e42] bg-[#f0fdf4] px-2.5 py-0.5 rounded-full ml-1 border border-[#bbf7d0]">
                      {bookingInfo.tableType}
                    </span>
                  )}
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  Sức chứa: {tableCapacityCount} chỗ ngồi
                </p>
              </div>

              <div className="bg-[#f4f7f5] p-4 rounded-xl border border-[#e2e8e4]">
                <p className="text-xs text-stone-500 mb-1">Thời gian dùng bữa</p>
                <p className="font-serif font-bold text-[#1c1917] text-lg">
                  {bookingInfo?.time}
                  {lateNotice ? ` – ${lateNotice.effectiveEndHm}` : ''}
                </p>
                <p className="text-xs text-stone-500 mt-1">Ngày: {bookingInfo?.date}</p>
                {lateNotice && (
                  <p className="text-[11px] font-semibold text-[#9a3412] bg-[#fff7ed] border border-[#fdba74] rounded-lg px-2 py-1 mt-2">
                    Khung giờ muộn (còn {lateNotice.remainingMinutes} phút trước giờ đóng cửa{' '}
                    {lateNotice.closingTimeLabel})
                  </p>
                )}
              </div>

              <div className="bg-[#f4f7f5] p-4 rounded-xl border border-[#e2e8e4] sm:col-span-2 lg:col-span-1">
                <p className="text-xs text-stone-500 mb-1">Khách hàng đặt bàn</p>
                <p className="font-serif font-bold text-[#1c1917] text-lg">{bookingInfo?.name}</p>
                <p className="text-xs text-stone-500 mt-1">
                  SĐT: {bookingInfo?.phone} • {guestsCount} người
                </p>
              </div>
            </div>

            {bookingInfo?.note && (
              <div className="mt-4 p-3.5 bg-[#fffbeb] rounded-xl border border-[#fde68a] text-xs sm:text-sm text-stone-600">
                <strong className="text-[#92400e] font-semibold">Ghi chú cho nhà hàng: </strong>
                <span>&ldquo;{bookingInfo.note}&rdquo;</span>
              </div>
            )}
          </div>

          {/* KHỐI 2: THỰC ĐƠN ĐẶT TRƯỚC */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#e2e8e4] p-6 md:p-8">
            <div className="flex items-center justify-between border-b border-[#e2e8e4] pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-[#f0fdf4] text-[#155e42] flex items-center justify-center font-bold text-base border border-[#bbf7d0]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                    <path d="M7 2v20" />
                    <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                  </svg>
                </span>
                <h2 className="font-serif font-bold text-xl text-[#155e42]">2. Thực đơn Đặt trước</h2>
              </div>
              <Link
                href="/booking/menu"
                className="text-xs sm:text-sm font-semibold text-[#155e42] hover:text-[#0e3f2d] flex items-center gap-1 transition-colors"
              >
                <span>{cart.length > 0 ? 'Sửa món ăn' : '+ Chọn thêm món'}</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </Link>
            </div>

            {cart.length === 0 ? (
              <div className="p-8 bg-[#f4f7f5] rounded-2xl border border-[#e2e8e4] text-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-xl shadow-xs mb-3 text-stone-500 border border-[#e2e8e4]">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  </svg>
                </div>
                <h3 className="font-serif font-bold text-[#1c1917] text-base">
                  Không chọn món ăn trước
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-md mx-auto leading-relaxed">
                  Quý khách đã chọn bước gọi món trực tiếp tại nhà hàng. Đội ngũ nhân viên sẽ phục vụ menu chi tiết ngay khi quý khách ngồi vào bàn.
                </p>
                {lateNotice && (
                  <p className="mt-3 text-xs text-[#9a3412] bg-[#fff7ed] border border-[#fdba74] rounded-xl px-3.5 py-2 max-w-md mx-auto">
                    Lưu ý khung giờ muộn: Nhà hàng đóng cửa lúc{' '}
                    <strong>{lateNotice.closingTimeLabel}</strong> (còn{' '}
                    <strong>{lateNotice.remainingMinutes} phút</strong>) — bạn nên đặt món trước để không mất thời gian chờ bếp lên món.
                  </p>
                )}
                <Link
                  href="/booking/menu"
                  className="mt-4 inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#155e42] hover:text-[#0e3f2d] underline decoration-[#155e42]/40 underline-offset-4"
                >
                  <span>Muốn chọn món trước để bếp trưởng chuẩn bị sẵn? Nhấp vào đây</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ) : (
              <div>
                <div className="divide-y divide-[#e2e8e4]">
                  {cart.map((item, idx) => (
                    <div key={item.cartKey || `${item._id}-${idx}`} className="py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <Image
                          src={item.imageUrl || '/foods/pho_bo.jpg'}
                          alt={item.name}
                          width={64}
                          height={64}
                          unoptimized
                          className="w-16 h-16 rounded-xl object-cover border border-[#e2e8e4] shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-serif font-bold text-base text-[#1c1917]">{item.name}</h4>
                            {item.isPreOrderOnly && (
                              <span className="text-[11px] bg-[#fffbeb] text-[#92400e] font-semibold px-2 py-0.5 rounded-full border border-[#fde68a] flex items-center gap-1">
                                <svg className="w-3 h-3 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                  <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                                </svg>
                                <span>Món đặc biệt</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-stone-600 mt-1">
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
                    <svg className="w-4 h-4 text-[#d97706] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                    </svg>
                    <span>
                      Các món đặc biệt đã được ghi chú vào đơn và sẽ được bếp trưởng sơ chế trước đúng giờ hẹn.
                    </span>
                  </div>
                )}

                <div className="border-t border-[#e2e8e4] mt-6 pt-4 flex items-center justify-between text-base sm:text-lg">
                  <span className="font-semibold text-[#1c1917]">Tổng tiền thực đơn đặt trước:</span>
                  <span className="font-serif font-bold text-[#d97706] text-2xl">{formatMoney(totalPrice)}</span>
                </div>
              </div>
            )}
          </div>

          {/* KHỐI 3: TIỀN ĐẶT CỌC & QUY ĐỊNH GIỮ BÀN */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#e2e8e4] p-6 md:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e2e8e4]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#92400e] bg-[#fffbeb] px-2.5 py-1 rounded-full border border-[#fde68a] inline-block mb-1">
                  Chính sách đặt cọc
                </span>
                <h2 className="font-serif font-bold text-xl text-[#155e42]">
                  3. Tiền Cọc Giữ Chỗ Trực Tuyến
                </h2>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-stone-500">Số tiền cần thanh toán</p>
                <p className="font-serif font-bold text-2xl text-[#d97706]">
                  {formatMoney(depositPreview.amount)}
                </p>
              </div>
            </div>

            {depositPreview.preOrderDeposit > 0 && (
              <div className="bg-[#faf8f5] rounded-xl border border-[#e2e8e4] p-4 space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between text-stone-600">
                  <span>
                    Cọc bàn (
                    {depositPreview.depositTier === 'VIP_OR_LARGE'
                      ? 'Phòng VIP / Bàn tiệc lớn'
                      : 'Bàn tiêu chuẩn'}
                    ):
                  </span>
                  <span className="font-semibold text-[#1c1917]">
                    {formatMoney(depositPreview.baseTableDeposit)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span>
                    50% thực đơn đặt trước ({formatMoney(depositPreview.preOrderTotal)}):
                  </span>
                  <span className="font-semibold text-[#1c1917]">
                    {formatMoney(depositPreview.preOrderDeposit)}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#e2e8e4] flex items-center justify-between font-bold">
                  <span className="text-[#155e42]">Tổng tiền cần đặt cọc:</span>
                  <span className="text-[#d97706] font-serif text-base sm:text-lg">
                    {formatMoney(depositPreview.amount)}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-[#f0fdf4] rounded-xl border border-[#bbf7d0] p-4 text-xs sm:text-sm text-[#155e42] space-y-1.5">
              <ul className="list-disc pl-5 space-y-1.5 text-stone-600 leading-relaxed">
                <li>
                  Mức cọc áp dụng:{' '}
                  <strong className="text-[#155e42]">
                    100.000đ (Bàn tiêu chuẩn) / 300.000đ (VIP &amp; Bàn lớn) + 50% tổng tiền thực đơn đặt trước
                  </strong>
                  .
                </li>
                <li>
                  Khi bấm thanh toán, bàn được giữ khóa tạm thời trong <strong>10 phút</strong> (nếu hủy hoặc quá hạn, bàn tự động giải phóng).
                </li>
                <li>
                  Nhà hàng giữ bàn tối đa <strong>15 phút</strong> so với khung giờ đã hẹn ({bookingInfo?.time}); hủy miễn phí trước ít nhất <strong>60 phút</strong>.
                </li>
              </ul>
            </div>
          </div>

          {/* ERROR BANNER */}
          {errorMsg && (
            <div className="p-4 sm:p-5 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

          {/* NÚT XÁC NHẬN & MỞ MODAL THANH TOÁN CỌC */}
          <div className="pt-3 flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/booking/menu"
              className="interactive-btn w-full sm:w-auto text-center font-semibold text-stone-600 hover:text-[#1c1917] px-6 py-4 rounded-xl border border-[#d6d0c4] hover:bg-stone-100 text-sm"
            >
              ← Quay lại chọn món
            </Link>

            <button
              type="button"
              onClick={handleOpenDepositModal}
              disabled={isSubmitting}
              className="interactive-btn flex-1 w-full bg-[#155e42] hover:bg-[#0e3f2d] disabled:opacity-70 text-white font-semibold py-4 rounded-xl shadow-[0_8px_24px_-4px_rgba(21,94,66,0.45)] hover:shadow-[0_12px_28px_-4px_rgba(21,94,66,0.6)] text-base sm:text-lg flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span className="animate-pulse">Đang giữ khóa bàn &amp; chuẩn bị thanh toán...</span>
              ) : (
                <>
                  <span>
                    Xác Nhận &amp; Thanh Toán Cọc ({formatMoney(depositPreview.amount)})
                  </span>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL LỰA CHỌN PHƯƠNG THỨC THANH TOÁN CỌC (TK-132) */}
      <DepositPaymentModal
        isOpen={depositSession !== null}
        booking={depositSession?.booking ?? null}
        depositAmount={depositSession?.depositAmount ?? depositPreview.amount}
        baseTableDeposit={depositSession?.baseTableDeposit ?? depositPreview.baseTableDeposit}
        preOrderDeposit={depositSession?.preOrderDeposit ?? depositPreview.preOrderDeposit}
        depositTier={depositSession?.depositTier ?? depositPreview.depositTier}
        preOrderTotal={totalPrice}
        preOrderItems={preOrderItemsPayload}
        lockSessionId={depositSession?.lockSessionId ?? ''}
        lockExpiresAt={depositSession?.lockExpiresAt ?? ''}
        onBankQrComplete={handleBankQrComplete}
        onCancelAndRelease={handleCancelAndRelease}
      />
    </main>
  );
}