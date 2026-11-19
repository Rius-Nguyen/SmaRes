'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function QrTableContent() {
  const searchParams = useSearchParams();
  const initialTable = (searchParams.get('tableId') || 'B05').toUpperCase();
  const initialStatus = searchParams.get('status') || 'Occupied';

  const [tableId, setTableId] = useState<string>(initialTable);
  const [tableStatus, setTableStatus] = useState<string>(initialStatus);
  const [qrData, setQrData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadQrSession = async (targetTable: string, targetStatus: string) => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/qr?tableId=${encodeURIComponent(targetTable)}&status=${encodeURIComponent(targetStatus)}`
      );
      const data = await res.json();
      setQrData(data);
    } catch (err) {
      console.error('Lỗi tải thông tin QR bàn:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTableId(initialTable);
    setTableStatus(initialStatus);
    loadQrSession(initialTable, initialStatus);
  }, [initialTable, initialStatus]);

  const statusNormalized = (qrData?.tableStatus || tableStatus || 'Occupied').toLowerCase();
  const canOrder = Boolean(qrData?.canOrder);
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
              onClick={() => {
                setTableStatus(st);
                loadQrSession(tableId, st);
              }}
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
                <img
                  src={session.qrImageUrl}
                  alt={`Mã QR Bàn ${tableId}`}
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
                href={`/menu?tableId=${tableId}&token=${session.token || ''}`}
                className="block w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition shadow-sm"
              >
                🍽️ Vào thực đơn gọi thêm món
              </Link>
            ) : statusNormalized === 'available' ? (
              <Link
                href={`/booking?tableId=${tableId}`}
                className="block w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-sm"
              >
                🪑 Đặt bàn / Nhận bàn {tableId}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => loadQrSession(tableId, 'Occupied')}
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