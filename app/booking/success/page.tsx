"use client";

import { Suspense, useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

interface LastBookingSnapshot {
  bookingCode?: string;
  tableId?: string;
  tableNumber?: string;
  tableType?: string;
  guests?: number | string;
  date?: string;
  time?: string;
  name?: string;
  phone?: string;
  totalPrice?: number;
  itemCount?: number;
}

interface QrApiResponse {
  success: boolean;
  data?: {
    tableId?: string;
    token?: string;
    orderUrl?: string;
    qrImageUrl?: string;
  };
}

interface QrFetchState {
  forTable: string;
  token: string;
  qrImageUrl: string;
  error: boolean;
}

const emptySubscribe = () => () => {};

function getLastBookingSnapshotRaw(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem('smares_last_booking');
  } catch {
    return null;
  }
}

function parseSnapshot(raw: string | null): LastBookingSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed as LastBookingSnapshot;
  } catch {
    return null;
  }
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const rawSnapshot = useSyncExternalStore(
    emptySubscribe,
    getLastBookingSnapshotRaw,
    () => null
  );

  const snapshot = useMemo(() => parseSnapshot(rawSnapshot), [rawSnapshot]);

  const urlCode = searchParams.get('code')?.trim() || '';
  const urlTable = searchParams.get('table')?.trim() || '';

  const snapshotMatchesCode =
    snapshot !== null &&
    (!urlCode ||
      !snapshot.bookingCode ||
      snapshot.bookingCode.toUpperCase() === urlCode.toUpperCase());

  const activeSnapshot = snapshotMatchesCode ? snapshot : null;

  const bookingCode = urlCode || activeSnapshot?.bookingCode || '';
  const tableNumber = urlTable || activeSnapshot?.tableNumber || '';
  const tableType = activeSnapshot?.tableType || '';
  const guests = activeSnapshot?.guests;
  const time = activeSnapshot?.time || '';
  const date = activeSnapshot?.date || '';
  const name = activeSnapshot?.name || '';
  const phone = activeSnapshot?.phone || '';
  const itemCount = typeof activeSnapshot?.itemCount === 'number' ? activeSnapshot.itemCount : 0;
  const totalPrice = typeof activeSnapshot?.totalPrice === 'number' ? activeSnapshot.totalPrice : 0;

  const [qrState, setQrState] = useState<QrFetchState | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!tableNumber) return;
    let isCancelled = false;

    fetch(`/api/qr?tableId=${encodeURIComponent(tableNumber)}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('QR request failed');
        }
        const resData = (await res.json()) as QrApiResponse;
        if (isCancelled) return;

        if (resData.success && resData.data?.qrImageUrl) {
          setQrState({
            forTable: tableNumber,
            token: resData.data.token || '',
            qrImageUrl: resData.data.qrImageUrl,
            error: false,
          });
          return;
        }

        setQrState({
          forTable: tableNumber,
          token: '',
          qrImageUrl: '',
          error: true,
        });
      })
      .catch(() => {
        if (isCancelled) return;
        setQrState({
          forTable: tableNumber,
          token: '',
          qrImageUrl: '',
          error: true,
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [tableNumber]);

  const isLoadingQr = Boolean(tableNumber) && qrState?.forTable !== tableNumber;
  const dynamicQrUrl =
    qrState?.forTable === tableNumber && !qrState.error ? qrState.qrImageUrl : '';
  const qrToken = qrState?.forTable === tableNumber ? qrState.token : '';
  const qrHasError = qrState?.forTable === tableNumber && qrState.error;

  const handleCopyCode = () => {
    if (!bookingCode) return;
    navigator.clipboard?.writeText(bookingCode).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  if (!bookingCode && !tableNumber) {
    return (
      <main className="flex-1 flex items-center justify-center bg-[#faf8f5] text-[#1c1917] py-16 px-4">
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_-4px_rgba(28,25,23,0.08)] p-8 max-w-md w-full text-center border border-[#ebe7df]">
          <div className="w-14 h-14 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center mx-auto mb-4 border border-[#fde68a]">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#14532d] mb-2">
            Chưa tìm thấy thông tin đặt bàn
          </h1>
          <p className="text-stone-500 text-sm mb-6">
            Phiên xác nhận đặt bàn đã hết hạn hoặc đường dẫn thiếu mã đặt chỗ. Bạn có thể xem lại trong lịch sử hoặc đặt bàn mới.
          </p>
          <div className="space-y-3">
            <Link
              href="/history"
              className="block w-full bg-[#14532d] hover:bg-[#15803d] text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              Xem lịch sử đặt bàn
            </Link>
            <Link
              href="/booking"
              className="block w-full border border-[#d6d0c4] hover:bg-stone-50 text-stone-700 font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              Đặt bàn mới
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center bg-[#faf8f5] text-[#1c1917] py-16 px-4">
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_-4px_rgba(28,25,23,0.08)] p-8 max-w-lg w-full text-center border border-[#ebe7df]">
        {/* Icon Dấu tích xanh */}
        <div className="w-16 h-16 bg-[#14532d] text-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_8px_20px_-4px_rgba(20,83,45,0.4)] border border-[#22c55e]/30">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-serif font-bold text-[#14532d] mb-1">
          Đặt bàn thành công!
        </h1>
        <p className="text-stone-500 text-sm mb-6">
          Cảm ơn bạn đã lựa chọn trải nghiệm ẩm thực tại SmaRes
        </p>

        {/* Khối thông tin chi tiết & QR Code */}
        <div className="bg-[#faf8f5] border border-[#ebe7df] rounded-2xl p-5 text-left mb-6 flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4">
          <div className="flex-1 w-full">
            <p className="text-[11px] text-stone-500 font-bold uppercase tracking-wider mb-1">
              MÃ ĐẶT CHỖ CHÍNH THỨC
            </p>
            <p className="text-xl font-bold mb-3 tracking-wider text-[#14532d] font-mono">
              {bookingCode || 'Đang cập nhật'}
            </p>

            <ul className="text-xs space-y-1.5 text-stone-600">
              {name && (
                <li>
                  <span className="font-semibold text-stone-800">Khách hàng:</span> {name}
                  {phone ? ` (${phone})` : ''}
                </li>
              )}
              {tableNumber && (
                <li>
                  <span className="font-semibold text-stone-800">Vị trí:</span> Bàn {tableNumber}
                  {tableType ? ` • ${tableType}` : ''}
                  {guests ? ` (${guests} người)` : ''}
                </li>
              )}
              {(time || date) && (
                <li>
                  <span className="font-semibold text-stone-800">Thời gian:</span>{' '}
                  {[time, date].filter(Boolean).join(', ')}
                </li>
              )}
              <li>
                <span className="font-semibold text-stone-800">Thực đơn đặt trước:</span>{' '}
                {itemCount > 0 ? (
                  <span className="text-[#d97706] font-bold">
                    {itemCount} món ({totalPrice.toLocaleString('vi-VN')}đ)
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

          {/* QR Code động */}
          <div className="flex flex-col items-center shrink-0">
            <div className="flex items-center justify-center w-28 h-28 bg-white border border-[#ebe7df] p-1.5 rounded-xl shadow-xs">
              {isLoadingQr ? (
                <div
                  aria-label="Đang tải mã QR"
                  className="w-full h-full rounded-lg bg-[#ebe7df] animate-pulse"
                />
              ) : dynamicQrUrl ? (
                <img
                  src={dynamicQrUrl}
                  alt={`Mã QR bàn ${tableNumber}`}
                  className="w-full h-full object-contain rounded-md"
                />
              ) : qrHasError ? (
                <Image
                  src="/foods/QR.jpg"
                  alt="Mã QR dự phòng SmaRes"
                  width={112}
                  height={112}
                  className="w-full h-full object-contain rounded-md"
                />
              ) : null}
            </div>
            {qrToken && (
              <span className="mt-1.5 text-[10px] font-mono text-stone-500 max-w-[112px] truncate" title={qrToken}>
                {qrToken}
              </span>
            )}
            {qrHasError && (
              <span className="mt-1 text-[10px] text-[#92400e]">QR dự phòng</span>
            )}
          </div>
        </div>

        {/* Các nút hành động */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => window.print()}
            className="py-2.5 border border-[#d6d0c4] rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <svg className="w-4 h-4 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>In / Lưu phiếu</span>
          </button>
          <button
            type="button"
            onClick={handleCopyCode}
            disabled={!bookingCode}
            className="py-2.5 border border-[#d6d0c4] rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <svg className="w-4 h-4 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
            <span>{copied ? 'Đã sao chép!' : 'Sao chép mã'}</span>
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

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 flex items-center justify-center bg-[#faf8f5] text-[#1c1917] py-16 px-4">
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_-4px_rgba(28,25,23,0.08)] p-8 max-w-lg w-full h-96 animate-pulse border border-[#ebe7df]" />
        </main>
      }
    >
      <BookingSuccessContent />
    </Suspense>
  );
}
