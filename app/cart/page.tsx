"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useCart, type CartItem, type ItemCustomizations } from '@/app/context/CartContext';
import { formatMoney } from '@/app/lib/format';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

interface QrAccessApiData {
  can_order?: boolean;
  table_id?: string;
  table_number?: string;
  zone_name?: string;
  status?: string;
  reservation_id?: string | null;
  customer_name?: string;
  check_in_time?: string;
}

interface QrAccessApiResponse {
  success: boolean;
  error?: string;
  message?: string;
  data?: QrAccessApiData;
}

interface QrValidationState {
  status: 'IDLE' | 'CHECKING' | 'ALLOWED' | 'DENIED' | 'ERROR';
  tableNumber: string;
  zoneName: string;
  tableStatus: string;
  customerName: string;
  message: string;
  canOrder: boolean;
}

interface OrderCreateApiResponse {
  success: boolean;
  message?: string;
  orderId?: string;
  orderCode?: string;
  totalAmount?: number;
}

interface OrderSuccessInfo {
  orderCode: string;
  totalAmount: number;
  tableNumber: string;
  itemCount: number;
}

const SPICY_LABELS: Record<NonNullable<ItemCustomizations['spicy_level']>, string> = {
  NONE: 'Không cay',
  MILD: 'Cay nhẹ',
  MEDIUM: 'Cay vừa',
  HOT: 'Cay nồng',
};

const INITIAL_QR_STATE: QrValidationState = {
  status: 'IDLE',
  tableNumber: '',
  zoneName: '',
  tableStatus: '',
  customerName: '',
  message: '',
  canOrder: false,
};

function getCustomizationBadges(item: CartItem): { tags: string[]; allergyNote: string } {
  const c = item.customizations;
  if (!c) {
    return { tags: [], allergyNote: '' };
  }

  const tags: string[] = [];
  const isDrinkOrDessert = item.category === 'Đồ uống' || item.category === 'Tráng miệng';
  const spicyLevel = c.spicyLevel ?? c.spicy_level;
  const iceLevel = c.iceLevel ?? c.ice_level;
  const sweetnessLevel = c.sweetnessLevel ?? c.sweetness_level;

  if (spicyLevel) {
    if (spicyLevel !== 'NONE' || !isDrinkOrDessert) {
      tags.push(`Độ cay: ${SPICY_LABELS[spicyLevel]}`);
    }
  }
  if (iceLevel) {
    tags.push(`Đá: ${iceLevel}`);
  }
  if (sweetnessLevel) {
    tags.push(`Ngọt: ${sweetnessLevel}`);
  }

  const allergyNote = (c.allergyNotes ?? c.allergy_notes)?.trim() ?? '';
  return { tags, allergyNote };
}

async function requestValidateTableQr(tableNumber: string): Promise<QrValidationState> {
  const normalized = tableNumber.trim().toUpperCase();
  if (!normalized) {
    return {
      ...INITIAL_QR_STATE,
      status: 'ERROR',
      message: 'Vui lòng nhập số bàn để kiểm tra phiên phục vụ.',
    };
  }

  try {
    const response = await fetch('/api/v1/tables/validate-qr-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_number: normalized }),
    });

    const json = (await response.json()) as QrAccessApiResponse;
    if (response.ok && json.success && json.data?.can_order === true) {
      return {
        status: 'ALLOWED',
        tableNumber: json.data.table_number || normalized,
        zoneName: json.data.zone_name || 'Khu vực chính',
        tableStatus: json.data.status || 'SEATED',
        customerName: json.data.customer_name || 'Khách tại bàn',
        message: json.message || 'Bàn đã sẵn sàng gọi món.',
        canOrder: true,
      };
    }

    return {
      status: 'DENIED',
      tableNumber: json.data?.table_number || normalized,
      zoneName: json.data?.zone_name || '',
      tableStatus: json.data?.status || '',
      customerName: '',
      message:
        json.message ||
        'Bàn chưa ở trạng thái đang phục vụ. Vui lòng check-in hoặc liên hệ nhân viên.',
      canOrder: false,
    };
  } catch {
    return {
      ...INITIAL_QR_STATE,
      status: 'ERROR',
      tableNumber: normalized,
      message: 'Không thể kết nối máy chủ để xác thực bàn. Vui lòng thử lại.',
    };
  }
}

function CartLoadingView() {
  return (
    <main className="bg-[#faf8f5] text-[#1c1917] min-h-screen flex items-center justify-center py-16 px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="w-10 h-10 rounded-full border-3 border-[#14532d]/20 border-t-[#14532d] animate-spin" />
        <p className="text-sm font-medium text-[#57534e]">Đang tải giỏ hàng...</p>
      </div>
    </main>
  );
}

function CartContent() {
  const searchParams = useSearchParams();
  const tableParam = (searchParams.get('table') ?? '').trim().toUpperCase();

  const {
    cart,
    totalItems,
    totalPrice,
    updateQuantity,
    removeFromCart,
    clearCart,
    bookingInfo,
    hasActiveBooking,
    isLoaded,
  } = useCart();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoaded, setAuthLoaded] = useState<boolean>(false);

  const [tableDraft, setTableDraft] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  const [qrState, setQrState] = useState<QrValidationState>(INITIAL_QR_STATE);
  const [isCheckingTable, setIsCheckingTable] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<OrderSuccessInfo | null>(null);

  const autoTableCandidate = tableParam || (bookingInfo?.tableNumber ?? '').trim().toUpperCase();
  const tableInputValue = tableDraft ?? autoTableCandidate;
  const phoneValue = phoneDraft ?? (bookingInfo?.phone || userProfile?.phone || '');
  const notesValue = notesDraft ?? (bookingInfo?.note || '');

  const isAdmin = userProfile?.role === 'admin';
  const isOrderUnlocked = qrState.canOrder === true || (hasActiveBooking && !isAdmin);

  // Kiểm tra phiên đăng nhập từ HttpOnly cookie
  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/user/profile', {
          method: 'GET',
          cache: 'no-store',
        });
        if (cancelled) return;
        if (res.ok) {
          const json = (await res.json()) as { success?: boolean; user?: UserProfile };
          if (json.success && json.user) {
            setUserProfile(json.user);
          }
        }
      } catch {
        // Khách ngồi tại bàn quét QR không bắt buộc đăng nhập
      } finally {
        if (!cancelled) {
          setAuthLoaded(true);
        }
      }
    };

    void fetchProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  // Tự động xác thực bàn QR khi có ?table= hoặc có số bàn nhưng chưa có booking draft đầy đủ
  useEffect(() => {
    if (!isLoaded) return;
    if (!autoTableCandidate) return;
    if (!tableParam && hasActiveBooking) return;

    let cancelled = false;

    const autoValidate = async () => {
      const result = await requestValidateTableQr(autoTableCandidate);
      if (!cancelled) {
        setQrState(result);
      }
    };

    void autoValidate();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, autoTableCandidate, tableParam, hasActiveBooking]);

  const handleValidateTable = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    setIsCheckingTable(true);
    const result = await requestValidateTableQr(tableInputValue);
    setQrState(result);
    setIsCheckingTable(false);
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0 || !isOrderUnlocked) return;

    const targetTable = (
      (qrState.canOrder ? qrState.tableNumber : '') ||
      tableInputValue ||
      bookingInfo?.tableNumber ||
      ''
    )
      .trim()
      .toUpperCase();

    if (!targetTable) {
      setSubmitError('Vui lòng nhập và xác nhận số bàn trước khi gửi đơn xuống Bếp.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: targetTable,
          phone: phoneValue.trim(),
          notes: notesValue.trim(),
          items: cart.map((item) => ({
            menuItemId: item._id,
            quantity: item.quantity,
            customizations: item.customizations,
          })),
        }),
      });

      const json = (await response.json()) as OrderCreateApiResponse;

      if (response.status === 201 || (response.ok && json.success)) {
        const orderedCount = totalItems;
        const confirmedTotal =
          typeof json.totalAmount === 'number' ? json.totalAmount : totalPrice;
        clearCart();
        setOrderSuccess({
          orderCode: json.orderCode || 'ORD-SMARES',
          totalAmount: confirmedTotal,
          tableNumber: targetTable,
          itemCount: orderedCount,
        });
      } else {
        setSubmitError(
          json.message || 'Không thể gửi đơn xuống Bếp. Vui lòng kiểm tra lại giỏ hàng.'
        );
      }
    } catch {
      setSubmitError('Không thể kết nối máy chủ khi gửi đơn hàng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return <CartLoadingView />;
  }

  // Hiển thị thẻ xác nhận sau khi gửi đơn xuống bếp thành công (201)
  if (orderSuccess) {
    return (
      <main className="bg-[#faf8f5] text-[#1c1917] min-h-screen py-14 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-[#ebe7df] shadow-[0_16px_32px_-4px_rgba(28,25,23,0.10)] p-8 sm:p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] text-[#14532d] flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#15803d] bg-[#f0fdf4] border border-[#bbf7d0] px-3.5 py-1 rounded-full mb-3">
            Đã chuyển xuống Bếp
          </span>

          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1c1917] mb-2">
            Gửi Đơn Hàng Thành Công!
          </h1>
          <p className="text-sm text-[#57534e] mb-6 leading-relaxed">
            Bếp SmaRes đã tiếp nhận thực đơn của quý khách và đang tiến hành chế biến.
          </p>

          <div className="bg-[#faf8f5] rounded-2xl border border-[#ebe7df] p-5 mb-7 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#78716c]">Mã đơn hàng</span>
              <span className="font-mono font-bold text-[#14532d] text-base">
                {orderSuccess.orderCode}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#78716c]">Bàn phục vụ</span>
              <span className="font-semibold text-[#1c1917]">
                Bàn {orderSuccess.tableNumber}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#78716c]">Số lượng món</span>
              <span className="font-semibold text-[#1c1917]">{orderSuccess.itemCount} món</span>
            </div>
            <div className="pt-3 border-t border-[#ebe7df] flex items-center justify-between">
              <span className="font-semibold text-[#1c1917]">Tổng thanh toán</span>
              <span className="font-serif font-bold text-xl text-[#d97706]">
                {formatMoney(orderSuccess.totalAmount)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/orders"
              className="flex-1 bg-[#14532d] hover:bg-[#15803d] text-white px-5 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-[0_8px_24px_-4px_rgba(20,83,45,0.35)] inline-flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <span>Theo dõi đơn hàng</span>
            </Link>
            <Link
              href={orderSuccess.tableNumber ? `/table-menu?table=${encodeURIComponent(orderSuccess.tableNumber)}` : '/menu'}
              className="flex-1 bg-white hover:bg-[#f5f2eb] text-[#1c1917] border border-[#d6d0c4] px-5 py-3.5 rounded-xl font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2"
            >
              <span>Gọi thêm món</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#faf8f5] text-[#1c1917] min-h-screen py-10 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#15803d] bg-[#f0fdf4] px-3.5 py-1.5 rounded-full border border-[#bbf7d0] inline-block mb-2">
              {qrState.canOrder ? `Phiên tại bàn ${qrState.tableNumber}` : hasActiveBooking ? 'Đơn đặt trước' : 'Giỏ hàng SmaRes'}
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1c1917]">
              Giỏ Hàng Của Bạn
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {authLoaded && userProfile ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#ebe7df] text-[#1c1917] font-medium shadow-xs">
                <svg className="w-3.5 h-3.5 text-[#14532d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>{userProfile.name}</span>
              </span>
            ) : (
              <Link
                href="/login?redirect=/cart"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-[#f5f2eb] border border-[#d6d0c4] text-[#1c1917] font-semibold transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-[#14532d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                <span>Đăng nhập tài khoản</span>
              </Link>
            )}

            <Link
              href={tableInputValue ? `/table-menu?table=${encodeURIComponent(tableInputValue)}` : '/menu'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#f0fdf4] hover:bg-[#dcfce7] border border-[#bbf7d0] text-[#14532d] font-semibold transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Thêm món từ thực đơn</span>
            </Link>
          </div>
        </div>

        {/* Khối xác thực bàn tại chỗ (QR) hoặc hiển thị phiên đặt trước */}
        <section className="mb-8 bg-white rounded-2xl border border-[#ebe7df] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#14532d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <path d="M14 14h3v3h-3z" />
                  <path d="M17 17h4v4h-4z" />
                  <path d="M14 21h3" />
                  <path d="M21 14v3" />
                </svg>
                <h2 className="font-serif font-bold text-lg text-[#1c1917]">
                  Xác nhận bàn phục vụ
                </h2>
                {isOrderUnlocked ? (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] border border-[#86efac]">
                    Đã mở khóa gọi món
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
                    Cần xác nhận bàn
                  </span>
                )}
              </div>

              {qrState.canOrder ? (
                <p className="text-xs sm:text-sm text-[#15803d] font-medium">
                  Bàn <strong>{qrState.tableNumber}</strong> ({qrState.zoneName}) đang phục vụ — Khách: {qrState.customerName}. Quý khách có thể gửi đơn trực tiếp xuống Bếp.
                </p>
              ) : hasActiveBooking && bookingInfo && !isAdmin ? (
                <p className="text-xs sm:text-sm text-[#15803d] font-medium">
                  Đang áp dụng thông tin đặt bàn trước: <strong>Bàn {bookingInfo.tableNumber}</strong> ({bookingInfo.date} lúc {bookingInfo.time}) — {bookingInfo.name}.
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-[#57534e]">
                  Nhập số bàn trên mã QR tại bàn (ví dụ: B01, B05) để gọi món ngay không cần đăng nhập
                  {!isAdmin && (
                    <>
                      , hoặc{' '}
                      <Link href="/booking" className="text-[#14532d] font-semibold underline hover:text-[#15803d]">
                        đặt bàn trước
                      </Link>
                    </>
                  )}
                  .
                </p>
              )}

              {(qrState.status === 'DENIED' || qrState.status === 'ERROR') && qrState.message && (
                <p className="text-xs text-[#b91c1c] bg-[#fee2e2] border border-[#fca5a5] rounded-xl px-3 py-2 mt-2 inline-block">
                  {qrState.message}
                </p>
              )}
            </div>

            <form onSubmit={handleValidateTable} className="flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={tableInputValue}
                onChange={(e) => {
                  const nextVal = e.target.value;
                  setTableDraft(nextVal);
                  if (
                    qrState.status !== 'IDLE' &&
                    nextVal.trim().toUpperCase() !== qrState.tableNumber
                  ) {
                    setQrState(INITIAL_QR_STATE);
                  }
                }}
                placeholder="Số bàn (VD: B05)"
                aria-label="Số bàn"
                className="w-40 sm:w-44 px-3.5 py-2.5 text-sm uppercase font-semibold bg-[#faf8f5] border border-[#d6d0c4] rounded-xl text-[#1c1917] placeholder:normal-case placeholder:font-normal placeholder:text-[#78716c]"
              />
              <button
                type="submit"
                disabled={isCheckingTable}
                className="px-4 py-2.5 rounded-xl bg-[#14532d] hover:bg-[#15803d] disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                {isCheckingTable ? 'Đang kiểm tra...' : 'Xác nhận bàn'}
              </button>
            </form>
          </div>
        </section>

        {/* Banner lỗi khi gửi đơn */}
        {submitError && (
          <div className="mb-6 bg-[#fee2e2] border border-[#fca5a5] text-[#b91c1c] px-5 py-4 rounded-2xl flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <p className="font-semibold text-sm">Không thể gửi đơn hàng</p>
                <p className="text-xs sm:text-sm mt-0.5">{submitError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              aria-label="Đóng thông báo lỗi"
              className="text-[#b91c1c] hover:opacity-75 p-1"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* CỘT TRÁI: DANH SÁCH MÓN */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df] p-6 sm:p-8">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-[#f5f2eb] border border-[#ebe7df] flex items-center justify-center mx-auto mb-4 text-[#78716c]">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                      <path d="M3 6h18" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                  </div>
                  <p className="font-serif font-bold text-xl text-[#1c1917] mb-1.5">
                    Giỏ hàng đang trống
                  </p>
                  <p className="text-sm text-[#78716c] mb-6 max-w-sm mx-auto">
                    Quý khách chưa chọn món ăn nào. Hãy khám phá thực đơn SmaRes để thêm món vào giỏ.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href="/menu"
                      className="inline-flex items-center gap-2 bg-[#14532d] hover:bg-[#15803d] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    >
                      <span>Xem thực đơn</span>
                    </Link>
                    <Link
                      href="/table-menu"
                      className="inline-flex items-center gap-2 bg-[#fffbeb] hover:bg-[#fef3c7] text-[#92400e] border border-[#fde68a] px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    >
                      <span>Menu gọi tại bàn</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-[#ebe7df]">
                  {cart.map((item, idx) => {
                    const { tags, allergyNote } = getCustomizationBadges(item);
                    const safeImageUrl = item.imageUrl?.trim() ? item.imageUrl : '/foods/pho_bo2.jpg';
                    const itemKey = item.cartKey || item._id;

                    return (
                      <li key={item.cartKey || `${item._id}-${idx}`} className="py-6 first:pt-2 last:pb-2 flex items-start gap-4">
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[#ebe7df] bg-[#f5f2eb]">
                          <Image
                            src={safeImageUrl}
                            alt={item.name}
                            fill
                            unoptimized
                            className="object-cover object-center"
                          />
                        </div>

                        <div className="flex flex-1 flex-col justify-between min-h-24 gap-2">
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <h3 className="font-serif font-bold text-base sm:text-lg text-[#1c1917] leading-snug">
                                {item.name}
                              </h3>
                              <p className="text-xs text-[#78716c] mt-0.5">
                                {formatMoney(item.price)} / phần
                              </p>
                            </div>
                            <p className="font-serif font-bold text-[#d97706] text-base sm:text-lg whitespace-nowrap">
                              {formatMoney(item.price * item.quantity)}
                            </p>
                          </div>

                          {(tags.length > 0 || allergyNote) && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#f5f2eb] text-[#57534e] border border-[#ebe7df]"
                                >
                                  {tag}
                                </span>
                              ))}
                              {allergyNote && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#fffbeb] text-[#92400e] border border-[#fde68a]">
                                  <svg className="w-3 h-3 text-[#d97706] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                  </svg>
                                  <span>Dị ứng / Lưu ý: {allergyNote}</span>
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center border border-[#d6d0c4] rounded-lg overflow-hidden bg-white">
                              <button
                                type="button"
                                onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                                aria-label={`Giảm số lượng ${item.name}`}
                                className="px-3 py-1 text-[#57534e] hover:bg-[#f5f2eb] transition-colors text-sm font-semibold"
                              >
                                -
                              </button>
                              <span className="px-3.5 py-1 text-xs font-semibold border-x border-[#d6d0c4] bg-[#faf8f5] text-[#1c1917]">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                                aria-label={`Tăng số lượng ${item.name}`}
                                className="px-3 py-1 text-[#57534e] hover:bg-[#f5f2eb] transition-colors text-sm font-semibold"
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFromCart(itemKey)}
                              className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors inline-flex items-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              </svg>
                              <span>Xóa</span>
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: THÔNG TIN GỬI BẾP & TÓM TẮT */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df] p-6 sm:p-7 sticky top-24">
              <h2 className="font-serif font-bold text-xl text-[#1c1917] mb-5">
                Tóm tắt đơn hàng
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="order-phone" className="block text-xs font-semibold text-[#57534e] mb-1.5">
                    Số điện thoại liên hệ
                  </label>
                  <input
                    id="order-phone"
                    type="tel"
                    value={phoneValue}
                    onChange={(e) => setPhoneDraft(e.target.value)}
                    placeholder="VD: 0901234567"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#faf8f5] border border-[#d6d0c4] rounded-xl text-[#1c1917] placeholder:text-[#78716c]"
                  />
                </div>

                <div>
                  <label htmlFor="order-notes" className="block text-xs font-semibold text-[#57534e] mb-1.5">
                    Ghi chú cho Bếp
                  </label>
                  <textarea
                    id="order-notes"
                    rows={2}
                    value={notesValue}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Ví dụ: Lên món khai vị trước, ít dầu mỡ..."
                    className="w-full px-3.5 py-2.5 text-sm bg-[#faf8f5] border border-[#d6d0c4] rounded-xl text-[#1c1917] placeholder:text-[#78716c] resize-none"
                  />
                </div>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-[#57534e] mb-5 border-y border-[#ebe7df] py-4">
                <div className="flex justify-between">
                  <p>Số lượng món</p>
                  <p className="font-semibold text-[#1c1917]">{totalItems} món</p>
                </div>
                <div className="flex justify-between">
                  <p>Bàn phục vụ</p>
                  <p className="font-semibold text-[#1c1917]">
                    {tableInputValue ? `Bàn ${tableInputValue}` : 'Chưa xác định'}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p>Tạm tính</p>
                  <p className="font-semibold text-[#1c1917]">{formatMoney(totalPrice)}</p>
                </div>
              </div>

              <div className="flex justify-between items-baseline mb-6">
                <p className="font-serif font-bold text-lg text-[#1c1917]">Tổng cộng</p>
                <p className="font-serif font-bold text-2xl text-[#d97706]">
                  {formatMoney(totalPrice)}
                </p>
              </div>

              {!isOrderUnlocked && (
                <div className="mb-4 p-3.5 rounded-xl bg-[#fffbeb] border border-[#fde68a] text-xs text-[#92400e] space-y-2">
                  <p className="font-semibold">
                    {isAdmin
                      ? 'Vui lòng xác nhận số bàn đang phục vụ (QR tại bàn) để mở khóa nút gửi đơn.'
                      : 'Vui lòng xác nhận số bàn đang phục vụ (QR tại bàn) hoặc đặt bàn trước để mở khóa nút gửi đơn.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {!isAdmin && (
                      <Link
                        href="/booking"
                        className="inline-flex items-center font-semibold text-[#14532d] hover:underline"
                      >
                        Đặt bàn ngay →
                      </Link>
                    )}
                    {!userProfile && (
                      <Link
                        href="/login?redirect=/cart"
                        className="inline-flex items-center font-semibold text-[#b45309] hover:underline"
                      >
                        Đăng nhập →
                      </Link>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={cart.length === 0 || !isOrderUnlocked || isSubmitting}
                className="w-full bg-[#14532d] hover:bg-[#15803d] disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none text-white px-6 py-4 rounded-xl font-semibold text-base transition-all shadow-[0_8px_24px_-4px_rgba(20,83,45,0.35)] inline-flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    <span>Đang gửi đơn...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2 11 13" />
                      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
                    </svg>
                    <span>Gửi đơn xuống Bếp</span>
                  </>
                )}
              </button>

              <div className="mt-4 text-center">
                <Link
                  href="/menu"
                  className="text-xs sm:text-sm text-[#57534e] hover:text-[#14532d] font-semibold transition-colors"
                >
                  ← Tiếp tục chọn món
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<CartLoadingView />}>
      <CartContent />
    </Suspense>
  );
}
