'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthSession } from '@/app/lib/useAuthSession';

interface QrSessionData {
  tableId?: string;
  tableNumber?: string;
  token?: string;
  orderUrl?: string;
  qrImageUrl?: string;
  status?: string;
}

interface QrSessionResponse {
  success?: boolean;
  message?: string;
  tableStatus?: string;
  canOrder?: boolean;
  data?: QrSessionData;
}

function QrTableContent() {
  const { isAdmin } = useAuthSession();
  const searchParams = useSearchParams();
  const initialTable = (searchParams.get('tableId') || 'B05').toUpperCase();
  const initialStatus = searchParams.get('status') || 'Occupied';

  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [qrState, setQrState] = useState<{
    key: string;
    data: QrSessionResponse | null;
  } | null>(null);

  const tableId = initialTable;
  const activeStatus = selectedStatus ?? initialStatus;
  const requestKey = `${tableId}|${activeStatus}`;
  const loading = qrState?.key !== requestKey;
  const qrData = qrState?.key === requestKey ? qrState.data : null;

  useEffect(() => {
    let isCancelled = false;

    fetch(
      `/api/qr?tableId=${encodeURIComponent(tableId)}&status=${encodeURIComponent(activeStatus)}`
    )
      .then((res) => res.json() as Promise<QrSessionResponse>)
      .then((data) => {
        if (!isCancelled) {
          setQrState({ key: requestKey, data });
        }
      })
      .catch((err) => {
        console.error('Lỗi tải thông tin QR bàn:', err);
        if (!isCancelled) {
          setQrState({ key: requestKey, data: null });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [tableId, activeStatus, requestKey]);

  const statusNormalized = (qrData?.tableStatus || activeStatus || 'Occupied').toLowerCase();
  const canOrder =
    typeof qrData?.canOrder === 'boolean'
      ? qrData.canOrder
      : statusNormalized === 'occupied' || statusNormalized === 'seated';
  const session = qrData?.data || {};

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-lg border border-gray-100 p-7 text-center">
        {/* Header thương hiệu */}
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
          SmaRes • Quét QR Tại Bàn
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Bàn {tableId}</h1>

        {/* Bộ chuyển đổi nhanh 3 trạng thái để test hoặc xem thử */}
        <div className="flex justify-center gap-2 mb-6">
          {['Available', 'Occupied', 'Cleaning'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                statusNormalized === st.toLowerCase()
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-10 text-sm text-gray-500">Đang kiểm tra trạng thái bàn...</div>
        ) : (
          <>
            {/* Huy hiệu trạng thái */}
            <div className="mb-5">
              {statusNormalized === 'occupied' && (
                <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  ● Occupied — Đang phục vụ (Có thể gọi món)
                </span>
              )}
              {statusNormalized === 'available' && (
                <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  ● Available — Bàn trống (Chưa kích hoạt)
                </span>
              )}
              {statusNormalized === 'cleaning' && (
                <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  ● Cleaning — Đang dọn dẹp (Tạm khóa gọi món)
                </span>
              )}
            </div>

            {/* Khung mã QR động khi bàn đang Occupied */}
            {statusNormalized === 'occupied' && session?.qrImageUrl && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-5">
                <Image
                  src={session.qrImageUrl}
                  alt={`Mã QR Bàn ${tableId}`}
                  width={160}
                  height={160}
                  unoptimized
                  className="w-40 h-40 mx-auto rounded-xl bg-white p-2 border border-gray-200"
                />
                <p className="mt-3 text-[11px] text-gray-500 font-semibold uppercase">
                  Token phiên hiện tại
                </p>
                <p className="text-xs font-mono font-bold text-emerald-800 break-all mt-0.5">
                  {session.token}
                </p>
              </div>
            )}

            {/* Thông báo trạng thái */}
            <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-700 mb-6 border border-gray-100">
              {qrData?.message || 'Trạng thái bàn đã được cập nhật.'}
            </div>

            {/* Nút hành động phù hợp từng trạng thái */}
            {canOrder ? (
              <Link
                href={`/table-menu?table=${encodeURIComponent(tableId)}&token=${encodeURIComponent(session.token || '')}`}
                className="block w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition shadow-sm"
              >
                🍽️ Vào thực đơn gọi thêm món
              </Link>
            ) : statusNormalized === 'available' ? (
              !isAdmin ? (
                <Link
                  href={`/booking?tableId=${encodeURIComponent(tableId)}`}
                  className="block w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-sm"
                >
                  🪑 Đặt bàn / Nhận bàn {tableId}
                </Link>
              ) : (
                <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-xl py-3 px-4">
                  Bàn {tableId} đang trống. Tài khoản Quản trị viên (Admin) không sử dụng chức năng đặt bàn.
                </p>
              )
            ) : (
              <button
                type="button"
                onClick={() => setSelectedStatus('Occupied')}
                className="w-full py-3.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-bold text-sm transition cursor-pointer"
              >
                🔄 Kiểm tra lại khi bàn dọn xong
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function QrTablePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <QrTableContent />
    </Suspense>
  );
}
